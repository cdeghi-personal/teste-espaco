-- 54_audit_backfill_user_name.sql
-- Popula user_name nos registros existentes de audit_logs.
-- Prioridade: therapists.name > user_metadata.full_name/name > user_email

UPDATE audit_logs al
SET user_name = COALESCE(
  -- 1) Nome do terapeuta vinculado ao auth user
  (SELECT t.name FROM therapists t WHERE t.user_id = al.user_id LIMIT 1),
  -- 2) Display name dos metadados do auth
  NULLIF(TRIM(COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name'
  )), ''),
  -- 3) Fallback: e-mail
  al.user_email,
  ''
)
FROM auth.users au
WHERE au.id = al.user_id
  AND al.user_id IS NOT NULL
  AND (al.user_name IS NULL OR al.user_name = '');