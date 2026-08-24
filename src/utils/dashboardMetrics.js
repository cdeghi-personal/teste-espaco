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

// Próxima meta (a primeira faixa acima da faixa atual) — null quando já em 100%.
function nextGoalPercent(rate) {
  if (rate >= 100) return null
  if (rate >= 95) return 100
  if (rate >= 85) return 95
  return 85
}

// Calcula quantos preenchimentos faltam para a próxima meta, sem prometer o
// impossível: se `pending` não for suficiente para alcançar matematicamente a
// próxima faixa, não afirma que a meta é atingível — sinaliza `achievable: false`
// e a UI deve usar uma mensagem genérica em vez do valor de meta.
export function computeFillProjection({ completed, total, pending }) {
  if (!total) return { rate: null, nextGoalPct: null, needed: 0, achievable: true }
  const rate = Math.round((completed / total) * 100)
  const nextGoalPct = nextGoalPercent(rate)
  if (nextGoalPct == null || pending <= 0) {
    return { rate, nextGoalPct: null, needed: 0, achievable: true }
  }
  const rawNeeded = Math.max(0, Math.ceil((nextGoalPct / 100) * total) - completed)
  const needed = Math.min(rawNeeded, pending)
  return { rate, nextGoalPct, needed, achievable: needed >= rawNeeded }
}

// Ordenação única do ranking: maior Taxa > maior preenchidos > maior Total > nome (pt-BR).
export function compareTherapistPerformance(a, b) {
  if (b.rate !== a.rate) return b.rate - a.rate
  if (b.completed !== a.completed) return b.completed - a.completed
  if (b.total !== a.total) return b.total - a.total
  return (a.therapistName || '').localeCompare(b.therapistName || '', 'pt-BR', { sensitivity: 'base' })
}
