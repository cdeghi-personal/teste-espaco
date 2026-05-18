-- Etapa 4 (refinamento): enriquecer ledger + flag prepaid_session_consumed

-- 1. Enriquecer patient_prepaid_ledger
ALTER TABLE patient_prepaid_ledger
  ADD COLUMN IF NOT EXISTS operation text,
  ADD COLUMN IF NOT EXISTS created_by_name text;

-- operation: PACKAGE_PURCHASE | CONSULTATION_ADD | CONSULTATION_UPDATE | MANUAL_ADJUSTMENT | AUTO_REVERSAL

-- 2. Flag de integridade em consultations
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS prepaid_session_consumed boolean NOT NULL DEFAULT false;

-- 3. Backfill: marcar consultas que já têm DEBIT no ledger
UPDATE consultations c
SET prepaid_session_consumed = true
WHERE EXISTS (
  SELECT 1 FROM patient_prepaid_ledger l
  WHERE l.consultation_id = c.id
    AND l.entry_type = 'DEBIT'
);
