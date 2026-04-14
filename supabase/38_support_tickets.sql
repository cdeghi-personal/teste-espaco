-- Tabela de tickets de suporte (admin only)
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('erro','duvida','melhoria')),
  author      TEXT NOT NULL,
  description TEXT NOT NULL,
  solution    TEXT,
  status      TEXT NOT NULL DEFAULT 'novo'
                CHECK (status IN ('novo','em_analise','em_desenvolvimento','resolvido','fechado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de mudanças de status
CREATE TABLE IF NOT EXISTS support_ticket_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by TEXT NOT NULL
);

-- RLS: somente admin
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_tickets_admin" ON support_tickets
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "support_history_admin" ON support_ticket_history
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT ALL ON support_tickets TO authenticated;
GRANT ALL ON support_ticket_history TO authenticated;
