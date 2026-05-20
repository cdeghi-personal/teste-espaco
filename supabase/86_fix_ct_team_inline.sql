-- 86_fix_ct_team_inline.sql
-- Corrige a policy ct_therapist_select criada em 82_fix_ct_team_select.sql.
--
-- Problema: migration 82 usou my_belongs_to_team() e patient_has_team_therapist()
-- que não existem no banco → RLS falha em execução → query de consultations retorna erro.
--
-- Solução: substituir pelas subqueries inline equivalentes.

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
    (
      EXISTS (
        SELECT 1 FROM therapists
        WHERE user_id = auth.uid() AND belongs_to_team = true
      )
      AND consultation_id IN (
        SELECT c.id
        FROM   consultations c
        JOIN   therapists    t ON t.id = c.therapist_id
        WHERE  t.belongs_to_team = true
      )
    )
  );
