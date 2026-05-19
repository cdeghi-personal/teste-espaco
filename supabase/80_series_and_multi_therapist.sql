-- ============================================================
-- 80_series_and_multi_therapist.sql
-- Modelagem para recorrência de atendimentos e múltiplos
-- terapeutas por consulta.
--
-- Cria:
--   consultation_series        — série recorrente (metadados)
--   consultation_therapists    — participantes por consulta
-- Altera consultations:
--   series_id, series_original_date, is_series_exception
-- ============================================================

-- ── 1. Tabela consultation_series ───────────────────────────

CREATE TABLE IF NOT EXISTS consultation_series (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id            uuid REFERENCES patients(id),
  primary_therapist_id  uuid REFERENCES therapists(id),
  specialty             text,
  appointment_type_id   uuid REFERENCES appointment_types(id),
  consultation_status_id uuid REFERENCES consultation_statuses(id),
  room_id               uuid REFERENCES rooms(id),
  time                  text,
  duration              integer,
  -- 'by_count' → termina após session_count ocorrências
  -- 'by_date'  → termina em end_date
  recurrence_type       text NOT NULL CHECK (recurrence_type IN ('by_count', 'by_date')),
  -- ISO weekdays: 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sáb 7=Dom
  recurrence_days       integer[] NOT NULL,
  start_date            date NOT NULL,
  end_date              date,
  session_count         integer,
  active                boolean DEFAULT true,
  notes                 text,
  created_by            uuid,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ── 2. Tabela consultation_therapists ───────────────────────

CREATE TABLE IF NOT EXISTS consultation_therapists (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  therapist_id    uuid NOT NULL REFERENCES therapists(id),
  specialty       text NOT NULL,
  is_primary      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (consultation_id, therapist_id)
);

-- ── 3. Novas colunas em consultations ──────────────────────

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS series_id             uuid REFERENCES consultation_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_original_date  date,
  ADD COLUMN IF NOT EXISTS is_series_exception   boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS consultations_series_id_idx
  ON consultations(series_id) WHERE series_id IS NOT NULL;

-- ── 4. RLS — consultation_series ───────────────────────────

ALTER TABLE consultation_series ENABLE ROW LEVEL SECURITY;

-- Admin vê e altera tudo
CREATE POLICY "series_admin_all" ON consultation_series
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Terapeuta: apenas consulta as séries onde é terapeuta principal
CREATE POLICY "series_therapist_select" ON consultation_series
  FOR SELECT TO authenticated
  USING (
    primary_therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
  );

-- ── 5. RLS — consultation_therapists ───────────────────────

ALTER TABLE consultation_therapists ENABLE ROW LEVEL SECURITY;

-- Admin vê e altera tudo
CREATE POLICY "ct_admin_all" ON consultation_therapists
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Terapeuta: SELECT nas participações onde é o terapeuta
-- OU nas consultas onde é o terapeuta principal
CREATE POLICY "ct_therapist_select" ON consultation_therapists
  FOR SELECT TO authenticated
  USING (
    therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
    OR
    consultation_id IN (
      SELECT id FROM consultations
      WHERE therapist_id IN (
        SELECT id FROM therapists WHERE user_id = auth.uid()
      )
    )
  );

-- Terapeuta: INSERT — pode adicionar participação em consultas onde é principal
CREATE POLICY "ct_therapist_insert" ON consultation_therapists
  FOR INSERT TO authenticated
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations
      WHERE therapist_id IN (
        SELECT id FROM therapists WHERE user_id = auth.uid()
      )
    )
  );

-- Terapeuta: DELETE — pode remover participações não-primárias próprias
CREATE POLICY "ct_therapist_delete" ON consultation_therapists
  FOR DELETE TO authenticated
  USING (
    is_primary = false
    AND therapist_id IN (
      SELECT id FROM therapists WHERE user_id = auth.uid()
    )
  );

-- ── 6. GRANTs ──────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON consultation_series    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON consultation_therapists TO authenticated;
