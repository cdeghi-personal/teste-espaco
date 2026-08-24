// Helpers puros para os painéis mensais do Dashboard (Admin + Terapeuta).
// Mantidos num único arquivo para que a regra do 3º dia útil, as faixas de
// desempenho e a ordenação do ranking tenham uma única fonte, reaproveitada
// pelas duas visões do Dashboard.

// Regra do 3º dia útil: até o final do 3º dia útil do mês corrente (inclusive),
// os painéis mensais mostram o mês anterior; a partir do 4º dia útil, mostram
// o mês corrente. Sábados e domingos não contam como dia útil. Feriados ainda
// não são considerados (limitação conhecida).
export function getReferenceMonth(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const todayDate = now.getDate()

  let businessDaysElapsed = 0
  for (let d = 1; d <= todayDate; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow !== 0 && dow !== 6) businessDaysElapsed++
  }

  const useCurrentMonth = businessDaysElapsed >= 4
  const refDate = useCurrentMonth ? new Date(year, month, 1) : new Date(year, month - 1, 1)
  const refYear = refDate.getFullYear()
  const refMonth = refDate.getMonth() + 1 // 1-indexed

  return {
    year: refYear,
    month: refMonth,
    monthKey: `${refYear}-${String(refMonth).padStart(2, '0')}`,
    label: refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  }
}

// Faixas de desempenho — constantes no frontend, tom sempre positivo/acionável.
const TIERS = [
  { key: 'excellence', min: 100, label: 'Excelência', colorClasses: 'bg-green-100 text-green-700 border-green-200', barColor: '#16a34a',
    message: 'Excelente! Todos os registros do período estão preenchidos.' },
  { key: 'goal_met', min: 95, label: 'Meta alcançada', colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200', barColor: '#34d399',
    message: 'Meta alcançada. Faltam poucos registros para chegar a 100%.' },
  { key: 'almost', min: 85, label: 'Quase lá', colorClasses: 'bg-amber-50 text-amber-700 border-amber-200', barColor: '#f59e0b',
    message: 'Você está quase lá. Regularize as pendências para alcançar a meta.' },
  { key: 'attention', min: 0, label: 'Atenção às pendências', colorClasses: 'bg-red-50 text-red-600 border-red-200', barColor: '#ef4444',
    message: 'Existem registros aguardando preenchimento. Reserve alguns minutos para atualizá-los.' },
]

export function getPerformanceTier(rate, hasEligible = true) {
  if (!hasEligible) {
    return { key: 'none', label: null, colorClasses: 'bg-gray-50 text-gray-500 border-gray-200', barColor: '#d1d5db',
      message: 'Você ainda não possui atendimentos elegíveis neste período.' }
  }
  return TIERS.find(t => rate >= t.min)
}

// Quantos preenchimentos faltam para entrar no pódio (top 3 do ranking),
// não para uma faixa arbitrária de 85/95% — a meta real é sempre 100%, o
// pódio é só o próximo marco acionável no caminho até lá. `rankingSorted` é
// a lista completa já ordenada (mesma usada na tabela); simula
// `completed + x` (x de 1 até `pending`) substituindo o próprio terapeuta
// nessa lista e recalculando a posição com o mesmo `compareTherapistPerformance`
// do ranking — então a posição prevista (`targetPosition`) é sempre exata,
// nunca uma suposição de "pelo menos 3º". Sem prometer o impossível: se nem
// preenchendo todas as pendências (`pending`) bastar pro pódio, `achievable`
// fica false.
export function computePodiumProjection({ completed, total, pending, therapistId, rankingSorted = [] }) {
  if (!total) return { rate: null, needed: 0, achievable: true, onPodium: false, targetRate: null, targetPosition: null }
  const rate = Math.round((completed / total) * 100)
  const others = rankingSorted.filter(t => t.therapistId !== therapistId)

  function positionFor(candidate) {
    const ahead = others.filter(o => compareTherapistPerformance(o, candidate) < 0).length
    return ahead + 1
  }

  const myPosition = positionFor({ rate, completed, total })
  if (myPosition <= 3) {
    return { rate, needed: 0, achievable: true, onPodium: true, targetRate: null, targetPosition: myPosition }
  }

  const maxFill = Math.max(0, pending || 0)
  for (let x = 1; x <= maxFill; x++) {
    const candidateCompleted = completed + x
    const candidateRate = Math.round((candidateCompleted / total) * 100)
    const candidate = { rate: candidateRate, completed: candidateCompleted, total }
    const targetPosition = positionFor(candidate)
    if (targetPosition <= 3) {
      return { rate, needed: x, achievable: true, onPodium: false, targetRate: candidateRate, targetPosition }
    }
  }
  return { rate, needed: maxFill, achievable: false, onPodium: false, targetRate: null, targetPosition: null }
}

// Ordenação única do ranking: maior Taxa > maior preenchidos > maior Total > nome (pt-BR).
export function compareTherapistPerformance(a, b) {
  if (b.rate !== a.rate) return b.rate - a.rate
  if (b.completed !== a.completed) return b.completed - a.completed
  if (b.total !== a.total) return b.total - a.total
  return (a.therapistName || '').localeCompare(b.therapistName || '', 'pt-BR', { sensitivity: 'base' })
}
