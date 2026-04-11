-- ============================================================
-- 31_audit_grant.sql
-- Logs de INSERT/UPDATE/DELETE funcionam via trigger (SECURITY
-- DEFINER = roda como postgres, ignora grants).
-- Logs de VIEW são inseridos pelo frontend JS com a role
-- "authenticated" — que precisa de GRANT explícito na tabela.
-- ============================================================

GRANT INSERT ON TABLE public.audit_logs TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
