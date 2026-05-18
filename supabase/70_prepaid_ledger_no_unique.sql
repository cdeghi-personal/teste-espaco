-- 70_prepaid_ledger_no_unique.sql
-- Garante que não existe nenhuma constraint UNIQUE em consultation_id na tabela
-- patient_prepaid_ledger. O ledger é append-only: uma mesma consulta pode ter
-- múltiplas linhas (DEBIT, REVERSAL, DEBIT novamente). consultation_id é apenas
-- FK de rastreabilidade, nunca chave única.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.patient_prepaid_ledger'::regclass
      AND contype = 'u'
      AND conname ILIKE '%consultation%'
  LOOP
    EXECUTE format('ALTER TABLE public.patient_prepaid_ledger DROP CONSTRAINT %I', r.conname);
    RAISE NOTICE 'Dropped unique constraint: %', r.conname;
  END LOOP;
END $$;

-- Confirma que o índice normal (não único) existe
CREATE INDEX IF NOT EXISTS idx_prepaid_ledger_consultation
  ON public.patient_prepaid_ledger(consultation_id);
