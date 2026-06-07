-- Migration 104: Corrige policy admin em consultations
-- Substitui is_admin() por subquery inline (padrão seguro do projeto, mesma correção da 75 para patients).
-- is_admin() é SECURITY DEFINER e pode falhar no contexto de RETURNING em bulk INSERTs,
-- fazendo o insert ter sucesso mas retornar 0 linhas — causava "série criada com 0 atendimentos".

DROP POLICY IF EXISTS "consultations: admin gerencia" ON consultations;

CREATE POLICY "consultations: admin gerencia" ON consultations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
