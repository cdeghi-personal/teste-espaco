-- ============================================================
-- Espaço Casa Amarela — Migração 21
-- Políticas de escrita (INSERT/UPDATE/DELETE) para terapeutas
-- nas tabelas guardians e patient_guardians
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── GUARDIANS — INSERT ──────────────────────────────────────
-- Qualquer terapeuta autenticado pode criar um responsável
-- (no momento do INSERT não há vínculo de paciente ainda)
CREATE POLICY "guardians: terapeuta insere"
  ON guardians FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─── GUARDIANS — UPDATE/DELETE ───────────────────────────────
-- Terapeuta pode editar/desativar responsável se tiver acesso
-- a pelo menos um paciente vinculado
CREATE POLICY "guardians: terapeuta edita os seus"
  ON guardians FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM patient_guardians pg
      JOIN patients p ON p.id = pg.patient_id
      WHERE pg.guardian_id = guardians.id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

-- ─── PATIENT_GUARDIANS — INSERT/DELETE ───────────────────────
-- Terapeuta pode vincular/desvincular responsável a paciente
-- se tiver acesso a esse paciente
CREATE POLICY "patient_guardians: terapeuta gerencia os seus"
  ON patient_guardians FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_guardians.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_guardians.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );
