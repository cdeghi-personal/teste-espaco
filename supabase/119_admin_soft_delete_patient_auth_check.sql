-- 119_admin_soft_delete_patient_auth_check.sql
-- Vuln (revisão de segurança): admin_soft_delete_patient (migration 98) ficou
-- sem NENHUMA checagem de autorização — "SET LOCAL row_security = off" +
-- GRANT para "authenticated" significa que qualquer terapeuta logado podia
-- inativar qualquer paciente da clínica chamando a RPC direto.
--
-- Histórico (por que a checagem tinha sido removida):
--   96: checagem inline via auth.uid() = ... AND role = 'admin'.
--   97: trocada para current_setting('request.jwt.claims', true)->>'sub'
--       (auth.uid() documentado como não confiável dentro de algumas
--       SECURITY DEFINER neste projeto — mesmo padrão da migration 26).
--   98: a checagem foi REMOVIDA (não trocada por outra coisa), com o
--       comentário de que ambas as abordagens deram resultado inconsistente
--       para usuários híbridos admin+terapeuta.
--
-- Por que reintroduzir com o padrão da 97 é seguro: cleanup_inactive_patient_data
-- (mesmo padrão de checagem, mesmo tipo de chamada via RPC autenticada) foi
-- corrigida na MESMA migration 97 e nunca precisou ser revertida — ainda usa
-- exatamente essa checagem hoje (migrations 99/100, sem relação com auth).
-- Ou seja: existe um caso irmão idêntico, no mesmo código, funcionando de
-- forma confiável há várias migrations. Reaproveitamos o padrão dele aqui.
--
-- ATENÇÃO PRODUÇÃO: como não há ambiente de homologação separado, teste o
-- botão "Inativar Paciente" (como admin comum e como admin+terapeuta híbrido,
-- se existir esse perfil) logo após aplicar esta migration. Se o problema
-- histórico realmente se repetir (a checagem bloquear um admin legítimo),
-- rode este rollback imediato antes de investigar mais:
--
--   CREATE OR REPLACE FUNCTION admin_soft_delete_patient(p_patient_id uuid)
--   RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
--   BEGIN
--     SET LOCAL row_security = off;
--     UPDATE patients SET deleted = true WHERE id = p_patient_id AND deleted = false;
--     IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Paciente não encontrado ou já está inativo.'); END IF;
--     RETURN jsonb_build_object('success', true);
--   END; $$;

CREATE OR REPLACE FUNCTION admin_soft_delete_patient(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Acesso negado — apenas administradores podem inativar pacientes.');
  END IF;

  UPDATE patients SET deleted = true WHERE id = p_patient_id AND deleted = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Paciente não encontrado ou já está inativo.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_soft_delete_patient(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_soft_delete_patient(uuid) FROM anon;
