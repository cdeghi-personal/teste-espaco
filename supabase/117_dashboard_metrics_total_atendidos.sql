-- 117_dashboard_metrics_total_atendidos.sql
-- Fecha a conta Total = Atendidos + Pend.(mês) na tabela "Terapeutas — mês":
--   1) "total" passa a contar só até a data de corte (exclui agendamentos futuros
--      dentro do próprio mês, que antes inflavam o Total sem aparecer em nenhuma
--      coluna — essa era a causa da conta não bater).
--   2) "completed" (rótulo "Atendidos" no frontend) deixa de depender de
--      consumesPrepaidSession e passa a significar "status diferente de
--      aguarda desfecho" — ou seja, a terapeuta já resolveu o registro,
--      mesmo que o desfecho tenha sido Cancelada/Faltou.
-- pending_month/pending_previous (migration 116) não mudam — já eram calculados
-- com o mesmo corte de data e já eram subconjunto do mês de referência.
-- Mesma assinatura das migrations 114/116 — apenas o corpo muda (CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION get_dashboard_monthly_metrics(
  p_year integer,
  p_month integer,
  p_cutoff_date date,
  p_realizada_status_ids uuid[],
  p_agendada_status_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_profile boolean;
  v_month_start date;
  v_month_end   date;
  v_therapists  jsonb;
  v_specialties jsonb;
BEGIN
  SET LOCAL row_security = off;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) INTO v_has_profile;
  IF NOT v_has_profile THEN
    RETURN jsonb_build_object('error', 'Não autorizado.');
  END IF;
  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RETURN jsonb_build_object('error', 'Período inválido.');
  END IF;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end   := (v_month_start + interval '1 month - 1 day')::date;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_therapists FROM (
    SELECT
      th.id AS therapist_id, th.name AS therapist_name, th.color AS therapist_color,
      COUNT(c.id) FILTER (WHERE c.date BETWEEN v_month_start AND v_month_end
        AND c.date < p_cutoff_date) AS total,
      COUNT(c.id) FILTER (WHERE c.date BETWEEN v_month_start AND v_month_end
        AND c.date < p_cutoff_date
        AND NOT (c.consultation_status_id = ANY(p_agendada_status_ids))) AS completed,
      (SELECT COUNT(*) FROM consultations c2
        WHERE c2.therapist_id = th.id AND c2.event_type <> 'INTERVIEW'
          AND c2.date < p_cutoff_date
          AND c2.date BETWEEN v_month_start AND v_month_end
          AND c2.consultation_status_id = ANY(p_agendada_status_ids)
      ) AS pending_month,
      (SELECT COUNT(*) FROM consultations c2
        WHERE c2.therapist_id = th.id AND c2.event_type <> 'INTERVIEW'
          AND c2.date < p_cutoff_date
          AND c2.date < v_month_start
          AND c2.consultation_status_id = ANY(p_agendada_status_ids)
      ) AS pending_previous
    FROM therapists th
    LEFT JOIN consultations c ON c.therapist_id = th.id AND c.event_type <> 'INTERVIEW'
    GROUP BY th.id, th.name, th.color
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) INTO v_specialties FROM (
    SELECT c.specialty AS specialty_key, COUNT(*) AS total,
      COUNT(*) FILTER (WHERE c.consultation_status_id = ANY(p_realizada_status_ids)) AS completed
    FROM consultations c
    WHERE c.event_type <> 'INTERVIEW' AND c.date BETWEEN v_month_start AND v_month_end
      AND c.specialty IS NOT NULL
    GROUP BY c.specialty
  ) s;

  RETURN jsonb_build_object('therapists', v_therapists, 'specialties', v_specialties);
END;
$$;

REVOKE ALL ON FUNCTION get_dashboard_monthly_metrics(integer, integer, date, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_monthly_metrics(integer, integer, date, uuid[], uuid[]) TO authenticated;
