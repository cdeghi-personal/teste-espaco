-- Adiciona suporte a Entrevistas na tabela consultations (e consultation_series).
-- event_type: SESSION (padrão) | INTERVIEW
-- interview_format: PRESENTIAL | REMOTE (somente para entrevistas)
-- meeting_platform: GOOGLE_MEET | TEAMS | ZOOM | OTHER (somente para entrevistas remotas)
-- meeting_link: URL da reunião (somente para entrevistas remotas)

-- ── consultations ──────────────────────────────────────────────────────────────
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'SESSION'
    CHECK (event_type IN ('SESSION', 'INTERVIEW')),
  ADD COLUMN IF NOT EXISTS interview_format TEXT
    CHECK (interview_format IS NULL OR interview_format IN ('PRESENTIAL', 'REMOTE')),
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT
    CHECK (meeting_platform IS NULL OR meeting_platform IN ('GOOGLE_MEET', 'TEAMS', 'ZOOM', 'OTHER')),
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- ── consultation_series ────────────────────────────────────────────────────────
ALTER TABLE public.consultation_series
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'SESSION'
    CHECK (event_type IN ('SESSION', 'INTERVIEW')),
  ADD COLUMN IF NOT EXISTS interview_format TEXT
    CHECK (interview_format IS NULL OR interview_format IN ('PRESENTIAL', 'REMOTE')),
  ADD COLUMN IF NOT EXISTS meeting_platform TEXT
    CHECK (meeting_platform IS NULL OR meeting_platform IN ('GOOGLE_MEET', 'TEAMS', 'ZOOM', 'OTHER')),
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;
