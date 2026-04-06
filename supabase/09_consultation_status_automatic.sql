-- ============================================================
-- Espaço Casa Amarela — Migração 09
-- Flag "automático" no Status de Atendimento
-- Rodar no Supabase SQL Editor
-- ============================================================

ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS automatic boolean NOT NULL DEFAULT false;
