-- 123_payment_invoices_payment_date.sql
-- Adiciona a data EFETIVA do pagamento (payment_date), distinta de paid_at/paid_by.
--
-- Hoje "Marcar como Pago" só grava paid_at (timestamp técnico do momento da
-- operação) e paid_by (quem confirmou). Não existe campo para a data em que o
-- pagamento realmente aconteceu — que pode ser anterior ao dia em que alguém
-- lembra de marcar a fatura no sistema.
--
-- Semântica final:
--   payment_date — DATE, escolhida pelo admin no modal de confirmação. Data
--                  financeira efetiva. Pode ser hoje ou qualquer dia anterior.
--   paid_at      — TIMESTAMPTZ, imutável, timestamp técnico de quando a
--                  operação "Marcar como Pago" foi confirmada no sistema.
--                  NUNCA editável.
--   paid_by      — quem confirmou a operação. NUNCA editável.
--
-- ─── 1. Coluna nova ────────────────────────────────────────────────────────

ALTER TABLE payment_invoices ADD COLUMN IF NOT EXISTS payment_date DATE;

COMMENT ON COLUMN payment_invoices.payment_date IS
  'Data efetiva em que o pagamento ocorreu, escolhida pelo admin no modal de '
  'confirmação — distinta de paid_at (timestamp técnico e imutável de quando '
  'a operação foi confirmada no sistema) e paid_by (quem confirmou). Pode '
  'ficar NULL em faturas PAID legadas, anteriores a esta migration, quando '
  'não há evidência confiável da data real — ver backfill abaixo e o fluxo '
  '"Informar data do pagamento" no frontend para regularização manual.';

-- ─── 2. Backfill — prioridade 1: derivar de paid_at ────────────────────────
-- paid_at é TIMESTAMPTZ (armazenado em UTC internamente). Um cast direto
-- (paid_at::date) pode deslocar a data em pagamentos confirmados perto da
-- meia-noite no horário de Brasília — por isso a conversão explícita de fuso
-- antes do cast para date.

UPDATE payment_invoices
SET payment_date = (paid_at AT TIME ZONE 'America/Sao_Paulo')::date
WHERE status = 'PAID' AND paid_at IS NOT NULL AND payment_date IS NULL;

-- ─── 3. Backfill — prioridade 2: logs de auditoria — AVALIADO E DESCARTADO ─
-- payment_invoices NUNCA teve nenhum trigger de auditoria anexado (confirmado
-- por grep exaustivo em todas as migrations existentes — nenhuma contém
-- "CREATE TRIGGER" referenciando payment_invoices antes desta). Não existe,
-- e nunca existiu, nenhuma linha em audit_logs ou audit_logs_history com
-- resource_type = 'payment_invoices'. Isso não é uma limitação de retenção
-- (90 dias / 1 ano) — é uma lacuna de cobertura: o dado nunca foi gravado,
-- em nenhum momento desde a criação da tabela (migration 79). Não há nada
-- para recuperar por essa via, para nenhuma fatura, em nenhuma data.
--
-- Faturas PAID que sobrarem com payment_date NULL após o passo 2 (só
-- possível se paid_at também for NULL, o que não deveria acontecer já que
-- paid_at é preenchido desde sempre por markInvoicePaid) ficam sem data —
-- consultar via:
--
--   SELECT id, nf_number, patient_id, created_at, paid_at
--   FROM payment_invoices
--   WHERE status = 'PAID' AND payment_date IS NULL
--   ORDER BY created_at;
--
-- Regularização manual pelo admin: botão "Informar data do pagamento" (só
-- preenche payment_date; nunca sobrescreve paid_at/paid_by) — ver RPC
-- set_invoice_payment_date abaixo.

-- ─── 4. Constraint de integridade — NOT VALID de propósito ─────────────────
-- Regra desejada: fatura PAID deve ter payment_date. NOT VALID evita que a
-- migration falhe por causa de legado sem evidência (passo 3) — mas já vale
-- para toda escrita NOVA a partir de agora, por qualquer caminho (RPC, SQL
-- direto, futura ferramenta admin), já que uma CHECK constraint é aplicada
-- pelo Postgres independente de como a linha é escrita.
--
-- Depois que os legados listados na query acima forem regularizados (via
-- backfill futuro ou "Informar data do pagamento"), rodar manualmente:
--
--   ALTER TABLE payment_invoices VALIDATE CONSTRAINT payment_invoices_paid_requires_date;

ALTER TABLE payment_invoices
  ADD CONSTRAINT payment_invoices_paid_requires_date
  CHECK (status <> 'PAID' OR payment_date IS NOT NULL) NOT VALID;

-- ─── 5. Auditoria — payment_invoices nunca foi coberta pelo trigger genérico
-- Recria fn_audit_log() (corpo idêntico ao de 107_audit_consultation_new_format.sql,
-- adicionando só um novo ramo ELSIF) e anexa o trigger à tabela pela primeira
-- vez. Efeito: a partir de agora, TODO INSERT/UPDATE/DELETE em payment_invoices
-- passa a gerar log — não só as duas RPCs novas, também createPaymentInvoice/
-- cancelPaymentInvoice já existentes. Isso é o comportamento desejado
-- (seção 11 do pedido), mas é uma mudança de comportamento nova, não apenas
-- aditiva — sinalizado aqui para quem for revisar o volume de audit_logs.

CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_resource_name   TEXT := '';
  v_resource_id     UUID;
  v_action          TEXT;
  v_user_id         UUID := NULL;
  v_user_email      TEXT := '';
  v_user_name       TEXT := '';
  v_rec             RECORD;
  v_mr_label        TEXT := '';
  -- consultation fields
  v_patient_name    TEXT := '';
  v_therapist_name  TEXT := '';
  v_status_name     TEXT := '';
  v_date_str        TEXT := '';
  v_time_str        TEXT := '';
  v_type_str        TEXT := '';
BEGIN
  -- Extrai user_id do JWT (operações via SQL Editor sem JWT retornam NULL e são ignoradas)
  BEGIN
    v_user_id := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  BEGIN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_email := '';
  END;

  -- Nome: 1) terapeuta  2) display name  3) e-mail
  BEGIN
    SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_user_name := '';
  END;

  IF COALESCE(v_user_name, '') = '' THEN
    BEGIN
      SELECT COALESCE(
        raw_user_meta_data->>'full_name',
        raw_user_meta_data->>'name'
      ) INTO v_user_name
      FROM auth.users WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_name := '';
    END;
  END IF;

  IF COALESCE(v_user_name, '') = '' THEN
    v_user_name := v_user_email;
  END IF;

  -- Define action e registro de referência
  IF TG_OP = 'DELETE' THEN
    v_action := 'DELETE'; v_rec := OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'INSERT'; v_rec := NEW;
  ELSE
    v_action := 'UPDATE'; v_rec := NEW;
  END IF;

  v_resource_id := v_rec.id;

  -- ── Resource name por tabela ────────────────────────────────
  IF TG_TABLE_NAME = 'consultations' THEN
    BEGIN
      -- paciente
      BEGIN
        IF v_rec.patient_id IS NOT NULL THEN
          SELECT full_name INTO v_patient_name FROM patients WHERE id = v_rec.patient_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_patient_name := ''; END;

      -- terapeuta responsável
      BEGIN
        SELECT name INTO v_therapist_name FROM therapists WHERE id = v_rec.therapist_id;
      EXCEPTION WHEN OTHERS THEN v_therapist_name := ''; END;

      -- status do atendimento
      BEGIN
        IF v_rec.consultation_status_id IS NOT NULL THEN
          SELECT name INTO v_status_name FROM consultation_statuses WHERE id = v_rec.consultation_status_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_status_name := ''; END;

      -- data formatada
      v_date_str := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '—');

      -- hora (HH:MM — primeiros 5 chars de time)
      IF COALESCE(v_rec.time::TEXT, '') <> '' THEN
        v_time_str := left(v_rec.time::TEXT, 5);
      ELSE
        v_time_str := '—';
      END IF;

      -- tipo do evento
      v_type_str := CASE WHEN v_rec.event_type = 'INTERVIEW' THEN 'Entrevista' ELSE 'Atendimento' END;

      -- monta resource_name no formato padronizado
      v_resource_name :=
        COALESCE(NULLIF(v_patient_name,   ''), '—') || ' | ' ||
        COALESCE(NULLIF(v_therapist_name, ''), '—') || ' | ' ||
        v_date_str                                   || ' | ' ||
        v_time_str                                   || ' | ' ||
        v_type_str                                   || ' | ' ||
        COALESCE(NULLIF(v_status_name,    ''), '—');

    EXCEPTION WHEN OTHERS THEN
      BEGIN
        v_resource_name := COALESCE(to_char(v_rec.date, 'DD/MM/YYYY'), '');
      EXCEPTION WHEN OTHERS THEN
        v_resource_name := '';
      END;
    END;

  ELSIF TG_TABLE_NAME IN ('medical_record_exams','medical_record_medications','medical_record_conducts') THEN
    v_mr_label := CASE TG_TABLE_NAME
      WHEN 'medical_record_exams'        THEN 'Exames'
      WHEN 'medical_record_medications'  THEN 'Medicamentos'
      WHEN 'medical_record_conducts'     THEN 'Conduta'
      ELSE TG_TABLE_NAME
    END;
    BEGIN
      SELECT p.full_name || ' | ' || v_mr_label
      INTO   v_resource_name
      FROM   medical_records mr
      JOIN   patients p ON p.id = mr.patient_id
      WHERE  mr.id = v_rec.medical_record_id;
      IF v_resource_name IS NULL THEN v_resource_name := v_mr_label; END IF;
    EXCEPTION WHEN OTHERS THEN
      v_resource_name := v_mr_label;
    END;

  ELSIF TG_TABLE_NAME = 'payment_invoices' THEN
    DECLARE
      v_pi_patient_name TEXT := '';
      v_pi_status_label TEXT := '';
    BEGIN
      BEGIN
        IF v_rec.patient_id IS NOT NULL THEN
          SELECT full_name INTO v_pi_patient_name FROM patients WHERE id = v_rec.patient_id;
        END IF;
      EXCEPTION WHEN OTHERS THEN v_pi_patient_name := ''; END;

      v_pi_status_label := CASE v_rec.status
        WHEN 'ISSUED'    THEN 'Emitida'
        WHEN 'PAID'      THEN 'Paga'
        WHEN 'CANCELLED' THEN 'Cancelada'
        ELSE COALESCE(v_rec.status, '—')
      END;

      v_resource_name :=
        COALESCE(NULLIF(v_rec.nf_number, ''), '(sem NF)') || ' | ' ||
        COALESCE(NULLIF(v_pi_patient_name, ''), '—')        || ' | R$ ' ||
        COALESCE(v_rec.total_amount::TEXT, '0')             || ' | ' ||
        v_pi_status_label;
    EXCEPTION WHEN OTHERS THEN
      v_resource_name := COALESCE(v_rec.nf_number, '');
    END;

  ELSE
    -- Fallback genérico: full_name → name → label → date
    BEGIN v_resource_name := v_rec.full_name;
    EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.name;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.label;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;

    IF COALESCE(v_resource_name, '') = '' THEN
      BEGIN v_resource_name := v_rec.date::TEXT;
      EXCEPTION WHEN undefined_column THEN v_resource_name := ''; END;
    END IF;
  END IF;

  -- Insere o log
  BEGIN
    INSERT INTO audit_logs (user_id, user_email, user_name, action, resource_type, resource_id, resource_name)
    VALUES (v_user_id, COALESCE(v_user_email,''), COALESCE(v_user_name,''), v_action, TG_TABLE_NAME, v_resource_id, COALESCE(v_resource_name,''));
  EXCEPTION WHEN OTHERS THEN
    -- não quebra a operação principal
  END;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payment_invoices ON payment_invoices;
CREATE TRIGGER trg_audit_payment_invoices
  AFTER INSERT OR UPDATE OR DELETE ON payment_invoices
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- ─── 6. RPC mark_invoice_paid — transição ISSUED → PAID atômica ────────────
-- Substitui as duas escritas não-atômicas do markInvoicePaid atual
-- (consultations.update depois payment_invoices.update, sem transação).
-- Lê consultation_ids da PRÓPRIA fatura (não de um parâmetro do cliente) —
-- elimina por construção o risco de IDs de consulta arbitrários/não
-- pertencentes à fatura, em vez de só validar um parâmetro separado.

CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id uuid,
  p_payment_date date,
  p_consultation_status_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_invoice payment_invoices;
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Acesso negado — apenas administradores podem marcar faturas como pagas.');
  END IF;

  IF p_payment_date IS NULL THEN
    RETURN jsonb_build_object('error', 'Informe a data do pagamento.');
  END IF;
  IF p_payment_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('error', 'A data do pagamento não pode ser no futuro.');
  END IF;

  SELECT * INTO v_invoice FROM payment_invoices WHERE id = p_invoice_id;
  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Fatura não encontrada.');
  END IF;
  IF v_invoice.status <> 'ISSUED' THEN
    RETURN jsonb_build_object('error', 'Apenas faturas com status Emitida podem ser marcadas como pagas.');
  END IF;

  IF v_invoice.consultation_ids IS NOT NULL
     AND array_length(v_invoice.consultation_ids, 1) > 0
     AND p_consultation_status_id IS NOT NULL THEN
    UPDATE consultations
    SET consultation_status_id = p_consultation_status_id
    WHERE id = ANY(v_invoice.consultation_ids);
  END IF;

  UPDATE payment_invoices
  SET status = 'PAID',
      payment_date = p_payment_date,
      paid_at = now(),
      paid_by = v_uid,
      updated_at = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_invoice_paid(uuid, date, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION mark_invoice_paid(uuid, date, uuid) FROM anon;

-- ─── 7. RPC set_invoice_payment_date — regularização de legado, uma vez ────
-- Só age em faturas já PAID com payment_date ainda nulo — nunca sobrescreve
-- uma data já registrada, nunca toca paid_at/paid_by. Auditada pelo trigger
-- novo (passo 5), sem necessidade de INSERT manual aqui.

CREATE OR REPLACE FUNCTION set_invoice_payment_date(p_invoice_id uuid, p_payment_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_invoice payment_invoices;
BEGIN
  SET LOCAL row_security = off;

  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Acesso negado — apenas administradores podem informar a data do pagamento.');
  END IF;

  IF p_payment_date IS NULL THEN
    RETURN jsonb_build_object('error', 'Informe a data do pagamento.');
  END IF;
  IF p_payment_date > CURRENT_DATE THEN
    RETURN jsonb_build_object('error', 'A data do pagamento não pode ser no futuro.');
  END IF;

  SELECT * INTO v_invoice FROM payment_invoices WHERE id = p_invoice_id;
  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Fatura não encontrada.');
  END IF;
  IF v_invoice.status <> 'PAID' THEN
    RETURN jsonb_build_object('error', 'Só é possível informar a data para faturas já pagas.');
  END IF;
  IF v_invoice.payment_date IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Esta fatura já possui data de pagamento registrada.');
  END IF;

  UPDATE payment_invoices SET payment_date = p_payment_date WHERE id = p_invoice_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION set_invoice_payment_date(uuid, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION set_invoice_payment_date(uuid, date) FROM anon;

-- ─── ATENÇÃO PRODUÇÃO (sem ambiente de homologação separado) ───────────────
-- Depois de aplicar, testar manualmente:
--   1. Marcar uma fatura ISSUED de teste como paga (modal → RPC) e conferir:
--      status/payment_date/paid_at/paid_by da fatura, status das consultas
--      vinculadas, e uma linha nova em audit_logs com
--      resource_type = 'payment_invoices'.
--   2. Rodar set_invoice_payment_date numa fatura PAID com payment_date
--      manualmente zerado (UPDATE payment_invoices SET payment_date = NULL
--      WHERE id = '<id-de-teste>') e conferir que só payment_date muda.
--
-- Rollback mais barato se o trigger novo causar algum problema (volume de
-- audit_logs, bug no ramo novo de fn_audit_log): reverter só o trigger, sem
-- afetar coluna/constraint/RPCs (aditivas e de baixo risco por si só):
--
--   DROP TRIGGER IF EXISTS trg_audit_payment_invoices ON payment_invoices;
