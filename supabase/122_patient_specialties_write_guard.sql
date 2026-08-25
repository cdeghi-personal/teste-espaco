-- 122_patient_specialties_write_guard.sql
-- Vuln (revisão de segurança): a policy "patient_specialties: terapeuta
-- gerencia os seus" (migration 18) é FOR ALL — libera INSERT/UPDATE/DELETE
-- pra qualquer terapeuta primário, envolvido OU de equipe do paciente. Isso
-- inclui os campos financeiros (patient_value, therapist_value, payment_type,
-- monthly_patient_value, monthly_therapist_value — migrations 37/64), que a
-- própria UI só libera pra edição de admin ou do "Gerente do Caso"
-- (PatientFormModal.jsx `canSeePricing = isAdmin || isGerente`, onde
-- isGerente = primary_therapist_id). Um terapeuta "envolvido" ou "de equipe"
-- (não o gerente) conseguia escrever qualquer valor financeiro direto pelo
-- cliente Supabase, contornando a tela.
--
-- Ressalva importante descoberta ao investigar (por isso a correção não é só
-- "bloquear não-admin/não-gerente"): a tela permite que QUALQUER terapeuta
-- com acesso de edição ao paciente ADICIONE uma nova especialidade (sem
-- valores — sempre em branco/padrão) via um botão "Adicionar" separado, fora
-- do bloco de edição de preços. Isso já é uma função hoje usada por
-- terapeutas comuns, e o salvamento do formulário reenvia a lista INTEIRA de
-- especialidades (apaga tudo e reinsere) — não dá pra distinguir "só
-- adicionando uma especialidade em branco" de "alterando um valor" olhando
-- só a policy de escrita da tabela, porque o INSERT que seguiria uma
-- restrição mais simples quebraria essa função legítima.
--
-- Fix (duas partes):
-- 1) A escrita direta na tabela (INSERT/UPDATE/DELETE) passa a exigir admin
--    ou o Gerente do Caso (primary_therapist_id) — SELECT continua igual
--    (mesma visibilidade de sempre: primário, envolvido ou equipe).
-- 2) Nova RPC add_patient_specialty_key: única forma de um terapeuta
--    envolvido/de equipe (sem ser o gerente) adicionar uma especialidade —
--    sempre com valores financeiros em branco/padrão, nunca sobrescreve uma
--    linha existente. O frontend (PatientFormModal.jsx) passa a chamar essa
--    RPC pra cada especialidade nova quando quem salva não é admin/gerente,
--    em vez de reenviar a lista inteira.

-- ─── 1. RLS: separa leitura (ampla) de escrita (restrita) ────────────────────

DROP POLICY IF EXISTS "patient_specialties: terapeuta gerencia os seus" ON patient_specialties;

CREATE POLICY "patient_specialties: terapeuta lê os seus"
  ON patient_specialties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

CREATE POLICY "patient_specialties: gerente do caso escreve"
  ON patient_specialties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

-- Nota: a policy "patient_specialties: admin" (migration 02, is_admin())
-- já cobre o admin separadamente — não precisa ser recriada aqui.

-- ─── 2. RPC estreita: adicionar especialidade em branco ──────────────────────

CREATE OR REPLACE FUNCTION add_patient_specialty_key(p_patient_id uuid, p_specialty text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_visible boolean;
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Não autorizado.');
  END IF;

  IF p_specialty IS NULL OR btrim(p_specialty) = '' THEN
    RETURN jsonb_build_object('error', 'Especialidade inválida.');
  END IF;

  -- Mesma visibilidade da policy de SELECT (migration 18): admin, primário,
  -- envolvido ou equipe. Reaproveita patient_has_team_therapist() (não depende
  -- de auth.uid(), só de p_patient_id) mas NÃO chama my_therapist_id()/
  -- my_belongs_to_team() (dependem de auth.uid() diretamente) — dentro desta
  -- SECURITY DEFINER usamos v_uid, extraído via JWT claims (mesmo motivo
  -- histórico do projeto pra não confiar em auth.uid() aqui, ver migration 97).
  SELECT
    EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = p_patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id IN (SELECT id FROM therapists WHERE user_id = v_uid)
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id IN (SELECT id FROM therapists WHERE user_id = v_uid)
          )
          OR (
            EXISTS (SELECT 1 FROM therapists WHERE user_id = v_uid AND belongs_to_team = true)
            AND patient_has_team_therapist(p.id)
          )
        )
    )
  INTO v_visible;

  IF NOT v_visible THEN
    RETURN jsonb_build_object('error', 'Você não tem acesso a este paciente.');
  END IF;

  IF EXISTS (SELECT 1 FROM patient_specialties WHERE patient_id = p_patient_id AND specialty = p_specialty) THEN
    RETURN jsonb_build_object('error', 'O paciente já possui essa especialidade.');
  END IF;

  INSERT INTO patient_specialties (patient_id, specialty, payment_type)
  VALUES (p_patient_id, p_specialty, 'POST_PER_SESSION');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION add_patient_specialty_key(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION add_patient_specialty_key(uuid, text) FROM anon;
