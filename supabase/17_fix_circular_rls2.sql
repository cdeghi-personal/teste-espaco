-- ============================================================
-- Espaço Casa Amarela — Migração 17
-- Corrige recursão circular criada no migration 16
-- patient_involved_therapists não pode referenciar patients no USING
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Remove a política problemática do migration 16 ──────────
DROP POLICY IF EXISTS "patient_involved_therapists: terapeuta gerencia os seus" ON patient_involved_therapists;

-- ─── Recria sem referenciar patients (evita recursão) ────────
-- SELECT: my_belongs_to_team() já não referencia patients (usa só therapists)
-- INSERT/DELETE: permite se for da equipe OU se for o próprio terapeuta envolvido
--   (integridade garantida pela aplicação)
CREATE POLICY "patient_involved_therapists: terapeuta gerencia os seus"
  ON patient_involved_therapists FOR ALL
  USING (
    my_belongs_to_team()
    OR therapist_id = my_therapist_id()
  )
  WITH CHECK (
    my_belongs_to_team()
    OR therapist_id = my_therapist_id()
  );

-- Remove o SELECT-only anterior (já coberto pelo FOR ALL acima)
DROP POLICY IF EXISTS "patient_involved_therapists: terapeuta lê os seus" ON patient_involved_therapists;
