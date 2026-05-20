-- 82_fix_ct_team_select.sql
-- Amplia SELECT de consultation_therapists para terapeutas da equipe.
--
-- Problema: migração 80 definiu ct_therapist_select com duas condições:
--   1. therapist_id = próprio terapeuta
--   2. consultation_id onde ele é o terapeuta PRIMÁRIO
-- Isso significa que terapeutas da equipe vendo a consulta de um COLEGA
-- recebem consultation_therapists[] vazio — o chip 👥 não aparece.
--
-- A política de consultations (migração 20) já permite que terapeutas da equipe
-- vejam consultas de pacientes de equipe de colegas. Alinhamos consultation_therapists
-- à mesma regra.

DROP POLICY IF EXISTS "ct_therapist_select" ON consultation_therapists;

CREATE POLICY "ct_therapist_select" ON consultation_therapists
  FOR SELECT TO authenticated
  USING (
    -- Própria participação
    therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
    OR
    -- Consultas onde o usuário é o terapeuta PRIMÁRIO
    consultation_id IN (
      SELECT id FROM consultations
      WHERE therapist_id IN (
        SELECT id FROM therapists WHERE user_id = auth.uid()
      )
    )
    OR
    -- Terapeuta da equipe: vê todos os participantes de consultas de equipe
    -- (mesma regra de consultations: migração 20)
    (
      my_belongs_to_team()
      AND consultation_id IN (
        SELECT c.id
        FROM   consultations c
        JOIN   therapists    t ON t.id = c.therapist_id
        WHERE  t.belongs_to_team = true
          AND  patient_has_team_therapist(c.patient_id)
      )
    )
  );
