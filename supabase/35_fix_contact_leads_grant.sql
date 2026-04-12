-- ============================================================
-- 35_fix_contact_leads_grant.sql
-- O script 34 dava GRANT SELECT/UPDATE para toda a role
-- authenticated, embora as policies RLS só permitam admin.
-- O RLS protege corretamente, mas por clareza e princípio de
-- menor privilégio: revoga o broad grant e mantém apenas o
-- INSERT para anon (formulário público).
-- SELECT/UPDATE para admin já é controlado exclusivamente
-- pelo RLS — não precisa de GRANT extra além do padrão.
-- ============================================================

REVOKE SELECT, UPDATE ON TABLE public.contact_leads FROM authenticated;

-- anon continua podendo inserir (formulário público do site)
-- O GRANT INSERT para anon do script 34 permanece válido.
