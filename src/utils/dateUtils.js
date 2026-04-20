import { format, parseISO, differenceInYears, differenceInMonths, addDays, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDateBR(isoDate) {
  if (!isoDate) return ''
  try {
    return format(parseISO(isoDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function formatDateShort(isoDate) {
  if (!isoDate) return ''
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy')
  } catch {
    return isoDate
  }
}

export function formatDateTimeShort(isoDate) {
  if (!isoDate) return ''
  try {
    return format(parseISO(isoDate), "dd/MM/yyyy 'às' HH:mm")
  } catch {
    return isoDate
  }
}

export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return ''
  try {
    const dob = parseISO(dateOfBirth)
    const now = new Date()
    const years = differenceInYears(now, dob)
    if (years === 0) {
      const months = differenceInMonths(now, dob)
      return `${months} ${months === 1 ? 'mês' : 'meses'}`
    }
    const months = differenceInMonths(now, dob) % 12
    if (months === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
    return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`
  } catch {
    return ''
  }
}

export function calculateAgeYears(dateOfBirth) {
  if (!dateOfBirth) return null
  try {
    return differenceInYears(new Date(), parseISO(dateOfBirth))
  } catch {
    return null
  }
}

export function getWeekDays(referenceDate = new Date()) {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 })
  return Array.from({ length: 5 }, (_, i) => addDays(start, i))
}

export function formatWeekDay(date) {
  return format(date, "EEE dd/MM", { locale: ptBR })
}

export function isoToday() {
  return new Date().toISOString().split('T')[0]
}

export function formatMonthYear(date) {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR })
}
