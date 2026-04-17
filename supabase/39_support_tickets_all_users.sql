-- Abre o suporte para todos os usuários autenticados
-- Adiciona created_by_id para controle de acesso por usuário

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES auth.users(id);

-- Remove policies antigas
DROP POLICY IF EXISTS "support_tickets_admin"  ON support_tickets;
DROP POLICY IF EXISTS "support_history_admin"  ON support_ticket_history;

-- support_tickets: SELECT — admin vê tudo, usuário vê os próprios
CREATE POLICY "support_tickets_select" ON support_tickets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR created_by_id = auth.uid()
  );

-- support_tickets: INSERT — qualquer autenticado (deve gravar created_by_id = auth.uid())
CREATE POLICY "support_tickets_insert" ON support_tickets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by_id = auth.uid()
  );

-- support_tickets: UPDATE — somente admin
CREATE POLICY "support_tickets_update" ON support_tickets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- support_ticket_history: SELECT — admin vê tudo, usuário vê histórico dos seus tickets
CREATE POLICY "support_history_select" ON support_ticket_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = support_ticket_history.ticket_id
        AND created_by_id = auth.uid()
    )
  );

-- support_ticket_history: INSERT — qualquer autenticado
CREATE POLICY "support_history_insert" ON support_ticket_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
