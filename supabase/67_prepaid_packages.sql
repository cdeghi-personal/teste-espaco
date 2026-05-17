-- Etapa 3: Pacotes pré-pagos e ledger de sessões

-- Tabela de pacotes comprados
CREATE TABLE IF NOT EXISTS patient_prepaid_packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  sessions_quantity integer NOT NULL CHECK (sessions_quantity > 0),
  patient_value_per_session numeric(10,2),
  therapist_value_per_session numeric(10,2),
  total_paid numeric(10,2),
  notes text,
  purchased_at date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Tabela de movimentações (ledger)
CREATE TABLE IF NOT EXISTS patient_prepaid_ledger (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  package_id uuid REFERENCES patient_prepaid_packages(id) ON DELETE SET NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT', 'ADJUSTMENT')),
  sessions_quantity integer NOT NULL,  -- positivo para CREDIT/ADJUSTMENT positivo; negativo para DEBIT/ADJUSTMENT negativo
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prepaid_packages_patient ON patient_prepaid_packages(patient_id, specialty);
CREATE INDEX IF NOT EXISTS idx_prepaid_ledger_patient ON patient_prepaid_ledger(patient_id, specialty);
CREATE INDEX IF NOT EXISTS idx_prepaid_ledger_package ON patient_prepaid_ledger(package_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_ledger_consultation ON patient_prepaid_ledger(consultation_id);

-- RLS
ALTER TABLE patient_prepaid_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_prepaid_ledger ENABLE ROW LEVEL SECURITY;

-- Pacotes: admin tudo; terapeuta vê/cria para seus pacientes
CREATE POLICY "admin_all_prepaid_packages" ON patient_prepaid_packages
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_select_prepaid_packages" ON patient_prepaid_packages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM therapists t
      WHERE t.user_id = auth.uid()
        AND (
          t.id = (SELECT primary_therapist_id FROM patients WHERE id = patient_prepaid_packages.patient_id)
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = patient_prepaid_packages.patient_id AND pit.therapist_id = t.id)
        )
    )
  );

-- Ledger: admin tudo; terapeuta vê para seus pacientes
CREATE POLICY "admin_all_prepaid_ledger" ON patient_prepaid_ledger
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_select_prepaid_ledger" ON patient_prepaid_ledger
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM therapists t
      WHERE t.user_id = auth.uid()
        AND (
          t.id = (SELECT primary_therapist_id FROM patients WHERE id = patient_prepaid_ledger.patient_id)
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = patient_prepaid_ledger.patient_id AND pit.therapist_id = t.id)
        )
    )
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_prepaid_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_prepaid_ledger TO authenticated;
