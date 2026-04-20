-- 41_age_ranges.sql
-- Tabela de faixas etárias — admin cria/edita, todos os autenticados consultam

CREATE TABLE IF NOT EXISTS age_ranges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  min_age     INTEGER     NOT NULL,
  max_age     INTEGER     NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#3b82f6',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE age_ranges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "age_ranges_select" ON age_ranges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "age_ranges_insert" ON age_ranges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "age_ranges_update" ON age_ranges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "age_ranges_delete" ON age_ranges
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON age_ranges TO authenticated;