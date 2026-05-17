-- Etapa 4: flag "consome sessão pré-paga" nos status de atendimento

ALTER TABLE consultation_statuses
  ADD COLUMN IF NOT EXISTS consumes_prepaid_session boolean NOT NULL DEFAULT false;
