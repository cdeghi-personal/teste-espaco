-- 85_consultation_conflicts.sql
-- Persistência de conflitos de agenda detectados na criação/edição de atendimentos.

CREATE TABLE IF NOT EXISTS consultation_conflicts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id         uuid NOT NULL REFERENCES consultations(id)       ON DELETE CASCADE,
  conflict_type           text NOT NULL CHECK (conflict_type IN (
                            'THERAPIST_OVERLAP',
                            'ROOM_OVERLAP',
                            'THERAPIST_UNAVAILABLE_TOTAL',
                            'THERAPIST_UNAVAILABLE_PARTIAL'
                          )),
  related_consultation_id uuid REFERENCES consultations(id)                ON DELETE SET NULL,
  therapist_id            uuid REFERENCES therapists(id)                   ON DELETE SET NULL,
  room_id                 uuid REFERENCES rooms(id)                        ON DELETE SET NULL,
  unavailability_id       uuid REFERENCES therapist_unavailabilities(id)  ON DELETE SET NULL,
  conflict_date           date        NOT NULL,
  start_time              text        NOT NULL,
  end_time                text        NOT NULL,
  description             text,
  resolved                boolean     DEFAULT false,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conflicts_consultation ON consultation_conflicts(consultation_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_date         ON consultation_conflicts(conflict_date);
CREATE INDEX IF NOT EXISTS idx_conflicts_therapist    ON consultation_conflicts(therapist_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_room         ON consultation_conflicts(room_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_resolved     ON consultation_conflicts(resolved);

ALTER TABLE consultation_conflicts ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
CREATE POLICY "conflicts_admin" ON consultation_conflicts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Terapeuta SELECT: conflitos dos atendimentos que consegue visualizar
CREATE POLICY "conflicts_therapist_select" ON consultation_conflicts
  FOR SELECT TO authenticated
  USING (
    consultation_id IN (
      SELECT id FROM consultations
      WHERE therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
    )
    OR
    (
      EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid() AND belongs_to_team = true)
      AND consultation_id IN (
        SELECT c.id FROM consultations c
        JOIN therapists t ON t.id = c.therapist_id
        WHERE t.belongs_to_team = true
      )
    )
    OR
    consultation_id IN (
      SELECT consultation_id FROM consultation_therapists
      WHERE therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
    )
  );

GRANT SELECT ON consultation_conflicts TO authenticated;

-- RPC SECURITY DEFINER para persistir conflitos (substitui INSERT/DELETE direto)
CREATE OR REPLACE FUNCTION persist_consultation_conflicts(
  p_consultation_id uuid,
  p_conflicts       jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apaga conflitos anteriores deste atendimento
  DELETE FROM consultation_conflicts WHERE consultation_id = p_consultation_id;

  -- Insere novos
  IF p_conflicts IS NOT NULL AND jsonb_array_length(p_conflicts) > 0 THEN
    INSERT INTO consultation_conflicts (
      consultation_id, conflict_type, related_consultation_id,
      therapist_id, room_id, unavailability_id,
      conflict_date, start_time, end_time, description
    )
    SELECT
      p_consultation_id,
      elem->>'conflict_type',
      NULLIF(elem->>'related_consultation_id', '')::uuid,
      NULLIF(elem->>'therapist_id', '')::uuid,
      NULLIF(elem->>'room_id', '')::uuid,
      NULLIF(elem->>'unavailability_id', '')::uuid,
      (elem->>'conflict_date')::date,
      elem->>'start_time',
      elem->>'end_time',
      elem->>'description'
    FROM jsonb_array_elements(p_conflicts) AS elem;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION persist_consultation_conflicts TO authenticated;
