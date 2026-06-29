/**
 * Helpers centralizados de permissão de acesso ao detalhe clínico de atendimentos.
 *
 * Regra fundamental: o detalhe clínico é sigiloso e só pode ser acessado por
 * quem participou diretamente do atendimento (terapeuta principal ou adicional).
 * Admin tem permissão administrativa de exclusão, mas NÃO de leitura clínica.
 */

export function isConsultationPrimaryTherapist(user, consultation) {
  return !!(user?.id && consultation?.therapistId === user.id)
}

export function isConsultationParticipant(user, consultation) {
  if (!user?.id) return false
  return (
    isConsultationPrimaryTherapist(user, consultation) ||
    (consultation?.consultationTherapists || []).some(t => t.therapistId === user.id)
  )
}

// Pode abrir modal/detalhe clínico (view ou edit)
export function canViewConsultationDetails(user, consultation) {
  return isConsultationParticipant(user, consultation)
}

// Pode editar o conteúdo clínico — apenas terapeuta principal
export function canEditConsultationDetails(user, consultation) {
  return isConsultationPrimaryTherapist(user, consultation)
}

// Admin pode editar qualquer consulta cujo status NÃO seja "realizada"
// Terapeutas seguem a regra de primário
export function canEditConsultation(user, consultation, consultationStatuses) {
  if (user?.role === 'admin') {
    const status = (consultationStatuses || []).find(s => s.id === consultation?.consultationStatusId)
    const isRealizada = status?.name?.toLowerCase().includes('realizada') ?? false
    return !isRealizada
  }
  return canEditConsultationDetails(user, consultation)
}
