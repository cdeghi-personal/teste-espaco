-- ============================================================
-- Espaço Casa Amarela — Migração 08
-- Tipos de Atendimento
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Tipos de Atendimento ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_appointment_types" ON appointment_types
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_read_appointment_types" ON appointment_types
  FOR SELECT TO authenticated USING (true);

-- Dados iniciais
INSERT INTO appointment_types (name) VALUES
  ('Sessão Individual'),
  ('Grupo Terapêutico'),
  ('Avaliação'),
  ('Devolutiva')
ON CONFLICT DO NOTHING;

-- ─── Adiciona tipo na tabela de consultas ─────────────────────
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS appointment_type_id uuid REFERENCES appointment_types(id) ON DELETE SET NULL;
