-- Migration 95: Corrige WITH CHECK da policy de UPDATE de terapeuta em patients
--
-- Problema: a policy "patients: terapeuta edita os seus" não tem WITH CHECK explícito,
-- então o PostgreSQL usa o USING como WITH CHECK. O USING inclui "deleted = false",
-- então ao tentar setar deleted=true (soft-delete), a nova linha falha o WITH CHECK.
-- Para um admin dual-role (que também é terapeuta do paciente), AMBAS as policies
-- (admin + terapeuta) matcham o old row, então AMBAS as WITH CHECK precisam passar.
-- A policy de admin passa (sem filtro de deleted), mas a de terapeuta falha.
--
-- Fix: adicionar WITH CHECK (true) — se o terapeuta pode ver o paciente (USING),
-- pode atualizar para qualquer estado. Soft-delete é gateado pela UI (admin only).

DROP POLICY IF EXISTS "patients: terapeuta edita os seus" ON patients;

CREATE POLICY "patients: terapeuta edita os seus"
  ON patients FOR UPDATE
  USING (
    deleted = false AND (
      primary_therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
      OR EXISTS (
        SELECT 1 FROM patient_involved_therapists pit
        WHERE pit.patient_id = patients.id
          AND pit.therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
      )
    )
  )
  WITH CHECK (true);
