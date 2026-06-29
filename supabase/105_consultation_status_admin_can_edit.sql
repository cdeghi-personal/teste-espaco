-- Adiciona flag que controla se admin/admin-híbrido pode consultar e editar
-- atendimentos com este status. Default TRUE (comportamento atual preservado).
ALTER TABLE consultation_statuses
  ADD COLUMN admin_can_edit BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN consultation_statuses.admin_can_edit IS
  'TRUE = admin pode consultar e editar; FALSE = admin bloqueado de consultar e editar (sigilo clínico por status).';
