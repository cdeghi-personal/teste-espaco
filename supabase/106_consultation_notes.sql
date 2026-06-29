-- Adiciona campo "Observação do Atendimento" em consultations.
-- Usado quando o status tem requires_objective_note = TRUE:
-- nesse caso o terapeuta preenche apenas este campo (justificativa de falta,
-- cancelamento etc.) e os campos clínicos ficam ocultos e não-obrigatórios.
ALTER TABLE consultations
  ADD COLUMN notes TEXT;

ALTER TABLE consultation_series
  ADD COLUMN notes TEXT;
