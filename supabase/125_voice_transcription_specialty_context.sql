-- 125_voice_transcription_specialty_context.sql
-- Acrescenta a especialidade do atendimento (label amigável, ex.: "Fisioterapia")
-- ao retorno de can_use_voice_transcription_for_consultation, pra dar contexto
-- de domínio ao modelo de transcrição/revisão do preenchimento por voz — ajuda
-- a não "corrigir" um termo técnico válido da área pra outra coisa. Nunca
-- influencia o CONTEÚDO ditado, só o vocabulário/enquadramento do modelo.
--
-- Escopo deliberadamente mínimo (só especialidade). Nome do paciente e
-- conteúdo dos outros campos clínicos como contexto ficam para uma etapa
-- futura — avaliados e adiados de propósito (ver CLAUDE.md).
--
-- Mesma assinatura da migration 124 — CREATE OR REPLACE, corpo idêntico ao
-- original, só acrescentando a busca da especialidade e o campo novo no
-- retorno de sucesso.

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
  v_specialty_label text;
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

  IF v_therapist_id IS NULL OR v_can_use_voice IS NOT TRUE THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT voice_transcription_enabled INTO v_global_enabled FROM company_settings WHERE id = 1;
  IF v_global_enabled IS NOT TRUE THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'Não autorizado.');
  END IF;

  SELECT id, therapist_id, consultation_status_id, event_type, specialty
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

  SELECT label INTO v_specialty_label FROM specialties WHERE key = v_consultation.specialty;

  RETURN jsonb_build_object('allowed', true, 'specialty', COALESCE(v_specialty_label, v_consultation.specialty));
END;
$$;

GRANT EXECUTE ON FUNCTION can_use_voice_transcription_for_consultation(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION can_use_voice_transcription_for_consultation(uuid) FROM anon;
