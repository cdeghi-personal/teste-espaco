-- ============================================================
-- Espaço Casa Amarela — Migração 19
-- Terapeuta da equipe vê atendimentos de pacientes da equipe
-- Rodar no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "consultations: terapeuta vê as suas" ON consultations;
DROP POLICY IF EXISTS "consultations: terapeuta gerencia as suas" ON consultations;

-- SELECT: próprias + pacientes da equipe (se belongs_to_team)
CREATE POLICY "consultations: terapeuta vê as suas"
  ON consultations FOR SELECT
  USING (
    therapist_id = my_therapist_id()
    OR (my_belongs_to_team() AND patient_has_team_therapist(patient_id))
  );

-- INSERT/UPDATE/DELETE: apenas as próprias
CREATE POLICY "consultations: terapeuta gerencia as suas"
  ON consultations FOR ALL
  USING (therapist_id = my_therapist_id());

-- Atividades seguem a mesma regra de leitura da consulta pai
DROP POLICY IF EXISTS "consultation_activities: terapeuta gerencia as suas" ON consultation_activities;
CREATE POLICY "consultation_activities: terapeuta gerencia as suas"
  ON consultation_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_activities.consultation_id
        AND (
          c.therapist_id = my_therapist_id()
          OR (my_belongs_to_team() AND patient_has_team_therapist(c.patient_id))
        )
    )
  );
