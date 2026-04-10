import { FiUsers, FiCalendar, FiClipboard, FiTrendingUp } from 'react-icons/fi'
import { format } from 'date-fns'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { formatDateShort } from '../../utils/dateUtils'

function textColorForBg(hex) {
  if (!hex) return '#1f2937'
  const c = hex.replace('#', '')
  if (c.length < 6) return '#1f2937'
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#1f2937' : '#ffffff'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { patients, consultations, therapists, patientStatuses, specialtiesData } = useData()

  const now = new Date()
  // Usa horário local (não UTC) para evitar erro de fuso horário
  const today = format(now, 'yyyy-MM-dd')
  const thisMonth = format(now, 'yyyy-MM')

  // Início e fim da semana (seg–dom) em horário local
  const dayOfWeek = now.getDay() // 0=dom
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diffToMonday)
  const weekStartIso = format(weekStart, 'yyyy-MM-dd')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekEndIso = format(weekEnd, 'yyyy-MM-dd')

  const isAdmin = user?.role === 'admin'

  const visiblePatients = isAdmin || user?.belongsToTeam
    ? patients.filter(p => !p.deleted)
    : patients.filter(p => !p.deleted && (p.therapistId === user?.id || (p.involvedTherapistIds || []).includes(user?.id)))

  const visibleConsultations = isAdmin || user?.belongsToTeam
    ? consultations
    : consultations.filter(c => c.therapistId === user?.id)

  const activeStatusId = patientStatuses.find(s => s.name?.toLowerCase().includes('ativo'))?.id
  const activePatients = activeStatusId
    ? visiblePatients.filter(p => p.statusId === activeStatusId)
    : visiblePatients

  const todayConsultations = visibleConsultations.filter(c => c.date === today)
  const thisWeekConsultations = visibleConsultations.filter(c => c.date >= weekStartIso && c.date <= weekEndIso)
  const monthConsultations = visibleConsultations.filter(c => c.date?.startsWith(thisMonth))

  const stats = [
    { icon: FiUsers,     label: 'Pacientes Ativos',   value: activePatients.length,        color: 'text-brand-blue',  bg: 'bg-blue-50'   },
    { icon: FiCalendar,  label: 'Atendimentos Hoje',   value: todayConsultations.length,     color: 'text-green-600',   bg: 'bg-green-50'  },
    { icon: FiTrendingUp,label: 'Esta Semana',         value: thisWeekConsultations.length,  color: 'text-purple-600',  bg: 'bg-purple-50' },
    { icon: FiClipboard, label: 'Registros no Mês',    value: monthConsultations.length,     color: 'text-orange-600',  bg: 'bg-orange-50' },
  ]

  const upcomingConsultations = visibleConsultations
    .filter(c => c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 8)

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {!isAdmin && !user?.belongsToTeam && (
          <p className="text-xs text-brand-blue mt-1 font-medium">
            Exibindo apenas seus pacientes e consultas
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-3 md:p-5 border border-gray-100 shadow-sm">
            <div className={`w-8 h-8 md:w-10 md:h-10 ${bg} rounded-xl flex items-center justify-center mb-2 md:mb-3`}>
              <Icon size={16} className={color} />
            </div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Próximos Atendimentos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-3 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Próximos Atendimentos</h2>
          <span className="text-xs text-gray-500">{upcomingConsultations.length}</span>
        </div>
        {upcomingConsultations.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum atendimento agendado</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingConsultations.map((c) => {
              const patient = getPatient(c.patientId)
              const therapist = getTherapist(c.therapistId)
              return (
                <div key={c.id} className="px-3 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-[60px] md:min-w-[80px] text-center shrink-0">
                    <div className="text-xs text-gray-500">{formatDateShort(c.date)}</div>
                    <div className="font-semibold text-gray-900 text-sm">{c.time || '—'}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{patient?.fullName || '—'}</div>
                    <div className="text-xs text-gray-500 truncate">{therapist?.name}</div>
                  </div>
                  <div className="shrink-0">
                    <Badge specialty={c.specialty} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Perfil dos Pacientes por Especialidade */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm md:text-base mb-3">Perfil dos Pacientes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          {activeSpecialties.map(spec => {
            const count = visiblePatients.filter(p => p.specialties?.includes(spec.key)).length
            const bg = spec.color || '#e5e7eb'
            const textColor = textColorForBg(bg)
            return (
              <div key={spec.key} className="rounded-2xl p-3 md:p-5 border border-gray-100 shadow-sm" style={{ backgroundColor: bg }}>
                <div className="text-xs font-semibold mb-2 md:mb-3 opacity-80" style={{ color: textColor }}>
                  {spec.label}
                </div>
                <div className="text-xl font-bold" style={{ color: textColor }}>{count}</div>
                <div className="text-xs mt-0.5 opacity-70" style={{ color: textColor }}>paciente(s)</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
