-- Drop the old model
DROP POLICY IF EXISTS "unavail_admin_all" ON therapist_unavailabilities;
DROP POLICY IF EXISTS "unavail_own_select" ON therapist_unavailabilities;
DROP POLICY IF EXISTS "unavail_team_select" ON therapist_unavailabilities;
ALTER TABLE consultation_conflicts DROP COLUMN IF EXISTS unavailability_id;
DROP TABLE IF EXISTS therapist_unavailabilities CASCADE;
