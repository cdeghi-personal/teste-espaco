-- 83_fix_series_therapist_write.sql
-- Corrige RLS de consultation_series para permitir que terapeutas
-- criem e atualizem as próprias séries.
--
-- Problema: migração 80 só criou SELECT para terapeutas em consultation_series.
-- INSERT/UPDATE eram admin-only, bloqueando terapeutas ao criar série recorrente.

-- Terapeuta pode inserir série onde ele é o terapeuta principal
CREATE POLICY "series_therapist_insert" ON consultation_series
  FOR INSERT TO authenticated
  WITH CHECK (
    primary_therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
  );

-- Terapeuta pode atualizar a própria série
CREATE POLICY "series_therapist_update" ON consultation_series
  FOR UPDATE TO authenticated
  USING (
    primary_therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    primary_therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
  );
