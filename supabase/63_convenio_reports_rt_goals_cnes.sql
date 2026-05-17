-- Migration 63: Campos adicionais no Relatório ao Convênio + CNES na empresa
--
-- convenio_reports:
--   responsible_therapist_id — RT que assina o PDF (pode diferir do emissor)
--   intervention_goals       — Objetivos de Intervenção do mês (pré-carregado na próxima geração)
--
-- company_settings:
--   cnes — Número do CNES da clínica (opcional; exibido no cabeçalho dos PDFs se preenchido)

ALTER TABLE convenio_reports
  ADD COLUMN IF NOT EXISTS responsible_therapist_id uuid REFERENCES therapists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intervention_goals text;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS cnes text;
