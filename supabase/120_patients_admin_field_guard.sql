-- 120_patients_admin_field_guard.sql
-- Vuln (revisão de segurança): a policy "patients: terapeuta edita os seus"
-- (migration 95) tem WITH CHECK (true) de propósito — o comentário da própria
-- migration diz "soft-delete é gateado pela UI (admin only)". Na prática isso
-- significa que qualquer terapeuta com acesso de edição ao paciente (USING)
-- pode escrever QUALQUER valor no UPDATE, incluindo `deleted` e
-- `primary_therapist_id`, direto pelo cliente Supabase — sem passar pela UI.
--
-- Fix: trigger BEFORE UPDATE que reverte silenciosamente uma tentativa de
-- INATIVAR (false → true) quando quem está chamando não é admin — só essa
-- direção. "Silencioso" (não gera erro) de propósito: o fluxo normal de
-- editar um paciente (telefone, endereço, especialidades etc.) NUNCA toca
-- nesse campo, então pra um terapeuta comum isso é um no-op — não muda nada
-- do que já funciona hoje. Só neutraliza a tentativa de inativar por fora do
-- fluxo admin-only (que já existe como RPC dedicada, admin_soft_delete_patient,
-- com botão "Excluir" isAdmin-gated em PatientsPage.jsx).
--
-- NÃO bloqueia RESTAURAR (true → false): o botão "Restaurar" em
-- PatientsPage.jsx hoje NÃO é isAdmin-gated (ao contrário de "Excluir" e
-- "Limpeza definitiva", que são) — ou seja, qualquer terapeuta já pode
-- reativar um paciente pela tela atual. Bloquear essa direção mudaria um
-- comportamento hoje permitido sem confirmação de que é realmente um bug
-- (e não uma decisão deliberada de deixar a reativação mais permissiva que
-- a inativação) — ver observação separada sobre isso.
--
-- NÃO protege `primary_therapist_id` (Gerente do Caso) nesta migration: o
-- campo hoje é editável por QUALQUER terapeuta com acesso de edição ao
-- paciente também na própria tela (Select "Gerente do Caso *" só é desabilitado
-- por `readOnly`, não por `isAdmin`) — ao contrário do soft-delete, não há
-- evidência de que isso seja um bug e não um comportamento intencional
-- (transferência de caso entre terapeutas sem precisar de admin). Restringir
-- esse campo também exigiria confirmar essa regra de negócio antes — ver
-- observação separada sobre isso.
--
-- v_uid NULL (sem JWT — ex.: acesso direto via SQL Editor/service role) passa
-- direto sem checagem: essa trigger protege contra chamadas via API feitas por
-- um usuário autenticado sem privilégio, não contra acesso direto ao banco.

CREATE OR REPLACE FUNCTION fn_guard_patient_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
BEGIN
  BEGIN
    v_uid := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uid := NULL;
  END;

  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Só nos importa a transição false → true (inativar); restaurar (true →
  -- false) e qualquer UPDATE que não mexe em `deleted` passam direto.
  IF NOT (OLD.deleted = false AND NEW.deleted = true) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = v_uid AND role = 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  NEW.deleted := false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_patient_admin_fields ON patients;
CREATE TRIGGER trg_guard_patient_admin_fields
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION fn_guard_patient_admin_fields();
