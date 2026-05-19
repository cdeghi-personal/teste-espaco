-- 76_payment_demonstratives.sql
-- Histórico de demonstrativos de pagamento definitivos (com NF) emitidos.
-- Registra quais consultas foram faturadas, dados do período e NF.
-- Acesso restrito a admin (dados financeiros).

CREATE TABLE IF NOT EXISTS payment_demonstratives (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID        NOT NULL REFERENCES patients(id),
  period_start     DATE        NOT NULL,
  period_end       DATE        NOT NULL,
  mes_label        TEXT        NOT NULL,
  nf_number        TEXT,
  nf_date          DATE,
  consultation_ids UUID[]      NOT NULL DEFAULT '{}',
  form_data        JSONB,
  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_demonstratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_demonstratives: admin acessa todos"
  ON payment_demonstratives FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_demonstratives TO authenticated;
