-- ─── calendar_block_series ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_block_series (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id    uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  block_type      text NOT NULL CHECK (block_type IN ('TOTAL', 'PARTIAL')),
  description     text,
  start_date      date NOT NULL,
  end_date        date,
  recurrence_type text CHECK (recurrence_type IN ('by_count', 'by_date')),
  recurrence_days integer[],
  session_count   integer,
  start_time      text NOT NULL,
  end_time        text NOT NULL,
  active          boolean DEFAULT true,
  cancelled       boolean DEFAULT false,
  created_by      uuid,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── calendar_blocks ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id            uuid REFERENCES calendar_block_series(id) ON DELETE SET NULL,
  therapist_id         uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  block_type           text NOT NULL CHECK (block_type IN ('TOTAL', 'PARTIAL')),
  description          text,
  date                 date NOT NULL,
  start_time           text NOT NULL,
  end_time             text NOT NULL,
  series_original_date date,
  is_series_exception  boolean DEFAULT false,
  active               boolean DEFAULT true,
  cancelled            boolean DEFAULT false,
  cancelled_at         timestamptz,
  cancelled_by         uuid,
  created_by           uuid,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_therapist_id ON calendar_blocks(therapist_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_date         ON calendar_blocks(date);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_series_id    ON calendar_blocks(series_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_cancelled    ON calendar_blocks(cancelled);

-- ─── RLS — calendar_block_series ──────────────────────────────────────────────

ALTER TABLE calendar_block_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cbs_admin_all"      ON calendar_block_series;
DROP POLICY IF EXISTS "cbs_own_all"        ON calendar_block_series;
DROP POLICY IF EXISTS "cbs_team_select"    ON calendar_block_series;

CREATE POLICY "cbs_admin_all" ON calendar_block_series
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "cbs_own_all" ON calendar_block_series
  FOR ALL USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );

CREATE POLICY "cbs_team_select" ON calendar_block_series
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid() AND belongs_to_team = true)
    AND therapist_id IN (SELECT id FROM therapists WHERE belongs_to_team = true AND active = true)
  );

-- ─── RLS — calendar_blocks ────────────────────────────────────────────────────

ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cb_admin_all"    ON calendar_blocks;
DROP POLICY IF EXISTS "cb_own_all"      ON calendar_blocks;
DROP POLICY IF EXISTS "cb_team_select"  ON calendar_blocks;

CREATE POLICY "cb_admin_all" ON calendar_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "cb_own_all" ON calendar_blocks
  FOR ALL USING (
    therapist_id IN (SELECT id FROM therapists WHERE user_id = auth.uid())
  );

CREATE POLICY "cb_team_select" ON calendar_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM therapists WHERE user_id = auth.uid() AND belongs_to_team = true)
    AND therapist_id IN (SELECT id FROM therapists WHERE belongs_to_team = true AND active = true)
  );

GRANT SELECT, INSERT, UPDATE ON calendar_block_series TO authenticated;
GRANT SELECT, INSERT, UPDATE ON calendar_blocks        TO authenticated;

-- ─── consultation_conflicts — add calendar_block_id ───────────────────────────

ALTER TABLE consultation_conflicts
  ADD COLUMN IF NOT EXISTS calendar_block_id uuid REFERENCES calendar_blocks(id) ON DELETE SET NULL;

-- ─── Recreate persist_consultation_conflicts with calendar_block_id ───────────

CREATE OR REPLACE FUNCTION persist_consultation_conflicts(p_consultation_id uuid, p_conflicts jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM consultation_conflicts WHERE consultation_id = p_consultation_id;
  IF p_conflicts IS NOT NULL AND jsonb_array_length(p_conflicts) > 0 THEN
    INSERT INTO consultation_conflicts (
      consultation_id, conflict_type, related_consultation_id,
      therapist_id, room_id, calendar_block_id,
      conflict_date, start_time, end_time, description
    )
    SELECT
      p_consultation_id,
      elem->>'conflict_type',
      NULLIF(elem->>'related_consultation_id', '')::uuid,
      NULLIF(elem->>'therapist_id', '')::uuid,
      NULLIF(elem->>'room_id', '')::uuid,
      NULLIF(elem->>'calendar_block_id', '')::uuid,
      (elem->>'conflict_date')::date,
      elem->>'start_time',
      elem->>'end_time',
      elem->>'description'
    FROM jsonb_array_elements(p_conflicts) AS elem;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION persist_consultation_conflicts TO authenticated;

-- ─── Audit trigger — calendar_blocks ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_calendar_blocks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record          RECORD;
  v_action          text;
  v_user_id         uuid;
  v_user_email      text;
  v_user_name       text;
  v_resource_name   text;
  v_therapist_name  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record := OLD; v_action := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_record := NEW; v_action := 'INSERT';
  ELSE
    v_record := NEW; v_action := 'UPDATE';
  END IF;

  -- Resolve user from JWT
  BEGIN
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL; v_user_email := NULL;
  END;

  -- Resolve user_name
  BEGIN
    SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  IF v_user_name IS NULL THEN
    BEGIN
      v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'full_name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN
    BEGIN
      v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN v_user_name := v_user_email; END IF;

  -- Resolve therapist name
  BEGIN
    SELECT name INTO v_therapist_name FROM therapists WHERE id = v_record.therapist_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_therapist_name := NULL; END;

  -- Build resource_name
  v_resource_name :=
    'Terapeuta: ' || COALESCE(v_therapist_name, v_record.therapist_id::text)
    || ' | Data: ' || to_char(v_record.date, 'DD/MM/YYYY')
    || ' | ' || v_record.start_time || '–' || v_record.end_time
    || ' | Tipo: ' || v_record.block_type
    || CASE WHEN v_record.description IS NOT NULL THEN ' | ' || v_record.description ELSE '' END
    || CASE WHEN v_record.cancelled THEN ' | Cancelado' ELSE '' END;

  INSERT INTO audit_logs (action, resource_type, resource_id, resource_name, user_id, user_email, user_name)
  VALUES (v_action, 'calendar_blocks', v_record.id, v_resource_name, v_user_id, v_user_email, v_user_name);

  RETURN v_record;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_calendar_blocks ON calendar_blocks;
CREATE TRIGGER trg_audit_calendar_blocks
  AFTER INSERT OR UPDATE OR DELETE ON calendar_blocks
  FOR EACH ROW EXECUTE FUNCTION fn_audit_calendar_blocks();

-- ─── Audit trigger — calendar_block_series ───────────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_calendar_block_series()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record          RECORD;
  v_action          text;
  v_user_id         uuid;
  v_user_email      text;
  v_user_name       text;
  v_resource_name   text;
  v_therapist_name  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record := OLD; v_action := 'DELETE';
  ELSIF TG_OP = 'INSERT' THEN
    v_record := NEW; v_action := 'INSERT';
  ELSE
    v_record := NEW; v_action := 'UPDATE';
  END IF;

  -- Resolve user from JWT
  BEGIN
    v_user_id    := (current_setting('request.jwt.claims', true)::jsonb->>'sub')::uuid;
    v_user_email := current_setting('request.jwt.claims', true)::jsonb->>'email';
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL; v_user_email := NULL;
  END;

  -- Resolve user_name
  BEGIN
    SELECT name INTO v_user_name FROM therapists WHERE user_id = v_user_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  IF v_user_name IS NULL THEN
    BEGIN
      v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'full_name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN
    BEGIN
      v_user_name := (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'name');
    EXCEPTION WHEN OTHERS THEN v_user_name := NULL; END;
  END IF;
  IF v_user_name IS NULL THEN v_user_name := v_user_email; END IF;

  -- Resolve therapist name
  BEGIN
    SELECT name INTO v_therapist_name FROM therapists WHERE id = v_record.therapist_id LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_therapist_name := NULL; END;

  -- Build resource_name
  v_resource_name :=
    'Terapeuta: ' || COALESCE(v_therapist_name, v_record.therapist_id::text)
    || ' | Início: ' || to_char(v_record.start_date, 'DD/MM/YYYY')
    || ' | Tipo: ' || v_record.block_type;

  INSERT INTO audit_logs (action, resource_type, resource_id, resource_name, user_id, user_email, user_name)
  VALUES (v_action, 'calendar_block_series', v_record.id, v_resource_name, v_user_id, v_user_email, v_user_name);

  RETURN v_record;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_calendar_block_series ON calendar_block_series;
CREATE TRIGGER trg_audit_calendar_block_series
  AFTER INSERT OR UPDATE OR DELETE ON calendar_block_series
  FOR EACH ROW EXECUTE FUNCTION fn_audit_calendar_block_series();
