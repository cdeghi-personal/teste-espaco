-- 84_therapist_unavailabilities.sql
-- Janelas de indisponibilidade dos terapeutas para detecção de conflitos de agenda.

CREATE TABLE IF NOT EXISTS therapist_unavailabilities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id     uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  unavailable_type text NOT NULL CHECK (unavailable_type IN ('TOTAL', 'PARTIAL')),
  reason           text,
  start_date       date NOT NULL,
  end_date         date,
  start_time       text,   -- HH:MM, obrigatório se PARTIAL
  end_time         text,   -- HH:MM, obrigatório se PARTIAL
  weekdays         integer[], -- ISO: 1=Seg…7=Dom; null = todos os dias do intervalo
  active           boolean DEFAULT true,
  created_by       uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unavail_therapist ON therapist_unavailabilities(therapist_id);
CREATE INDEX IF NOT EXISTS idx_unavail_dates     ON therapist_unavailabilities(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_unavail_active    ON therapist_unavailabilities(active);

ALTER TABLE therapist_unavailabilities ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
CREATE POLICY "unavail_admin_all" ON therapist_unavailabilities
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Próprio terapeuta: SELECT
CREATE POLICY "unavail_own_select" ON therapist_unavailabilities
  FOR SELECT TO authenticated
  USING (therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid()));

-- Terapeuta da equipe: vê colegas de equipe (para detecção de conflitos)
CREATE POLICY "unavail_team_select" ON therapist_unavailabilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid() AND belongs_to_team = true)
    AND therapist_id IN (SELECT id FROM therapists WHERE belongs_to_team = true AND active = true)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON therapist_unavailabilities TO authenticated;
