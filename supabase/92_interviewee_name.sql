-- Migration 92: add interviewee_name to consultations and consultation_series
-- Stores the name(s) of the person(s) being interviewed (required for INTERVIEW events)

ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS interviewee_name TEXT;

ALTER TABLE public.consultation_series
  ADD COLUMN IF NOT EXISTS interviewee_name TEXT;
