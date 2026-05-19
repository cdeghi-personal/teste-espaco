-- 79_payment_invoices.sql
-- Tabela de faturas/notas fiscais geradas a partir de Demonstrativos de Pagamento.
-- RLS: apenas admin. nf_number é único (quando preenchido).

CREATE TABLE IF NOT EXISTS payment_invoices (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_number                TEXT,
  patient_id               UUID REFERENCES patients(id),
  nf_issue_date            DATE,
  status                   TEXT NOT NULL DEFAULT 'ISSUED'
                             CHECK (status IN ('ISSUED', 'PAID', 'CANCELLED')),
  total_amount             NUMERIC(10,2),
  payment_demonstrative_id UUID REFERENCES payment_demonstratives(id),
  consultation_ids         UUID[],
  snapshot                 JSONB,
  created_by               UUID REFERENCES auth.users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at             TIMESTAMPTZ,
  cancelled_by             UUID REFERENCES auth.users(id),
  paid_at                  TIMESTAMPTZ,
  paid_by                  UUID REFERENCES auth.users(id)
);

-- nf_number deve ser único quando preenchido (NULLs são permitidos múltiplos)
CREATE UNIQUE INDEX IF NOT EXISTS payment_invoices_nf_number_unique
  ON payment_invoices(nf_number)
  WHERE nf_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_invoices_patient_idx    ON payment_invoices(patient_id);
CREATE INDEX IF NOT EXISTS payment_invoices_status_idx     ON payment_invoices(status);
CREATE INDEX IF NOT EXISTS payment_invoices_created_at_idx ON payment_invoices(created_at DESC);

ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_invoices: admin only"
  ON payment_invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE ON payment_invoices TO authenticated;
