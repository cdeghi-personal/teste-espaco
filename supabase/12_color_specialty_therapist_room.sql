-- ============================================================
-- Espaço Casa Amarela — Migração 12
-- Adiciona coluna color (hex) em specialties, therapists e rooms
-- Rodar no Supabase SQL Editor
-- ============================================================

ALTER TABLE specialties
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS color text;
