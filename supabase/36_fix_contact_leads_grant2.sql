-- ============================================================
-- 36_fix_contact_leads_grant2.sql
-- O script 35 revogou SELECT/UPDATE de authenticated, o que
-- bloqueou até o admin (que também usa essa role).
-- GRANT e RLS são camadas distintas:
--   GRANT: permite que a role chegue à tabela
--   RLS:   restringe quais linhas cada usuário vê/edita
-- Ambos precisam estar corretos. O RLS já garante que apenas
-- admin consegue ler e atualizar — o GRANT só abre a porta.
-- ============================================================

GRANT SELECT, UPDATE ON TABLE public.contact_leads TO authenticated;
