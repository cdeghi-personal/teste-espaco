-- ============================================================
-- Espaço Casa Amarela — Migração 20
-- Terapeuta da equipe vê apenas consultas de terapeutas da equipe
-- (não vê consultas de terapeutas fora da equipe)
-- Rodar no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "consultations: terapeuta vê as suas" ON consultations;

CREATE POLICY "consultations: terapeuta vê as suas"
  ON consultations FOR SELECT
  USING (
    therapist_id = my_therapist_id()
    OR (
      my_belongs_to_team()
      AND patient_has_team_therapist(patient_id)
      AND EXISTS (
        SELECT 1 FROM therapists t
        WHERE t.id = consultations.therapist_id
          AND t.belongs_to_team = true
      )
    )
  );

-- Atividades seguem a mesma regra
DROP POLICY IF EXISTS "consultation_activities: terapeuta gerencia as suas" ON consultation_activities;
CREATE POLICY "consultation_activities: terapeuta gerencia as suas"
  ON consultation_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_activities.consultation_id
        AND (
          c.therapist_id = my_therapist_id()
          OR (
            my_belongs_to_team()
            AND patient_has_team_therapist(c.patient_id)
            AND EXISTS (
              SELECT 1 FROM therapists t
              WHERE t.id = c.therapist_id AND t.belongs_to_team = true
            )
          )
        )
    )
  );
