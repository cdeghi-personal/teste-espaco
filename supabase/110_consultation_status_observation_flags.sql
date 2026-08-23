-- 110_consultation_status_observation_flags.sql
-- Substitui a flag única "requires_objective_note" (migration 71) por duas flags
-- distintas: shows_observation (exibição) e requires_observation (obrigatoriedade).
--
-- Abordagem: RENOMEAR a coluna existente em vez de criar+migrar dados. Todo registro
-- com requires_objective_note=true já tinha exatamente a semântica "oculta campos
-- clínicos, mostra somente Observação do Atendimento" — o rename preserva esses
-- valores exatamente, sem UPDATE/backfill sujeito a erro. Os demais registros
-- (requires_objective_note=false) ficam com shows_observation=false, como esperado.
ALTER TABLE consultation_statuses RENAME COLUMN requires_objective_note TO shows_observation;

ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS requires_observation boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN consultation_statuses.shows_observation IS
  'TRUE = ao atribuir este status, oculta campos clínicos e mostra apenas "Observação do Atendimento" (renomeado de requires_objective_note nesta migration).';
COMMENT ON COLUMN consultation_statuses.requires_observation IS
  'Só tem efeito quando shows_observation=TRUE. TRUE = observação obrigatória; FALSE = opcional.';
