-- ============================================================
-- Espaço Casa Amarela — Migração 11
-- Adiciona horário e sala na tabela de consultas
-- Rodar no Supabase SQL Editor
-- ============================================================

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS time      time,
  ADD COLUMN IF NOT EXISTS room_id   uuid REFERENCES rooms(id) ON DELETE SET NULL;
