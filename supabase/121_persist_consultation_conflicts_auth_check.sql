-- 121_persist_consultation_conflicts_auth_check.sql
-- Vuln (revisão de segurança): persist_consultation_conflicts (migration 85,
-- recriada na 88) é SECURITY DEFINER e apaga/recria TODOS os registros de
-- consultation_conflicts de um p_consultation_id qualquer, sem checar se
-- quem está chamando tem qualquer relação com esse atendimento. Qualquer
-- terapeuta autenticado podia apagar avisos reais de conflito de agenda de
-- um colega (mascarando um choque de horário) ou inserir conflitos falsos.
--
-- Fix: mesma checagem de visibilidade já usada na policy de SELECT
-- "conflicts_therapist_select" (migration 85) — admin, ou terapeuta
-- primário/participante do atendimento, ou terapeuta de equipe quando o
-- atendimento também é de um terapeuta de equipe. Único uso legítimo hoje é
-- `persistConflicts()` (DataContext.jsx), chamado sempre logo após o próprio
-- usuário criar/editar SEU PRÓPRIO atendimento — então essa checagem nunca
-- deve bloquear o fluxo normal. A chamada já é tratada com try/catch no
-- frontend (nunca trava o salvamento do atendimento em si), então um erro
-- aqui é seguro — só impede a escrita indevida, sem quebrar nada visível.

CREATE OR REPLACE FUNCTION persist_consultation_conflicts(p_consultation_id uuid, p_conflicts jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid;
  v_authorized boolean;
BEGIN
  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autorizado.';
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin')
    OR p_consultation_id IN (
      SELECT id FROM consultations
      WHERE therapist_id IN (SELECT id FROM therapists WHERE user_id = v_uid)
    )
    OR (
      EXISTS (SELECT 1 FROM therapists WHERE user_id = v_uid AND belongs_to_team = true)
      AND p_consultation_id IN (
        SELECT c.id FROM consultations c
        JOIN therapists t ON t.id = c.therapist_id
        WHERE t.belongs_to_team = true
      )
    )
    OR p_consultation_id IN (
      SELECT consultation_id FROM consultation_therapists
      WHERE therapist_id IN (SELECT id FROM therapists WHERE user_id = v_uid)
    )
  INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Não autorizado a alterar conflitos deste atendimento.';
  END IF;

  DELETE FROM consultation_conflicts WHERE consultation_id = p_consultation_id;
  IF p_conflicts IS NOT NULL AND jsonb_array_length(p_conflicts) > 0 THEN
    INSERT INTO consultation_conflicts (
      consultation_id, conflict_type, related_consultation_id,
      therapist_id, room_id, calendar_block_id,
      conflict_date, start_time, end_time, description
    )
    SELECT
      p_consultation_id,
      elem->>'conflict_type',
      NULLIF(elem->>'related_consultation_id', '')::uuid,
      NULLIF(elem->>'therapist_id', '')::uuid,
      NULLIF(elem->>'room_id', '')::uuid,
      NULLIF(elem->>'calendar_block_id', '')::uuid,
      (elem->>'conflict_date')::date,
      elem->>'start_time',
      elem->>'end_time',
      elem->>'description'
    FROM jsonb_array_elements(p_conflicts) AS elem;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION persist_consultation_conflicts TO authenticated;
