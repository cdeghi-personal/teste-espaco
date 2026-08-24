-- 118_consultations_status_not_null.sql
-- Corrige atendimentos "orfaos" (consultation_status_id nulo), causa raiz de
-- Total != Atendidos + Pendencias no painel "Terapeutas - mes": a comparacao
-- `status = ANY(array)` / `NOT (status = ANY(array))` retorna NULL (nao TRUE
-- nem FALSE) quando consultation_status_id e nulo, entao esses atendimentos
-- eram contados em Total mas descartados de Atendidos e de Pendencias.
-- Confirmado via diagnostico: Fabiana Sarilho e Giancarlo Carreto tinham
-- atendimentos sem status atribuido (provavelmente originados de exclusao
-- fisica de um status em uso — consultation_status_id tem ON DELETE SET NULL).
--
-- 1) Backfill: atribui aos orfaos o status "aguarda desfecho" (is_awaiting_outcome)
--    ativo, alfabeticamente primeiro — mesma regra passa a valer no frontend
--    como fallback de status padrao para novos atendimentos (ver
--    ConsultationFormModal.jsx).
-- 2) Torna consultation_status_id obrigatorio em consultations, para que a
--    situacao nao se repita. Efeito colateral desejado: a partir de agora,
--    excluir fisicamente um status ainda referenciado por algum atendimento
--    passa a falhar (em vez de silenciosamente zerar a referencia), forcando
--    reatribuir os atendimentos antes de excluir o status.
DO $$
DECLARE
  v_default_id uuid;
  v_fixed_count integer;
BEGIN
  SELECT id INTO v_default_id
  FROM consultation_statuses
  WHERE is_awaiting_outcome = true
    AND active IS DISTINCT FROM false
  ORDER BY name ASC
  LIMIT 1;

  IF v_default_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum status ativo com a flag "Atendimento ainda não aconteceu" (is_awaiting_outcome) foi encontrado — configure ao menos um em Status Atendimento antes de rodar esta migration.';
  END IF;

  UPDATE consultations
  SET consultation_status_id = v_default_id
  WHERE consultation_status_id IS NULL;

  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;
  RAISE NOTICE 'Atendimentos corrigidos (status nulo -> %): %', v_default_id, v_fixed_count;
END $$;

ALTER TABLE consultations ALTER COLUMN consultation_status_id SET NOT NULL;
