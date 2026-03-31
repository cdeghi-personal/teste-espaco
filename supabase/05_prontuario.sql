-- ============================================================
-- Espaço Casa Amarela — Prontuário Clínico
-- Rodar após 04_fix_trigger.sql
-- ============================================================

-- ─── Contexto familiar e escolar (1:1 com paciente) ─────────────────────────
CREATE TABLE patient_family_context (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          uuid NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  family_composition  text,          -- composição familiar
  guardian_relationship text,        -- relação com os responsáveis
  daily_routine       text,          -- rotina da criança
  school_context      text,          -- contexto escolar
  family_environment  text,          -- informações do ambiente familiar
  updated_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── Histórico clínico (1:1 com paciente) ────────────────────────────────────
CREATE TABLE patient_clinical_history (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id                uuid NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  main_complaint            text,   -- queixa principal
  diagnostic_hypotheses     text,   -- hipóteses diagnósticas
  current_medications       text,   -- medicamentos em uso
  medical_history           text,   -- histórico médico relevante
  previous_therapy_history  text,   -- histórico terapêutico anterior
  comorbidities             text,   -- comorbidades
  updated_by                uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ─── Avaliações iniciais por especialidade (N por paciente) ──────────────────
CREATE TABLE patient_assessments (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id          uuid REFERENCES therapists(id) ON DELETE SET NULL,
  specialty             text NOT NULL,
  assessment_date       date NOT NULL DEFAULT CURRENT_DATE,
  main_complaint        text,   -- queixa principal na visão desta especialidade
  initial_objectives    text,   -- objetivos iniciais
  applied_tests         text,   -- escalas e testes aplicados
  clinical_observations text,   -- observações clínicas iniciais
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, specialty)  -- uma avaliação por especialidade por paciente
);

-- ─── Plano terapêutico por especialidade (N por paciente) ────────────────────
CREATE TABLE therapeutic_plans (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id              uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  specialty               text NOT NULL,
  general_objectives      text,   -- objetivos gerais
  specific_objectives     text,   -- objetivos específicos
  attendance_frequency    text,   -- frequência de atendimento (ex: "2x por semana")
  intervention_strategy   text,   -- estratégia de intervenção
  revision_notes          text,   -- revisões de plano / mudanças de estratégia
  created_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, specialty)  -- um plano por especialidade por paciente
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
CREATE INDEX ON patient_assessments (patient_id);
CREATE INDEX ON therapeutic_plans (patient_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE patient_family_context    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_clinical_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapeutic_plans         ENABLE ROW LEVEL SECURITY;

-- Contexto familiar: admin gerencia, terapeuta lê/edita dos seus pacientes
CREATE POLICY "family_context: admin" ON patient_family_context FOR ALL USING (is_admin());
CREATE POLICY "family_context: terapeuta lê" ON patient_family_context FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_family_context.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));
CREATE POLICY "family_context: terapeuta edita" ON patient_family_context FOR ALL
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_family_context.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));

-- Histórico clínico: mesma regra
CREATE POLICY "clinical_history: admin" ON patient_clinical_history FOR ALL USING (is_admin());
CREATE POLICY "clinical_history: terapeuta lê" ON patient_clinical_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_clinical_history.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));
CREATE POLICY "clinical_history: terapeuta edita" ON patient_clinical_history FOR ALL
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_clinical_history.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));

-- Avaliações: admin gerencia tudo; terapeuta gerencia só as suas
CREATE POLICY "assessments: admin" ON patient_assessments FOR ALL USING (is_admin());
CREATE POLICY "assessments: terapeuta lê dos seus pacientes" ON patient_assessments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = patient_assessments.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));
CREATE POLICY "assessments: terapeuta edita a sua especialidade" ON patient_assessments FOR ALL
  USING (therapist_id = my_therapist_id());

-- Plano terapêutico: admin gerencia tudo; terapeuta edita só sua especialidade
CREATE POLICY "plans: admin" ON therapeutic_plans FOR ALL USING (is_admin());
CREATE POLICY "plans: terapeuta lê dos seus pacientes" ON therapeutic_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients p WHERE p.id = therapeutic_plans.patient_id AND p.deleted = false
    AND (p.primary_therapist_id = my_therapist_id()
      OR EXISTS (SELECT 1 FROM patient_secondary_therapists pst WHERE pst.patient_id = p.id AND pst.therapist_id = my_therapist_id()))
  ));
CREATE POLICY "plans: terapeuta edita a sua especialidade" ON therapeutic_plans FOR ALL
  USING (created_by = auth.uid() OR updated_by = auth.uid() OR EXISTS (
    SELECT 1 FROM therapists t WHERE t.user_id = auth.uid() AND t.specialty = therapeutic_plans.specialty
  ));
