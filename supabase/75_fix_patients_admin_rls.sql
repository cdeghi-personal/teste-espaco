-- 75_fix_patients_admin_rls.sql
-- Corrige a policy de admin em patients:
--   1. Remove 'deleted = false' do USING — isso bloqueava o soft-delete (UPDATE deleted=true retornava 403)
--   2. Substitui is_admin() por subquery inline (padrão seguro do projeto)

DROP POLICY IF EXISTS "patients: admin acessa todos" ON patients;

CREATE POLICY "patients: admin acessa todos" ON patients
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
