-- ============================================================
-- Espaço Casa Amarela — Migração 23
-- Corrige INSERT em guardians usando auth.uid() IS NOT NULL
-- (qualquer usuário autenticado pode criar responsável)
-- Rodar no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "guardians: terapeuta insere" ON guardians;

CREATE POLICY "guardians: terapeuta insere"
  ON guardians FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
