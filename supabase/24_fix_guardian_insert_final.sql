-- ============================================================
-- Espaço Casa Amarela — Migração 24
-- Corrige INSERT em guardians com WITH CHECK (true)
-- Guardians não têm campo de "dono" — qualquer usuário
-- autenticado pode criar (Supabase já bloqueia anônimos)
-- Rodar no Supabase SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "guardians: terapeuta insere" ON guardians;

CREATE POLICY "guardians: terapeuta insere"
  ON guardians FOR INSERT
  WITH CHECK (true);
