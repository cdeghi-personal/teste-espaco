-- 43_company_settings.sql
-- Cadastro da empresa (Razão Social + CNPJ) — linha única

CREATE TABLE IF NOT EXISTS company_settings (
  id          INT         PRIMARY KEY DEFAULT 1,
  razao_social TEXT,
  cnpj         TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT only_one_row CHECK (id = 1)
);

-- Garante que a linha existe desde o início
INSERT INTO company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Todos os autenticados podem ler
CREATE POLICY "company_settings_select" ON company_settings
  FOR SELECT TO authenticated USING (true);

-- Apenas admin pode alterar
CREATE POLICY "company_settings_update" ON company_settings
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, UPDATE ON company_settings TO authenticated;