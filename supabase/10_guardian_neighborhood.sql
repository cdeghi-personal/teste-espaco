-- ============================================================
-- Espaço Casa Amarela — Migração 10
-- Adiciona bairro na tabela de responsáveis
-- Rodar no Supabase SQL Editor
-- ============================================================

ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS neighborhood text;
