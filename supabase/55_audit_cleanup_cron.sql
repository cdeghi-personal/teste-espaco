-- 55_audit_cleanup_cron.sql
-- Agenda limpeza diária do log de auditoria mantendo apenas os últimos 90 dias.
-- Usa pg_cron (disponível no Supabase — habilitar em Extensions se necessário).

-- 1. Habilita a extensão pg_cron (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Remove job anterior se existir (permite re-rodar sem duplicar)
SELECT cron.unschedule('cleanup-audit-logs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-audit-logs'
);

-- 3. Agenda: todo dia às 03:00 UTC, deleta registros com mais de 90 dias
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *',
  $$DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '90 days'$$
);