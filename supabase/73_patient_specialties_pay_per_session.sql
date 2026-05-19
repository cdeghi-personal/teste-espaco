-- 73_patient_specialties_pay_per_session.sql
-- Adiciona PAY_PER_SESSION ao CHECK constraint de payment_type em patient_specialties.
-- PAY_PER_SESSION = Pré-pago por consulta individual (pago antes, sessão a sessão, sem pacote).

ALTER TABLE patient_specialties
  DROP CONSTRAINT IF EXISTS patient_specialties_payment_type_check;

ALTER TABLE patient_specialties
  ADD CONSTRAINT patient_specialties_payment_type_check
  CHECK (payment_type IN ('POST_PER_SESSION', 'POST_MONTHLY', 'PREPAID_PACKAGE', 'PAY_PER_SESSION'));
