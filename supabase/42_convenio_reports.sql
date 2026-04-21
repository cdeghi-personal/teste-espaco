-- 42_convenio_reports.sql
-- Histórico de geração de Relatórios de Convênio

CREATE TABLE IF NOT EXISTS convenio_reports (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id   UUID        REFERENCES therapists(id) ON DELETE SET NULL,
  specialty      TEXT        NOT NULL,
  mes_label      TEXT        NOT NULL,
  version_label  TEXT        NOT NULL,  -- ex: "v. 20/04/2026 14:35"
  form_data      JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT now(),
  created_by     UUID        REFERENCES auth.users(id)
);

ALTER TABLE convenio_reports ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo; usuário vê apenas os seus próprios
CREATE POLICY "convenio_reports_select" ON convenio_reports
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "convenio_reports_insert" ON convenio_reports
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "convenio_reports_delete" ON convenio_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR created_by = auth.uid()
  );

GRANT SELECT, INSERT, DELETE ON convenio_reports TO authenticated;