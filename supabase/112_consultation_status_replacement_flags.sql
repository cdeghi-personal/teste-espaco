-- 112_consultation_status_replacement_flags.sql
-- Flags explícitas de configuração de status usadas pelo fluxo de Reposição de
-- Atendimentos — nunca dependem do nome/texto do status.
ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS requests_replacement_decision boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN consultation_statuses.requests_replacement_decision IS
  'TRUE = ao atribuir este status a um atendimento, o usuário deve informar se haverá reposição.';

ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS is_scheduling_default boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN consultation_statuses.is_scheduling_default IS
  'TRUE = status usado como padrão de agendamento (ex.: usado ao criar reposições). No máximo um status ATIVO pode ter esta flag.';

-- Garante no máximo um status ATIVO como padrão de agendamento
CREATE UNIQUE INDEX IF NOT EXISTS consultation_statuses_scheduling_default_unique
  ON consultation_statuses (is_scheduling_default)
  WHERE is_scheduling_default = true AND active IS DISTINCT FROM false;
