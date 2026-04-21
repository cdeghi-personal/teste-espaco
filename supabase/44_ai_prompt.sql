-- 44_ai_prompt.sql
-- Adiciona campo ai_system_prompt em company_settings para customizar o comportamento da IA

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS ai_system_prompt TEXT;