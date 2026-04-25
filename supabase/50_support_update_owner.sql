-- 50_support_update_owner.sql
-- SET row_security = off não funciona como parâmetro de configuração de função
-- no PostgreSQL — a RLS continua bloqueando UPDATE mesmo com SECURITY DEFINER.
-- Solução: policy UPDATE para o dono do ticket.
-- As RPCs (approve/reject) continuam fazendo a validação de negócio
-- (nova_resposta = true + created_by_id = chamador).

DROP POLICY IF EXISTS "support_tickets_update_owner" ON support_tickets;

CREATE POLICY "support_tickets_update_owner" ON support_tickets
  FOR UPDATE
  USING  (created_by_id = auth.uid())
  WITH CHECK (created_by_id = auth.uid());