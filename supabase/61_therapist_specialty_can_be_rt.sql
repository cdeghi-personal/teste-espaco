-- Migration 61: Adiciona flag can_be_rt em therapist_specialties
-- Indica se o terapeuta pode atuar como Responsável Técnico (RT) naquela especialidade.
-- Usado na tela de Relatório ao Convênio para determinar quem assina o documento.

ALTER TABLE therapist_specialties
  ADD COLUMN IF NOT EXISTS can_be_rt boolean NOT NULL DEFAULT false;
