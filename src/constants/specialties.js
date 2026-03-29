export const SPECIALTIES = {
  FISIOTERAPIA: {
    label: 'Fisioterapia',
    color: 'bg-green-100 text-green-800',
    bgColor: '#dcfce7',
    textColor: '#166534',
    calendarColor: '#16a34a',
    description: 'Desenvolvimento motor e reabilitação física',
  },
  FONOAUDIOLOGIA: {
    label: 'Fonoaudiologia',
    color: 'bg-purple-100 text-purple-800',
    bgColor: '#f3e8ff',
    textColor: '#6b21a8',
    calendarColor: '#9333ea',
    description: 'Comunicação, fala e linguagem',
  },
  TO: {
    label: 'Terapia Ocupacional',
    color: 'bg-orange-100 text-orange-800',
    bgColor: '#ffedd5',
    textColor: '#9a3412',
    calendarColor: '#ea580c',
    description: 'Independência nas atividades diárias',
  },
  PSICOLOGIA: {
    label: 'Psicologia',
    color: 'bg-blue-100 text-blue-800',
    bgColor: '#dbeafe',
    textColor: '#1e40af',
    calendarColor: '#2563eb',
    description: 'Saúde mental e desenvolvimento emocional',
  },
}

export const SPECIALTY_LIST = Object.keys(SPECIALTIES)

export const CONDITIONS = [
  'TEA (Transtorno do Espectro Autista)',
  'TDAH (Transtorno do Déficit de Atenção)',
  'Síndrome de Down',
  'Paralisia Cerebral',
  'Atraso no Desenvolvimento',
  'Dislexia',
  'Discalculia',
  'Transtorno de Ansiedade',
  'Síndrome de Williams',
  'Síndrome de Angelman',
  'Outros',
]

export const APPOINTMENT_STATUS = {
  scheduled:  { label: 'Agendado',  color: 'bg-blue-100 text-blue-700'   },
  confirmed:  { label: 'Confirmado',color: 'bg-green-100 text-green-700' },
  completed:  { label: 'Realizado', color: 'bg-gray-100 text-gray-700'   },
  cancelled:  { label: 'Cancelado', color: 'bg-red-100 text-red-700'     },
  no_show:    { label: 'Faltou',    color: 'bg-yellow-100 text-yellow-700'},
}

export const PATIENT_STATUS = {
  active:       { label: 'Ativo',         color: 'bg-green-100 text-green-700' },
  inactive:     { label: 'Inativo',       color: 'bg-gray-100 text-gray-600'   },
  waiting_list: { label: 'Lista de Espera', color: 'bg-yellow-100 text-yellow-700' },
}

export const SESSION_QUALITY = {
  otima:     { label: 'Ótima',    color: 'bg-emerald-100 text-emerald-700' },
  good:      { label: 'Boa',      color: 'bg-green-100 text-green-700' },
  regular:   { label: 'Regular',  color: 'bg-yellow-100 text-yellow-700' },
  difficult: { label: 'Difícil',  color: 'bg-red-100 text-red-700' },
}
