-- Migration 93: Adiciona flag is_financial_responsible em guardians
-- Responsável financeiro: CPF obrigatório apenas quando marcado como tal

ALTER TABLE guardians
  ADD COLUMN IF NOT EXISTS is_financial_responsible boolean DEFAULT false;

COMMENT ON COLUMN guardians.is_financial_responsible IS
  'Indica que este responsável é o responsável financeiro — CPF obrigatório quando true';
