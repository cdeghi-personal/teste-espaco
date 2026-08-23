-- 111_room_allows_multiple_patients.sql
-- Adiciona flag que permite múltiplos atendimentos simultâneos na mesma sala
-- sem gerar conflito ROOM_OVERLAP (ex.: salas de grupo/espaço compartilhado).
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS allows_multiple_patients boolean NOT NULL DEFAULT false;
