-- ============================================================
-- 28_fix_audit_rls.sql
-- O INSERT dentro do trigger falha silenciosamente porque o
-- PostgreSQL aplica RLS na tabela audit_logs mesmo dentro de
-- funções SECURITY DEFINER. A policy de INSERT usa auth.uid()
-- que retorna NULL dentro de triggers — então a política
-- bloqueia o INSERT e o EXCEPTION WHEN OTHERS engole o erro.
--
-- Fix: SET row_security = off na própria função faz com que
-- ela bypass o RLS ao executar DML, independente do contexto.
-- ============================================================

ALTER FUNCTION fn_audit_log() SET row_security = off;

-- Recria as policies (simplificadas):
-- INSERT: permitido sem restrição (o trigger e o frontend autenticado inserem)
-- SELECT: apenas admin pode ler

DROP POLICY IF EXISTS "audit_logs: admin vê tudo"      ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: autenticado insere" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: insert livre"       ON audit_logs;
DROP POLICY IF EXISTS "audit_logs: admin lê"           ON audit_logs;

CREATE POLICY "audit_logs: insert livre"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "audit_logs: admin lê"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
