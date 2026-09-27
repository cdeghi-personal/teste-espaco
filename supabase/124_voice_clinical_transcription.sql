-- 124_voice_clinical_transcription.sql
-- Preenchimento por voz (transcrição + revisão automática por IA) nos campos
-- clínicos do ConsultationFormModal. Controlado por DUAS configurações
-- independentes — nenhuma delas é o papel "admin":
--   1) company_settings.voice_transcription_enabled — chave geral, admin only.
--   2) therapists.can_use_voice_transcription — permissão individual, admin only.
-- Um admin puro (sem registro de terapeuta) nunca tem acesso só por ser admin.
--
-- Risco desta migration é BAIXO comparado às 119-123: tudo aqui é aditivo
-- (duas colunas novas com default FALSE, uma trigger nova, uma RPC nova) —
-- nada existente depende delas ainda. Rollback trivial: não chamar a RPC/
-- Edge Function nova do frontend; as colunas ficam órfãs sem efeito colateral.

-- ─── 1. Colunas novas ──────────────────────────────────────────────────────

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS voice_transcription_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN company_settings.voice_transcription_enabled IS
  'Chave geral do recurso de preenchimento por voz (transcrição + revisão IA) '
  'nos campos clínicos do atendimento. Somente admin altera. Precisa estar '
  'ativa E o terapeuta precisa ter therapists.can_use_voice_transcription=true '
  'para o microfone aparecer — as duas condições são independentes.';

ALTER TABLE therapists ADD COLUMN IF NOT EXISTS can_use_voice_transcription BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN therapists.can_use_voice_transcription IS
  'Permissão individual do terapeuta para usar o microfone de preenchimento '
  'por voz nos campos clínicos. Somente admin altera (ver trigger '
  'fn_guard_therapist_voice_flag). Não habilita nada sozinha — depende também '
  'de company_settings.voice_transcription_enabled=true. Nunca concede acesso '
  'de edição além do que as regras existentes (canEditConsultation) já '
  'permitem — só habilita o microfone quando o usuário já pode editar.';

-- ─── 2. Trigger defensiva — nenhum terapeuta comum altera a própria permissão
-- Mesma classe de achado já corrigido nesta sessão (120_patients_admin_field_guard.sql):
-- a policy "therapists: terapeuta edita o próprio" (02_rls.sql) é
-- USING (user_id = auth.uid()) SEM restrição de coluna — um terapeuta já
-- consegue hoje alterar qualquer coluna da própria linha via update direto.
-- Diferente da 120 (que só guarda UMA direção porque "restaurar paciente"
-- tinha um caminho legítimo sem admin), aqui guardamos as DUAS direções —
-- não existe cenário em que um terapeuta comum deva poder ligar OU desligar
-- sozinho a própria permissão de voz.

CREATE OR REPLACE FUNCTION fn_guard_therapist_voice_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
BEGIN
  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  -- Sem JWT (acesso direto via SQL Editor/service role) passa direto —
  -- protege contra chamadas via API de um usuário autenticado sem
  -- privilégio, não contra acesso direto ao banco.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.can_use_voice_transcription IS DISTINCT FROM OLD.can_use_voice_transcription THEN
    NEW.can_use_voice_transcription := OLD.can_use_voice_transcription;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_therapist_voice_flag ON therapists;
CREATE TRIGGER trg_guard_therapist_voice_flag
  BEFORE UPDATE ON therapists
  FOR EACH ROW EXECUTE FUNCTION fn_guard_therapist_voice_flag();

-- ─── 3. RPC de autorização — usada pela Edge Function transcribe-clinical-audio
-- Replica fielmente a regra já existente em src/utils/consultationPermissions.js
-- (canEditConsultation: admin com status.admin_can_edit <> false, OU terapeuta
-- PRIMÁRIO — nunca participante secundário/equipe) + os gates específicos do
-- recurso de voz. Nunca expande acesso além do que já existe — só soma
-- condições. Erro sempre genérico: nunca diferencia "não existe" de "não é
-- seu" de "sem permissão", para não vazar informação sobre atendimentos de
-- outros terapeutas.

CREATE OR REPLACE FUNCTION can_use_voice_transcription_for_consultation(p_consultation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_role text;
  v_therapist_id uuid;
  v_can_use_voice boolean;
  v_global_enabled boolean;
  v_consultation RECORD;
  v_status RECORD;
  v_can_edit boolean;
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = v_uid;

  SELECT id, can_use_voice_transcription INTO v_therapist_id, v_can_use_voice
  FROM therapists WHERE user_id = v_uid;

  -- Sem registro de terapeuta (admin puro) OU sem a permissão individual:
  -- nunca autorizado, independente de admin_can_edit. É este check, sozinho,
  -- que garante que admin puro nunca ganha acesso só por ser admin.
  IF v_therapist_id IS NULL OR v_can_use_voice IS NOT TRUE THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT voice_transcription_enabled INTO v_global_enabled FROM company_settings WHERE id = 1;
  IF v_global_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT id, therapist_id, consultation_status_id, event_type
    INTO v_consultation
    FROM consultations
   WHERE id = p_consultation_id;

  IF v_consultation.id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT admin_can_edit, shows_observation
    INTO v_status
    FROM consultation_statuses
   WHERE id = v_consultation.consultation_status_id;

  IF v_role = 'admin' THEN
    v_can_edit := COALESCE(v_status.admin_can_edit, true) IS NOT FALSE;
  ELSE
    v_can_edit := v_consultation.therapist_id = v_therapist_id;
  END IF;

  IF NOT v_can_edit THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  IF v_consultation.event_type <> 'SESSION' THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  IF COALESCE(v_status.shows_observation, false) THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION can_use_voice_transcription_for_consultation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION can_use_voice_transcription_for_consultation(uuid) FROM anon;

-- ─── ATENÇÃO PRODUÇÃO (sem ambiente de homologação separado) ───────────────
-- Depois de aplicar, testar manualmente:
--   1. SELECT can_use_voice_transcription_for_consultation('<id-de-teste>');
--      como admin puro (sem therapists row) → { allowed: false }.
--   2. Marcar um terapeuta com can_use_voice_transcription=true e a config
--      global ligada, chamar de novo com um atendimento SESSION dele →
--      { allowed: true }.
--   3. Confirmar que um terapeuta comum não consegue mais ligar a própria
--      flag via update direto em therapists (deve reverter silenciosamente).
