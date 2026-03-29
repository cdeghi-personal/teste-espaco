import { FiUsers, FiCalendar, FiClipboard, FiTrendingUp } from 'react-icons/fi'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { formatDateShort, isoToday } from '../../utils/dateUtils'
import { SPECIALTIES, PATIENT_STATUS } from '../../constants/specialties'

export default function DashboardPage() {
  const { user } = useAuth()
  const { patients, appointments, consultations, therapists } = useData()
  const today = isoToday()
  const isAdmin = user?.role === 'admin'

  // Role-based visibility
  const visiblePatients = isAdmin
    ? patients.filter(p => !p.deleted)
    : patients.filter(p => !p.deleted && (
        p.therapistId === user?.id ||
        (p.secondaryTherapistIds || []).includes(user?.id)
      ))

  const visibleAppointments = isAdmin
    ? appointments
    : appointments.filter(a => a.therapistId === user?.id)

  const visibleConsultations = isAdmin
    ? consultations
    : consultations.filter(c => c.therapistId === user?.id)

  const activePatients = visiblePatients.filter(p => p.status === 'active')
  const todayAppts = visibleAppointments.filter(a => a.date === today)

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const thisWeekAppts = visibleAppointments.filter(a => {
    const d = new Date(a.date)
    return d >= weekStart && d <= weekEnd
  })

  const thisMonth = now.toISOString().slice(0, 7)
  const monthConsultations = visibleConsultations.filter(c => c.createdAt?.startsWith(thisMonth))

  const stats = [
    { icon: FiUsers, label: 'Pacientes Ativos', value: activePatients.length, color: 'text-brand-blue', bg: 'bg-blue-50' },
    { icon: FiCalendar, label: 'Consultas Hoje', value: todayAppts.length, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: FiTrendingUp, label: 'Esta Semana', value: thisWeekAppts.length, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: FiClipboard, label: 'Registros no Mês', value: monthConsultations.length, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  const upcomingAppts = visibleAppointments
    .filter(a => a.date >= today && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 8)

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        {!isAdmin && (
          <p className="text-xs text-brand-blue mt-1 font-medium">
            Exibindo apenas seus pacientes e consultas
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Próximas Consultas</h2>
          <span className="text-xs text-gray-500">{upcomingAppts.length} agendamento(s)</span>
        </div>
        {upcomingAppts.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">Nenhuma consulta agendada</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingAppts.map((appt) => {
              const patient = getPatient(appt.patientId)
              const therapist = getTherapist(appt.therapistId)
              return (
                <div key={appt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-[80px] text-center">
                    <div className="text-xs text-gray-500">{formatDateShort(appt.date)}</div>
                    <div className="font-semibold text-gray-900 text-sm">{appt.startTime}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{patient?.fullName || '—'}</div>
                    <div className="text-xs text-gray-500 truncate">{therapist?.name} • {appt.room}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge specialty={appt.specialty} />
                    <Badge status={appt.status} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Specialty breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(SPECIALTIES).map(([key, spec]) => {
          const count = visiblePatients.filter(p => p.specialties?.includes(key) && p.status === 'active').length
          return (
            <div key={key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium mb-3 ${spec.color}`}>
                {spec.label}
              </div>
              <div className="text-xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">paciente(s) ativo(s)</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
