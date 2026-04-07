-- ============================================================
-- Espaço Casa Amarela — Migração 13
-- Corrige recursão circular nas policies de patient_involved_therapists
-- Rodar no Supabase SQL Editor
-- ============================================================

-- A policy anterior fazia subquery em patients, que por sua vez
-- fazia subquery em patient_involved_therapists → recursão infinita → 500.

DROP POLICY IF EXISTS "patient_involved_therapists: terapeuta lê os seus" ON patient_involved_therapists;

-- Versão simples sem referência circular: terapeuta só vê as suas próprias linhas
CREATE POLICY "patient_involved_therapists: terapeuta lê os seus"
  ON patient_involved_therapists FOR SELECT
  USING (therapist_id = my_therapist_id());
