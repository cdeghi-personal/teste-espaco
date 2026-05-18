-- 71_consultation_status_requires_note.sql
-- Adiciona flag requires_objective_note em consultation_statuses.
-- Quando true, o campo "Objetivo da Sessão" passa a ser obrigatório
-- ao criar ou editar um atendimento com este status.

ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS requires_objective_note boolean NOT NULL DEFAULT false;
