-- 52_support_status_reprovado.sql
-- Adiciona 'reprovado_usuario' ao CHECK constraint de status em support_tickets.

ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_status_check;

ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status = ANY (ARRAY[
    'novo'::text,
    'em_analise'::text,
    'em_desenvolvimento'::text,
    'resolvido'::text,
    'fechado'::text,
    'reprovado_usuario'::text
  ]));