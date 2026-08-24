-- 113_consultations_replacement.sql
-- Vínculo de Reposição de Atendimentos: decisão no atendimento original +
-- referência ao original no atendimento de reposição (permite cadeia).
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS will_have_replacement boolean NULL,
  ADD COLUMN IF NOT EXISTS replacement_for_consultation_id uuid NULL REFERENCES consultations(id) ON DELETE SET NULL;

COMMENT ON COLUMN consultations.will_have_replacement IS
  'NULL = decisão não aplicável (status não solicita) ou registro legado. FALSE = definido que não haverá reposição. TRUE = definido que haverá.';
COMMENT ON COLUMN consultations.replacement_for_consultation_id IS
  'Preenchido somente no atendimento de reposição, apontando para o atendimento (falta/cancelamento) que a originou. NULL no atendimento original. Permite cadeia (reposição de reposição).';

ALTER TABLE consultations
  DROP CONSTRAINT IF EXISTS consultations_replacement_not_self;
ALTER TABLE consultations
  ADD CONSTRAINT consultations_replacement_not_self
  CHECK (replacement_for_consultation_id IS NULL OR replacement_for_consultation_id <> id);

-- No máximo 1 reposição direta por atendimento original (cadeias continuam permitidas:
-- original -> repl1 -> repl2, cada um aponta para um valor diferente)
CREATE UNIQUE INDEX IF NOT EXISTS consultations_replacement_for_unique
  ON consultations (replacement_for_consultation_id)
  WHERE replacement_for_consultation_id IS NOT NULL;
