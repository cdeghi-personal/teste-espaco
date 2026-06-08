import { useState, useMemo } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight, FiSearch, FiCalendar, FiEdit2, FiTrash2, FiRepeat, FiSlash, FiVideo, FiMapPin, FiExternalLink } from 'react-icons/fi'
import HelpButton from '../../../components/ui/HelpButton'
import { addDays, startOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import ConsultationFormModal from '../consultations/ConsultationFormModal'
import SeriesFormModal from '../consultations/SeriesFormModal'
import CalendarBlockFormModal from './CalendarBlockFormModal'
import CalendarBlockHistoryModal from './CalendarBlockHistoryModal'
import { formatMonthYear } from '../../../utils/dateUtils'
import { detectConflicts, getCalendarBlockConflicts, buildConflictTooltip } from '../../../utils/conflictUtils'

function textColorForBg(hex) {
  if (!hex) return 'white'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#1f2937' : '#ffffff'
}

function fmtTime(t) {
  if (!t) return '—'
  return t.slice(0, 5)
}

function shortName(fullName) {
  if (!fullName) return '—'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 2) return fullName
  return `${parts[0]} ${parts[parts.length - 1]}`
}

function formatDay(date) {
  return format(date, "EEE dd/MM", { locale: ptBR })
}

function BlockCard({ block, therapist, onEdit, onView, isAdmin, userId, conflictTooltip }) {
  const canEdit = isAdmin || userId === block.therapistId
  const isRigid = block.blockType === 'RIGID'
  const cardCls = isRigid
    ? 'bg-gray-200 border-gray-400 text-gray-800'
    : 'bg-gray-100 border-gray-300 text-gray-600'
  const chipCls = isRigid
    ? 'bg-gray-700 text-white'
    : 'bg-gray-400 text-white'
  return (
    <div className={`rounded-lg px-2 py-1.5 text-xs border group relative cursor-pointer ${cardCls}`} onDoubleClick={onView}>
      <div className="flex items-baseline gap-1 min-w-0">
        <span className="font-bold shrink-0">{block.startTime?.slice(0, 5)}</span>
        <span className="opacity-60">–</span>
        <span className="font-bold shrink-0">{block.endTime?.slice(0, 5)}</span>
        {block.description && <span className="truncate ml-1 opacity-75">{block.description}</span>}
      </div>
      <div className="flex items-center gap-1 mt-0.5 min-w-0" style={{ fontSize: '10px' }}>
        {therapist?.color && (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: therapist.color }} />
        )}
        <span className="truncate flex-1">{therapist?.name || '—'}</span>
        {block.seriesId && !block.isSeriesException && (
          <span title="Bloqueio recorrente" className="shrink-0 text-indigo-400">
            <FiRepeat size={9} />
          </span>
        )}
        {block.seriesId && block.isSeriesException && (
          <span title="Ocorrência de bloqueio alterada individualmente" className="shrink-0 text-amber-500 flex items-center gap-px">
            <FiRepeat size={9} /><span style={{ fontSize: '8px' }}>!</span>
          </span>
        )}
        <span className={`px-1 rounded shrink-0 ${chipCls}`} style={{ fontSize: '9px' }}>
          {isRigid ? 'Rígido' : 'Flex'}
        </span>
        {conflictTooltip && (
          <span title={conflictTooltip} className="shrink-0 px-0.5 rounded text-red-600 bg-red-100" style={{ fontSize: '9px' }}>⚠</span>
        )}
      </div>
      {canEdit && (
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
          <button onClick={onEdit} className="w-5 h-5 rounded flex items-center justify-center bg-gray-300 hover:bg-gray-400 transition-colors">
            <FiEdit2 size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function AgendaPage() {
  const { consultations, patients, rooms, therapists, calendarBlocks, logAudit, deleteConsultation, deleteConsultationSeries } = useData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [weekRef, setWeekRef] = useState(new Date())
  const [search, setSearch] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [viewItem, setViewItem] = useState(null)   // consulta em modo visualização
  const [viewBlock, setViewBlock] = useState(null) // bloqueio em modo visualização
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [editBlock, setEditBlock] = useState(null)
  const [showBlockHistory, setShowBlockHistory] = useState(false)
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const d = new Date().getDay()
    // 0=Dom→5(FDS), 1=Seg→0, ..., 5=Sex→4, 6=Sáb→5(FDS)
    return (d === 0 || d === 6) ? 5 : d - 1
  })
  const [myAgenda, setMyAgenda] = useState(user?.role !== 'admin')
  const [seriesDeleteConfirm, setSeriesDeleteConfirm] = useState(null) // { id, seriesId, date }
  // Toggle visível para: admin+terapeuta OU terapeuta da equipe (que pode ver agenda dos colegas)
  // Não-equipe não tem o que filtrar — só vê a própria agenda
  const canFilterMine = !!user?.id && (user?.role === 'admin' || user?.belongsToTeam)

  const today = format(new Date(), 'yyyy-MM-dd')

  // Seg a Sex + Sáb + Dom
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 })
  const weekdays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const saturday = addDays(weekStart, 5)
  const sunday = addDays(weekStart, 6)

  const isAdminOrTeam = user?.role === 'admin' || user?.belongsToTeam

  function handleDelete(item) {
    if (item.seriesId && user?.role === 'admin') {
      setSeriesDeleteConfirm({ id: item.id, seriesId: item.seriesId, date: item.date })
      return
    }
    if (confirm('Excluir este registro de atendimento?')) deleteConsultation(item.id)
  }

  // Mapa centralizado de conflitos — recalculado quando dados ou semana mudam
  const conflictMap = useMemo(() => {
    const ws = startOfWeek(weekRef, { weekStartsOn: 1 })
    const weekIsos = Array.from({ length: 7 }, (_, i) => format(addDays(ws, i), 'yyyy-MM-dd'))
    const map = {}
    const activeCBlocks = (calendarBlocks || []).filter(b => !b.cancelled && b.active !== false)

    // Conflitos de atendimentos na semana visível
    const weekConss = consultations.filter(c => weekIsos.includes(c.date))
    for (const c of weekConss) {
      const cfs = detectConflicts(c, consultations, activeCBlocks)
      if (cfs.length > 0) {
        map[c.id] = cfs
        console.log('[CONFLICT_RENDER_DEBUG]', { eventType: 'consultation', eventId: c.id, conflicts: cfs, hasConflict: true })
      }
    }

    // Conflitos de bloqueios na semana visível
    const weekBlocks = activeCBlocks.filter(b => weekIsos.includes(b.date))
    for (const b of weekBlocks) {
      const cfs = getCalendarBlockConflicts(b, consultations, activeCBlocks)
      if (cfs.length > 0) {
        map[b.id] = cfs
        console.log('[CONFLICT_RENDER_DEBUG]', { eventType: 'block', eventId: b.id, conflicts: cfs, hasConflict: true })
      }
    }
    return map
  }, [consultations, calendarBlocks, weekRef]) // eslint-disable-line react-hooks/exhaustive-deps

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d) }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d) }

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getRoom(id) { return rooms.find(r => r.id === id) }

  const activeRooms = rooms.filter(r => r.active !== false)
  const activeTherapists = therapists.filter(t => t.active !== false)

  function isTeamTherapist(therapistId) {
    return getTherapist(therapistId)?.belongsToTeam === true
  }

  function filterConsultation(c, iso) {
    if (c.date !== iso) return false
    if (!user) return false
    if (myAgenda && user?.id) {
      if (c.therapistId !== user.id && !(c.consultationTherapists || []).some(t => t.therapistId === user.id)) return false
    }
    if (isTeamTherapist(c.therapistId)) {
      // Consultas da equipe: restritas a admin, membros da equipe ou próprio terapeuta
      if (user.role !== 'admin' && !user.belongsToTeam && c.therapistId !== user.id) return false
      if (search) {
        const patient = getPatient(c.patientId)
        if (!patient?.fullName.toLowerCase().includes(search.toLowerCase())) return false
      }
    }
    // Consultas de não-equipe: visíveis para todos (anônimas), ignoram filtro de busca
    if (filterRoom && c.roomId !== filterRoom) return false
    if (filterTherapist && c.therapistId !== filterTherapist && !(c.consultationTherapists || []).some(t => t.therapistId === filterTherapist)) return false
    if (filterEventType && (c.eventType || 'SESSION') !== filterEventType) return false
    return true
  }

  function getByDay(date) {
    const iso = format(date, 'yyyy-MM-dd')
    return consultations.filter(c => filterConsultation(c, iso))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }

  function getWeekend() {
    const satIso = format(saturday, 'yyyy-MM-dd')
    const sunIso = format(sunday, 'yyyy-MM-dd')
    return consultations
      .filter(c => filterConsultation(c, satIso) || filterConsultation(c, sunIso))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  }

  function getBlocksByDay(date) {
    const iso = format(date, 'yyyy-MM-dd')
    return (calendarBlocks || []).filter(b => {
      if (b.date !== iso) return false
      if (b.cancelled) return false
      if (b.active === false) return false
      if (user?.role === 'admin') return true
      if (user?.id) {
        if (b.therapistId === user.id) return true
        if (user?.belongsToTeam) return true
      }
      return false
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }

  function getBlocksByWeekend() {
    const satIso = format(saturday, 'yyyy-MM-dd')
    const sunIso = format(sunday, 'yyyy-MM-dd')
    return (calendarBlocks || []).filter(b => {
      if (b.date !== satIso && b.date !== sunIso) return false
      if (b.cancelled) return false
      if (b.active === false) return false
      if (user?.role === 'admin') return true
      if (user?.id) {
        if (b.therapistId === user.id) return true
        if (user?.belongsToTeam) return true
      }
      return false
    }).sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
  }

  function cardStyle(item) {
    if (!isTeamTherapist(item.therapistId)) {
      return { backgroundColor: '#d1d5db', color: '#374151' }
    }
    const therapist = getTherapist(item.therapistId)
    const bg = therapist?.color || '#1e6a9e'
    return { backgroundColor: bg, color: textColorForBg(bg) }
  }

  // Para o seletor mobile: 5 dias + 1 FDS
  const allMobileDays = [...weekdays, null] // null = fim de semana
  const isTodaySat = format(new Date(), 'yyyy-MM-dd') === format(saturday, 'yyyy-MM-dd')
  const isTodaySun = format(new Date(), 'yyyy-MM-dd') === format(sunday, 'yyyy-MM-dd')

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatMonthYear(weekRef)}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton title="Como usar a Agenda">
            <p><strong>Visualização semanal:</strong> seis colunas (Seg–Sex + Sáb/Dom) com atendimentos e bloqueios organizados por dia. No mobile, abas por dia.</p>
            <p><strong>Criar atendimento:</strong> clique em <em>Novo Atendimento</em> e preencha paciente, terapeuta, especialidade, data e horário.</p>
            <p><strong>Criar série (admin):</strong> apenas administradores podem criar, editar e excluir séries recorrentes. Clique em <em>Série</em> para criar múltiplos atendimentos recorrentes de uma vez (ex.: toda segunda por 10 semanas). Terapeutas podem editar dados individuais de uma ocorrência, mas não têm acesso ao botão Série.</p>
            <p><strong>Entrevistas:</strong> use o tipo "Entrevista" para registrar entrevistas com responsáveis ou candidatos. Chip laranja identifica entrevistas. Entrevistas remotas exibem plataforma e link de acesso no card e não exigem sala.</p>
            <p><strong>Bloqueios de Agenda:</strong> clique em <em>Bloqueio</em> para registrar ausências ou restrições. <strong>RÍGIDO</strong> (cinza escuro) = bloqueio forte (aula, viagem). <strong>FLEX</strong> (cinza médio) = apenas alerta (reunião, home office). Crie bloqueios avulsos ou em série. Acesse o histórico completo pelo botão <em>Histórico de Bloqueios</em>.</p>
            <p><strong>Chips nos cards:</strong> 🔵 indigo = série regular; 🟡 âmbar + ! = ocorrência alterada individualmente; 👥 N = múltiplos terapeutas (passe o mouse para ver os nomes); 🔴 ⚠ = conflito de agenda (passe o mouse para detalhes); 🟠 chip laranja = entrevista.</p>
            <p><strong>Visualização rápida:</strong> duplo-clique em um card (desktop) ou toque simples (mobile) abre os detalhes em modo leitura. Use o botão <em>Editar</em> para abrir no formulário de edição.</p>
            <p><strong>Filtro "Minha Agenda":</strong> terapeutas veem automaticamente apenas seus próprios atendimentos. Admins veem todos.</p>
            <p><strong>Legenda:</strong> as cores na legenda inferior identificam cada terapeuta.</p>
          </HelpButton>
          {(user?.role === 'admin' || user?.id) && (
            <Button variant="ghost" onClick={() => { setEditBlock(null); setShowBlockModal(true) }}>
              <FiSlash size={15} />
              <span className="hidden sm:inline">Bloqueio</span>
            </Button>
          )}
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowSeriesModal(true)}>
              <FiRepeat size={15} />
              <span className="hidden sm:inline">Nova Série</span>
            </Button>
          )}
          <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1 shrink-0">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
            <FiChevronLeft size={17} />
          </button>
          <button
            onClick={() => setWeekRef(new Date())}
            className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Hoje
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600">
            <FiChevronRight size={17} />
          </button>
        </div>

        <div className="relative flex-1 min-w-0">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>

        {isAdminOrTeam && (
          <>
            <select
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Todas as Salas</option>
              {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select
              value={filterTherapist}
              onChange={e => setFilterTherapist(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Todos os Terapeutas</option>
              {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>
        )}
        {canFilterMine && (
          <button
            type="button"
            onClick={() => setMyAgenda(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all shrink-0 ${
              myAgenda
                ? 'border-brand-blue bg-brand-blue text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <FiRepeat size={13} />
            Minha Agenda
          </button>
        )}
        <select
          value={filterEventType}
          onChange={e => setFilterEventType(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Todos</option>
          <option value="SESSION">Atendimento</option>
          <option value="INTERVIEW">Entrevista</option>
        </select>
      </div>

      {/* ── Weekly grid — desktop ── */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Day headers — 6 cols */}
        <div className="grid grid-cols-6 border-b border-gray-100">
          {weekdays.map(day => {
            const iso = format(day, 'yyyy-MM-dd')
            const isToday = iso === today
            return (
              <div key={iso} className={`px-2 py-3 text-center border-r border-gray-100 ${isToday ? 'bg-brand-blue/5' : ''}`}>
                <div className={`text-xs font-semibold capitalize ${isToday ? 'text-brand-blue' : 'text-gray-500'}`}>
                  {formatDay(day)}
                </div>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mx-auto mt-1" />}
              </div>
            )
          })}
          {/* Sáb/Dom header */}
          <div className={`px-2 py-3 text-center ${(isTodaySat || isTodaySun) ? 'bg-brand-blue/5' : ''}`}>
            <div className={`text-xs font-semibold capitalize ${(isTodaySat || isTodaySun) ? 'text-brand-blue' : 'text-gray-500'}`}>
              <span className="block">Sáb {format(saturday, 'dd/MM')}</span>
              <span className="block">Dom {format(sunday, 'dd/MM')}</span>
            </div>
            {(isTodaySat || isTodaySun) && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mx-auto mt-1" />}
          </div>
        </div>

        {/* Day columns — 6 cols */}
        <div className="grid grid-cols-6 min-h-[440px]">
          {weekdays.map(day => {
            const iso = format(day, 'yyyy-MM-dd')
            const dayItems = getByDay(day)
            const dayBlocks = getBlocksByDay(day)
            return (
              <div key={iso} className={`border-r border-gray-100 p-1.5 space-y-1 ${iso === today ? 'bg-brand-blue/5' : ''}`}>
                {dayItems.length === 0 && dayBlocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-10">Livre</div>
                ) : (
                  <>
                {dayItems.map(item => {
                  const isPrivate = !isTeamTherapist(item.therapistId)
                  const patient = isPrivate ? null : getPatient(item.patientId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  const itemConflicts = conflictMap[item.id] || []
                  const conflictTooltip = buildConflictTooltip(itemConflicts, { therapists, rooms, patients, consultations, calendarBlocks })
                  const isInterview = item.eventType === 'INTERVIEW'
                  const isRemote = isInterview && item.interviewFormat === 'REMOTE'
                  const cardName = isPrivate ? 'Consulta Particular' : (isInterview && item.intervieweeName ? item.intervieweeName : shortName(patient?.fullName))
                  const canEdit = !isPrivate && (user?.role === 'admin' || user?.id === item.therapistId) || isPrivate && user?.role === 'admin'
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg px-2 py-1.5 text-xs cursor-pointer group relative transition-opacity hover:opacity-90"
                      style={style}
                      onDoubleClick={() => setViewItem(item)}
                    >
                      <div className="flex items-baseline gap-1 min-w-0">
                        <span className="font-bold shrink-0">{fmtTime(item.time)}</span>
                        <span className="opacity-60">-</span>
                        <span className={`font-medium truncate ${isPrivate ? 'italic' : ''}`}>{cardName}</span>
                      </div>
                      {(room || isInterview || item.seriesId || (item.consultationTherapists || []).length > 1 || itemConflicts.length > 0) && (
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="truncate opacity-75 flex-1" style={{ fontSize: '10px' }}>
                            {isRemote ? '' : (room?.name || '')}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isInterview && (
                              <span title={isRemote ? 'Entrevista Remota' : 'Entrevista Presencial'} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-500/80 text-white" style={{ fontSize: '9px' }}>
                                {isRemote ? <FiVideo size={7} /> : <FiMapPin size={7} />}
                                <span>Entrevista</span>
                              </span>
                            )}
                            {isRemote && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded bg-orange-300/80 text-white" style={{ fontSize: '9px' }}>Remota</span>
                            )}
                            {isRemote && item.meetingLink && (
                              <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" title="Entrar na reunião" onClick={e => e.stopPropagation()} className="inline-flex items-center px-1 py-0.5 rounded bg-teal-600/80 text-white hover:bg-teal-700/80" style={{ fontSize: '9px' }}>
                                <FiExternalLink size={7} />
                              </a>
                            )}
                            {item.seriesId && !item.isSeriesException && (
                              <span title="Recorrente" className="inline-flex items-center px-1 py-0.5 rounded bg-white/25" style={{ fontSize: '9px' }}>
                                <FiRepeat size={7} />
                              </span>
                            )}
                            {item.seriesId && item.isSeriesException && (
                              <span title="Ocorrência alterada" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/25" style={{ fontSize: '9px' }}>
                                <FiRepeat size={7} /><span>!</span>
                              </span>
                            )}
                            {(item.consultationTherapists || []).length > 1 && (
                              <span
                                title={(item.consultationTherapists || []).map(ct => therapists.find(t => t.id === ct.therapistId)?.name || '?').join(', ')}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/25"
                                style={{ fontSize: '9px' }}
                              >
                                👥 {(item.consultationTherapists || []).length}
                              </span>
                            )}
                            {itemConflicts.length > 0 && (
                              <span
                                title={conflictTooltip}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-red-700 bg-red-100"
                                style={{ fontSize: '9px' }}
                              >
                                ⚠
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {!isPrivate && (user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true); logAudit('VIEW', 'consultations', item.id, getPatient(item.patientId)?.fullName || item.id) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500/70 transition-colors"
                          >
                            <FiTrash2 size={9} />
                          </button>
                        </div>
                      )}
                      {isPrivate && user?.role === 'admin' && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500/70 transition-colors"
                          >
                            <FiTrash2 size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Block cards */}
                {dayBlocks.map(block => {
                  const conflictTooltip = buildConflictTooltip(conflictMap[block.id] || [], { therapists, rooms, patients, consultations, calendarBlocks })
                  return (
                    <BlockCard
                      key={block.id}
                      block={block}
                      therapist={getTherapist(block.therapistId)}
                      onEdit={() => { setEditBlock(block); setShowBlockModal(true) }}
                      onView={() => setViewBlock(block)}
                      isAdmin={user?.role === 'admin'}
                      userId={user?.id}
                      conflictTooltip={conflictTooltip}
                    />
                  )
                })}
                  </>
                )}
              </div>
            )
          })}
          {/* Coluna Sáb+Dom */}
          {(() => {
            const weekendItems = getWeekend()
            const weekendBlocks = getBlocksByWeekend()
            const satIso = format(saturday, 'yyyy-MM-dd')
            return (
              <div className={`p-1.5 space-y-1 ${(isTodaySat || isTodaySun) ? 'bg-brand-blue/5' : ''}`}>
                {weekendItems.length === 0 && weekendBlocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-10">Livre</div>
                ) : (
                  <>
                {weekendItems.map(item => {
                  const isPrivate = !isTeamTherapist(item.therapistId)
                  const patient = isPrivate ? null : getPatient(item.patientId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  const isSun = item.date !== satIso
                  const itemConflicts = conflictMap[item.id] || []
                  const conflictTooltip = buildConflictTooltip(itemConflicts, { therapists, rooms, patients, consultations, calendarBlocks })
                  const isInterview = item.eventType === 'INTERVIEW'
                  const isRemote = isInterview && item.interviewFormat === 'REMOTE'
                  const dayLabel = isSun ? 'Dom' : 'Sáb'
                  const cardName = isPrivate ? 'Consulta Particular' : (isInterview && item.intervieweeName ? item.intervieweeName : shortName(patient?.fullName))
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg px-2 py-1.5 text-xs cursor-pointer group relative transition-opacity hover:opacity-90"
                      style={style}
                      onDoubleClick={() => setViewItem(item)}
                    >
                      <div className="flex items-baseline gap-1 min-w-0">
                        <span className="font-bold shrink-0">{fmtTime(item.time)} · {dayLabel}</span>
                        <span className="opacity-60">-</span>
                        <span className={`font-medium truncate ${isPrivate ? 'italic' : ''}`}>{cardName}</span>
                      </div>
                      {(room || isInterview || item.seriesId || (item.consultationTherapists || []).length > 1 || itemConflicts.length > 0) && (
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <span className="truncate opacity-75 flex-1" style={{ fontSize: '10px' }}>
                            {isRemote ? '' : (room?.name || '')}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isInterview && (
                              <span title={isRemote ? 'Entrevista Remota' : 'Entrevista Presencial'} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-500/80 text-white" style={{ fontSize: '9px' }}>
                                {isRemote ? <FiVideo size={7} /> : <FiMapPin size={7} />}
                                <span>Entrevista</span>
                              </span>
                            )}
                            {isRemote && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded bg-orange-300/80 text-white" style={{ fontSize: '9px' }}>Remota</span>
                            )}
                            {isRemote && item.meetingLink && (
                              <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" title="Entrar na reunião" onClick={e => e.stopPropagation()} className="inline-flex items-center px-1 py-0.5 rounded bg-teal-600/80 text-white hover:bg-teal-700/80" style={{ fontSize: '9px' }}>
                                <FiExternalLink size={7} />
                              </a>
                            )}
                            {item.seriesId && !item.isSeriesException && (
                              <span title="Recorrente" className="inline-flex items-center px-1 py-0.5 rounded bg-white/25" style={{ fontSize: '9px' }}>
                                <FiRepeat size={7} />
                              </span>
                            )}
                            {item.seriesId && item.isSeriesException && (
                              <span title="Ocorrência alterada" className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/25" style={{ fontSize: '9px' }}>
                                <FiRepeat size={7} /><span>!</span>
                              </span>
                            )}
                            {(item.consultationTherapists || []).length > 1 && (
                              <span
                                title={(item.consultationTherapists || []).map(ct => therapists.find(t => t.id === ct.therapistId)?.name || '?').join(', ')}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/25"
                                style={{ fontSize: '9px' }}
                              >
                                👥 {(item.consultationTherapists || []).length}
                              </span>
                            )}
                            {itemConflicts.length > 0 && (
                              <span
                                title={conflictTooltip}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-red-700 bg-red-100"
                                style={{ fontSize: '9px' }}
                              >
                                ⚠
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {!isPrivate && (user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true); logAudit('VIEW', 'consultations', item.id, getPatient(item.patientId)?.fullName || item.id) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500/70 transition-colors"
                          >
                            <FiTrash2 size={9} />
                          </button>
                        </div>
                      )}
                      {isPrivate && user?.role === 'admin' && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(item) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500/70 transition-colors"
                          >
                            <FiTrash2 size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Weekend block cards */}
                {weekendBlocks.map(block => {
                  const conflictTooltip = buildConflictTooltip(conflictMap[block.id] || [], { therapists, rooms, patients, consultations, calendarBlocks })
                  return (
                    <BlockCard
                      key={block.id}
                      block={block}
                      therapist={getTherapist(block.therapistId)}
                      onEdit={() => { setEditBlock(block); setShowBlockModal(true) }}
                      onView={() => setViewBlock(block)}
                      isAdmin={user?.role === 'admin'}
                      userId={user?.id}
                      conflictTooltip={conflictTooltip}
                    />
                  )
                })}
                  </>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Day view — mobile ── */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDayIdx(i => Math.max(0, i - 1))}
            disabled={selectedDayIdx === 0}
            className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30"
          >
            <FiChevronLeft size={16} />
          </button>
          <div className="flex-1 flex gap-1">
            {weekdays.map((day, idx) => {
              const iso = format(day, 'yyyy-MM-dd')
              const isToday = iso === today
              const isSelected = idx === selectedDayIdx
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected ? 'bg-brand-blue text-white'
                    : isToday ? 'bg-brand-blue/10 text-brand-blue'
                    : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="capitalize">{formatDay(day).slice(0, 3)}</div>
                  <div className="font-bold">{day.getDate()}</div>
                </button>
              )
            })}
            {/* FDS tab */}
            <button
              onClick={() => setSelectedDayIdx(5)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedDayIdx === 5 ? 'bg-brand-blue text-white'
                : (isTodaySat || isTodaySun) ? 'bg-brand-blue/10 text-brand-blue'
                : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              <div>FDS</div>
              <div className="font-bold">{saturday.getDate()}/{sunday.getDate()}</div>
            </button>
          </div>
          <button
            onClick={() => setSelectedDayIdx(i => Math.min(5, i + 1))}
            disabled={selectedDayIdx === 5}
            className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(() => {
            const dayItems = selectedDayIdx === 5 ? getWeekend() : getByDay(weekdays[selectedDayIdx])
            const mobileBlocks = selectedDayIdx === 5 ? getBlocksByWeekend() : getBlocksByDay(weekdays[selectedDayIdx])
            if (dayItems.length === 0 && mobileBlocks.length === 0) return (
              <div className="py-12 text-center text-gray-400 text-sm">
                <FiCalendar size={28} className="mx-auto mb-2 opacity-40" />
                Nenhum agendamento neste dia
              </div>
            )
            return (
              <div className="divide-y divide-gray-50">
                {dayItems.map(item => {
                  const isPrivate = !isTeamTherapist(item.therapistId)
                  const patient = isPrivate ? null : getPatient(item.patientId)
                  const therapist = getTherapist(item.therapistId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  const itemConflicts = conflictMap[item.id] || []
                  const conflictTooltip = buildConflictTooltip(itemConflicts, { therapists, rooms, patients, consultations, calendarBlocks })
                  const isInterview = item.eventType === 'INTERVIEW'
                  const isRemote = isInterview && item.interviewFormat === 'REMOTE'
                  const mobileName = isPrivate ? 'Consulta Particular' : (isInterview && item.intervieweeName ? item.intervieweeName : patient?.fullName)
                  const weekendDayLabel = selectedDayIdx === 5
                    ? (item.date === format(saturday, 'yyyy-MM-dd') ? 'Sáb' : 'Dom')
                    : null
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setViewItem(item)}>
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: style.backgroundColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">
                          {weekendDayLabel ? `${weekendDayLabel} · ` : ''}{fmtTime(item.time)}
                        </div>
                        <div className={`text-sm truncate ${isPrivate ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                          {mobileName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {isPrivate
                            ? (room?.name || '')
                            : `${therapist?.name}${!isRemote && room ? ` • ${room.name}` : ''}`}
                        </div>
                        {(isInterview || item.seriesId || (item.consultationTherapists || []).length > 1 || itemConflicts.length > 0) && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {isInterview && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700">
                                {isRemote ? <FiVideo size={9} /> : <FiMapPin size={9} />}
                                Entrevista
                              </span>
                            )}
                            {isRemote && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-orange-50 text-orange-600">Remota</span>
                            )}
                            {isRemote && item.meetingLink && (
                              <a href={item.meetingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-orange-600 text-white">
                                <FiExternalLink size={9} /> Entrar
                              </a>
                            )}
                            {item.seriesId && !item.isSeriesException && (
                              <span title="Recorrente" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-500">
                                <FiRepeat size={9} />
                              </span>
                            )}
                            {item.seriesId && item.isSeriesException && (
                              <span title="Ocorrência alterada" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600">
                                <FiRepeat size={9} /><span>!</span>
                              </span>
                            )}
                            {(item.consultationTherapists || []).length > 1 && (
                              <span
                                title={(item.consultationTherapists || []).map(ct => therapists.find(t => t.id === ct.therapistId)?.name || '?').join(', ')}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-500"
                              >
                                👥 {(item.consultationTherapists || []).length}
                              </span>
                            )}
                            {itemConflicts.length > 0 && (
                              <span
                                title={conflictTooltip}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-red-50 text-red-600"
                              >
                                ⚠ {itemConflicts.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {!isPrivate && (user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); setEditItem(item); setShowModal(true); logAudit('VIEW', 'consultations', item.id, patient?.fullName || item.id) }} className="p-2 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(item) }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      )}
                      {isPrivate && user?.role === 'admin' && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => { e.stopPropagation(); setEditItem(item); setShowModal(true) }} className="p-2 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(item) }} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Mobile block cards */}
                {mobileBlocks.map(block => {
                  const blockTherapist = getTherapist(block.therapistId)
                  const canEditBlock = user?.role === 'admin' || user?.id === block.therapistId
                  const isRigid = block.blockType === 'RIGID'
                  const blockConflicts = conflictMap[block.id] || []
                  const blockConflictTooltip = buildConflictTooltip(blockConflicts, { therapists, rooms, patients, consultations, calendarBlocks })
                  return (
                    <div key={block.id} className="flex items-center gap-3 p-4 bg-gray-50 cursor-pointer" onClick={() => setViewBlock(block)}>
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${isRigid ? 'bg-gray-500' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800">
                          {block.startTime?.slice(0, 5)}–{block.endTime?.slice(0, 5)} — Bloqueio
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                          {blockTherapist?.color && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: blockTherapist.color }} />
                          )}
                          <span>{blockTherapist?.name || '—'}{block.description ? ` • ${block.description}` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            isRigid ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isRigid ? 'Rígido' : 'Flex'}
                          </span>
                          {blockConflicts.length > 0 && (
                            <span title={blockConflictTooltip} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-red-50 text-red-600">⚠ Conflito</span>
                          )}
                        </div>
                      </div>
                      {canEditBlock && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditBlock(block); setShowBlockModal(true) }}
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                          >
                            <FiEdit2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Legenda terapeutas */}
      {isAdminOrTeam && (
        <div className="flex flex-wrap gap-3">
          {activeTherapists.filter(t => t.belongsToTeam && t.color).map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              {t.name}
            </div>
          ))}
          {activeTherapists.some(t => !t.belongsToTeam) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-3 h-3 rounded-full shrink-0 bg-gray-300" />
              Consultas Particulares
            </div>
          )}
          {(user?.role === 'admin' || user?.id) && (
            <button
              type="button"
              onClick={() => setShowBlockHistory(true)}
              className="ml-auto flex items-center gap-1 text-xs text-amber-700 hover:underline"
            >
              <FiSlash size={11} /> Histórico de Bloqueios
            </button>
          )}
        </div>
      )}

      {showModal && (
        <ConsultationFormModal
          onClose={() => setShowModal(false)}
          initial={editItem || {}}
        />
      )}

      {viewItem && (
        <ConsultationFormModal
          onClose={() => setViewItem(null)}
          initial={viewItem}
          readOnly
          onEditRequest={
            (!isTeamTherapist(viewItem.therapistId)
              ? user?.role === 'admin'
              : user?.role === 'admin' || user?.id === viewItem.therapistId)
              ? () => { setViewItem(null); setEditItem(viewItem); setShowModal(true) }
              : null
          }
        />
      )}

      {viewBlock && (
        <CalendarBlockFormModal
          onClose={() => setViewBlock(null)}
          initial={viewBlock}
          viewOnly
          onEditRequest={
            (user?.role === 'admin' || user?.id === viewBlock.therapistId)
              ? () => { setViewBlock(null); setEditBlock(viewBlock); setShowBlockModal(true) }
              : null
          }
        />
      )}

      {showSeriesModal && (
        <SeriesFormModal onClose={() => setShowSeriesModal(false)} />
      )}

      {showBlockModal && (
        <CalendarBlockFormModal
          onClose={() => { setShowBlockModal(false); setEditBlock(null) }}
          initial={editBlock || {}}
        />
      )}

      {showBlockHistory && (
        <CalendarBlockHistoryModal
          onClose={() => setShowBlockHistory(false)}
          therapistId={filterTherapist || (user?.role !== 'admin' ? user?.id : null)}
        />
      )}

      {seriesDeleteConfirm && (
        <Modal
          title="Excluir da Série"
          onClose={() => setSeriesDeleteConfirm(null)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSeriesDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="outline" onClick={() => { deleteConsultation(seriesDeleteConfirm.id); setSeriesDeleteConfirm(null) }}>Apenas este</Button>
              <Button variant="danger" onClick={() => { deleteConsultationSeries(seriesDeleteConfirm.seriesId, seriesDeleteConfirm.date); setSeriesDeleteConfirm(null) }}>Este e os próximos</Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">Esta consulta faz parte de uma série recorrente. Deseja excluir apenas este atendimento ou este e todos os atendimentos futuros não faturados da série?</p>
        </Modal>
      )}
    </div>
  )
}
