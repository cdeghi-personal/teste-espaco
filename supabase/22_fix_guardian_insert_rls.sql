-- ============================================================
-- Espaço Casa Amarela — Migração 22
-- 1. Adiciona colunas de endereço/contato extras em guardians
-- 2. Corrige política de INSERT (usa my_therapist_id em vez de auth.role)
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── NOVAS COLUNAS ───────────────────────────────────────────
ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS rg       text,
  ADD COLUMN IF NOT EXISTS phone2   text,
  ADD COLUMN IF NOT EXISTS address  text,
  ADD COLUMN IF NOT EXISTS city     text,
  ADD COLUMN IF NOT EXISTS state    text,
  ADD COLUMN IF NOT EXISTS cep      text;

-- ─── CORRIGE INSERT RLS ──────────────────────────────────────
DROP POLICY IF EXISTS "guardians: terapeuta insere" ON guardians;

CREATE POLICY "guardians: terapeuta insere"
  ON guardians FOR INSERT
  WITH CHECK (my_therapist_id() IS NOT NULL);
