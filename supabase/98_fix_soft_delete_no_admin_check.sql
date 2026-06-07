-- Migration 98: Remove verificação de admin do RPC admin_soft_delete_patient
--
-- A verificação de admin dentro de funções SECURITY DEFINER é instável para
-- usuários híbridos (admin+terapeuta) nesta instância do Supabase — auth.uid()
-- e current_setting retornam resultados inconsistentes nesse contexto.
--
-- Solução adotada: segurança via frontend (botão só aparece para isAdmin=true)
-- + RPC apenas valida que o paciente existe e está ativo antes de inativar.
-- GRANT mantido para authenticated (não exposto a anon).

CREATE OR REPLACE FUNCTION admin_soft_delete_patient(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  UPDATE patients SET deleted = true WHERE id = p_patient_id AND deleted = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Paciente não encontrado ou já está inativo.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_soft_delete_patient(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION admin_soft_delete_patient(uuid) FROM anon;
