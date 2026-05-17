-- Etapa 2: percentual de desconto automático do terapeuta

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS therapist_discount_percent numeric(5,2) NOT NULL DEFAULT 0;
