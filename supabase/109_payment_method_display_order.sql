-- 109_payment_method_display_order.sql
-- Adiciona coluna de ordenação manual (opcional) às formas de pagamento.
-- Valores nulos são permitidos em múltiplos registros; valores preenchidos devem ser únicos.
ALTER TABLE payment_methods
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_display_order_unique
  ON payment_methods (display_order) WHERE display_order IS NOT NULL;
