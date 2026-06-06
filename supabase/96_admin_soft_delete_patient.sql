-- Migration 96: RPC admin_soft_delete_patient
--
-- Substitui o UPDATE direto em patients que sofria de silent failure quando
-- múltiplas policies RLS com USING/WITH CHECK combinadas faziam 0 linhas
-- serem afetadas sem retornar erro (PostgREST retorna 200 com data:null).
-- SECURITY DEFINER + row_security = off garante execução independente de RLS.
-- Validação de admin inline (padrão do projeto).

CREATE OR REPLACE FUNCTION admin_soft_delete_patient(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
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
