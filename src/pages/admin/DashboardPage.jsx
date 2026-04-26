import { FiUsers, FiCalendar, FiClipboard, FiTrendingUp, FiMessageSquare, FiArrowRight, FiBell, FiLifeBuoy } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { formatDateShort } from '../../utils/dateUtils'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants/routes'

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
  const { patients, consultations, therapists, rooms, patientStatuses, specialtiesData } = useData()

  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const nowTime = format(now, 'HH:mm')
  const thisMonth = format(now, 'yyyy-MM')

  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diffToMonday)
  const weekStartIso = format(weekStart, 'yyyy-MM-dd')
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekEndIso = format(weekEnd, 'yyyy-MM-dd')

  const isAdmin = user?.role === 'admin'
  const isSupportAdmin = isAdmin && !user?.id

  const [newLeadsCount, setNewLeadsCount] = useState(0)
  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('contact_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'novo')
      .then(({ count }) => setNewLeadsCount(count || 0))
  }, [isAdmin])

  // Card âmbar: para terapeutas E admin que também são terapeutas
  const [unreadSupportCount, setUnreadSupportCount] = useState(0)
  useEffect(() => {
    if (isSupportAdmin || !user?.authId) return
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('nova_resposta', true)
      .eq('created_by_id', user.authId)
      .then(({ count }) => setUnreadSupportCount(count || 0))
  }, [isSupportAdmin, user?.authId])

  // Banners de gestão: apenas para admin puro
  const [novoSupportCount, setNovoSupportCount] = useState(0)
  const [reprovadoSupportCount, setReprovadoSupportCount] = useState(0)
  useEffect(() => {
    if (!isSupportAdmin) return
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'novo')
      .then(({ count }) => setNovoSupportCount(count || 0))
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'reprovado_usuario')
      .then(({ count }) => setReprovadoSupportCount(count || 0))
  }, [isSupportAdmin])

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
    { icon: FiUsers,      label: 'Pacientes Ativos',  value: activePatients.length,       color: 'text-brand-blue',  bg: 'bg-blue-50'   },
    { icon: FiCalendar,   label: 'Atendimentos Hoje', value: todayConsultations.length,    color: 'text-green-600',   bg: 'bg-green-50'  },
    { icon: FiTrendingUp, label: 'Esta Semana',        value: thisWeekConsultations.length, color: 'text-purple-600',  bg: 'bg-purple-50' },
    { icon: FiClipboard,  label: 'Registros no Mês',  value: monthConsultations.length,    color: 'text-orange-600',  bg: 'bg-orange-50' },
  ]

  // Próximos atendimentos: data futura OU hoje com horário >= agora
  const upcomingConsultations = visibleConsultations
    .filter(c => {
      if (c.date > today) return true
      if (c.date === today) return !c.time || c.time >= nowTime
      return false
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5)

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getRoom(id) { return rooms.find(r => r.id === id) }

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

      {/* Alerta de novos contatos — apenas admin */}
      {isAdmin && newLeadsCount > 0 && (
        <Link
          to={ROUTES.CONTACT_LEADS}
          className="flex items-center gap-3 bg-red-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-red-600 transition-colors"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <FiMessageSquare size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">
              {newLeadsCount} {newLeadsCount === 1 ? 'nova mensagem de contato' : 'novas mensagens de contato'}
            </div>
            <div className="text-xs text-red-100">Clique para visualizar e tratar</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}

      {/* Alerta de chamados novos de suporte — apenas admin puro */}
      {isSupportAdmin && novoSupportCount > 0 && (
        <Link
          to={ROUTES.SUPPORT}
          className="flex items-center gap-3 bg-red-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-red-600 transition-colors"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <FiLifeBuoy size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">
              {novoSupportCount === 1 ? '1 novo chamado de suporte' : `${novoSupportCount} novos chamados de suporte`}
            </div>
            <div className="text-xs text-red-100">Clique para visualizar e responder</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}

      {/* Alerta de chamados reprovados — apenas admin puro */}
      {isSupportAdmin && reprovadoSupportCount > 0 && (
        <Link
          to={ROUTES.SUPPORT}
          className="flex items-center gap-3 bg-orange-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-orange-600 transition-colors"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <FiBell size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">
              {reprovadoSupportCount === 1 ? '1 chamado reprovado pelo usuário' : `${reprovadoSupportCount} chamados reprovados pelo usuário`}
            </div>
            <div className="text-xs text-orange-100">Clique para visualizar e responder</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}

      {/* Alerta de respostas de suporte — terapeuta e admin+terapeuta */}
      {!isSupportAdmin && unreadSupportCount > 0 && (
        <Link
          to={ROUTES.SUPPORT}
          className="flex items-center gap-3 bg-amber-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-amber-600 transition-colors"
        >
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <FiBell size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">
              {unreadSupportCount === 1 ? '1 chamado com nova resposta' : `${unreadSupportCount} chamados com novas respostas`}
            </div>
            <div className="text-xs text-amber-100">Clique para visualizar</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}

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

      {/* Próximos Atendimentos — formato tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm md:text-base">Próximos Atendimentos</h2>
          <span className="text-xs text-gray-400">{upcomingConsultations.length}</span>
        </div>
        {upcomingConsultations.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum atendimento agendado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {upcomingConsultations.map(c => {
                  const patient = getPatient(c.patientId)
                  const therapist = getTherapist(c.therapistId)
                  const room = getRoom(c.roomId)
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 md:px-6 py-3 text-gray-700 whitespace-nowrap">{formatDateShort(c.date)}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap font-medium">{c.time || '—'}</td>
                      <td className="px-3 py-3 text-gray-900 font-medium max-w-[140px] truncate">{patient?.fullName || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 hidden sm:table-cell max-w-[120px] truncate">{therapist?.name || '—'}</td>
                      <td className="px-3 py-3 hidden md:table-cell"><Badge specialty={c.specialty} /></td>
                      <td className="px-3 md:px-6 py-3 text-gray-500 hidden lg:table-cell">{room?.name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Perfil dos Pacientes */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm md:text-base mb-2">Perfil dos Pacientes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
          {activeSpecialties.map(spec => {
            const count = visiblePatients.filter(p => p.specialties?.includes(spec.key)).length
            const bg = spec.color || '#e5e7eb'
            const textColor = textColorForBg(bg)
            return (
              <div key={spec.key} className="rounded-xl px-2 py-2.5 text-center border border-gray-100 shadow-sm" style={{ backgroundColor: bg }}>
                <div className="text-lg font-bold" style={{ color: textColor }}>{count}</div>
                <div className="text-xs font-medium leading-tight mt-0.5" style={{ color: textColor, opacity: 0.85 }}>{spec.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
