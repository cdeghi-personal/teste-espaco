-- 115_consultation_status_awaiting_outcome.sql
-- Flag explícita para status que representam um atendimento que AINDA NÃO
-- ACONTECEU (ex.: Agendada, Confirmada). Diferente de is_scheduling_default
-- (migration 112, no máximo 1 status ativo, usado só para escolher o status
-- inicial de novos atendimentos/reposições) — is_awaiting_outcome pode estar
-- marcada em vários status ao mesmo tempo, sem limite.
--
-- Efeitos no app:
-- 1) ConsultationFormModal: Objetivo da Sessão e Relato deixam de ser
--    obrigatórios quando o status do atendimento tem esta flag (o atendimento
--    ainda não ocorreu, não faz sentido exigir relato de sessão).
-- 2) Cálculo de Pendências (Dashboard): um atendimento com esta flag e data
--    já passada entra na contagem de pendências — substitui a antiga busca
--    textual por "agend" no nome do status.
ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS is_awaiting_outcome boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN consultation_statuses.is_awaiting_outcome IS
  'TRUE = status representa atendimento que ainda não aconteceu (ex.: Agendada, Confirmada). Isenta Objetivo da Sessão/Relato de obrigatoriedade e alimenta o cálculo de Pendências. Vários status podem ter esta flag — sem unicidade (diferente de is_scheduling_default).';
