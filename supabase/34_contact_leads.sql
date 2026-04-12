-- ============================================================
-- 34_contact_leads.sql
-- Tabela de leads / contatos do site público
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_leads (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  specialty        TEXT,
  how_found        TEXT,
  message          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'novo',
  internal_note    TEXT,
  assigned_to      TEXT,
  last_contact_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- status válidos: novo | em_contato | agendado | convertido | sem_interesse

CREATE INDEX IF NOT EXISTS contact_leads_status_idx     ON contact_leads(status);
CREATE INDEX IF NOT EXISTS contact_leads_created_at_idx ON contact_leads(created_at DESC);

-- RLS
ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (inclusive anônimo) pode inserir — formulário público
CREATE POLICY "contact_leads: insert público"
  ON contact_leads FOR INSERT
  WITH CHECK (true);

-- Apenas admin pode ler e atualizar
CREATE POLICY "contact_leads: admin lê"
  ON contact_leads FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "contact_leads: admin atualiza"
  ON contact_leads FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Permite INSERT anônimo (anon key do site público)
GRANT INSERT ON TABLE public.contact_leads TO anon;
GRANT SELECT, UPDATE ON TABLE public.contact_leads TO authenticated;
