import { useState } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight, FiSearch, FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { addDays, startOfWeek, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import ConsultationFormModal from '../consultations/ConsultationFormModal'
import { formatMonthYear } from '../../../utils/dateUtils'

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

export default function AgendaPage() {
  const { consultations, patients, rooms, therapists, deleteConsultation } = useData()
  const { user } = useAuth()
  const [weekRef, setWeekRef] = useState(new Date())
  const [search, setSearch] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const d = new Date().getDay()
    // 0=Dom→5(FDS), 1=Seg→0, ..., 5=Sex→4, 6=Sáb→5(FDS)
    return (d === 0 || d === 6) ? 5 : d - 1
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  // Seg a Sex + Sáb + Dom
  const weekStart = startOfWeek(weekRef, { weekStartsOn: 1 })
  const weekdays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  const saturday = addDays(weekStart, 5)
  const sunday = addDays(weekStart, 6)

  const isAdminOrTeam = user?.role === 'admin' || user?.belongsToTeam

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d) }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d) }

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getRoom(id) { return rooms.find(r => r.id === id) }

  const activeRooms = rooms.filter(r => r.active !== false)
  const activeTherapists = therapists.filter(t => t.active !== false)

  function filterConsultation(c, iso) {
    if (c.date !== iso) return false
    if (!user) return false
    if (user.role !== 'admin' && !user.belongsToTeam && c.therapistId !== user.id) return false
    if (search) {
      const patient = getPatient(c.patientId)
      if (!patient?.fullName.toLowerCase().includes(search.toLowerCase())) return false
    }
    if (filterRoom && c.roomId !== filterRoom) return false
    if (filterTherapist && c.therapistId !== filterTherapist) return false
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

  function cardStyle(item) {
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
        <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
          <FiPlus size={16} />
          <span className="hidden sm:inline">Novo Atendimento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
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

        <div className="relative flex-1 min-w-[180px]">
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
            return (
              <div key={iso} className={`border-r border-gray-100 p-1.5 space-y-1 ${iso === today ? 'bg-brand-blue/5' : ''}`}>
                {dayItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-10">Livre</div>
                ) : dayItems.map(item => {
                  const patient = getPatient(item.patientId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg px-2 py-1.5 text-xs cursor-pointer group relative transition-opacity hover:opacity-90"
                      style={style}
                    >
                      <div className="flex items-baseline gap-1 min-w-0">
                        <span className="font-bold shrink-0">{fmtTime(item.time)}</span>
                        <span className="opacity-60">-</span>
                        <span className="font-medium truncate">{shortName(patient?.fullName)}</span>
                      </div>
                      {room && <div className="truncate opacity-75 mt-0.5" style={{ fontSize: '10px' }}>{room.name}</div>}
                      {(user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Excluir este agendamento?')) deleteConsultation(item.id) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500 transition-colors"
                          >
                            <FiTrash2 size={10} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
          {/* Coluna Sáb+Dom */}
          {(() => {
            const weekendItems = getWeekend()
            const satIso = format(saturday, 'yyyy-MM-dd')
            return (
              <div className={`p-1.5 space-y-1 ${(isTodaySat || isTodaySun) ? 'bg-brand-blue/5' : ''}`}>
                {weekendItems.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-10">Livre</div>
                ) : weekendItems.map(item => {
                  const patient = getPatient(item.patientId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  const isSun = item.date !== satIso
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg px-2 py-1.5 text-xs cursor-pointer group relative transition-opacity hover:opacity-90"
                      style={style}
                    >
                      <div className="flex items-baseline gap-1 min-w-0">
                        <span className="font-bold shrink-0">{fmtTime(item.time)}</span>
                        <span className="opacity-60">-</span>
                        <span className="font-medium truncate">{shortName(patient?.fullName)}</span>
                      </div>
                      {room && <div className="truncate opacity-75 mt-0.5" style={{ fontSize: '10px' }}>{room.name}</div>}
                      <div className="opacity-60 mt-0.5" style={{ fontSize: '10px' }}>{isSun ? 'Dom' : 'Sáb'}</div>
                      {(user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => { setEditItem(item); setShowModal(true) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Excluir este agendamento?')) deleteConsultation(item.id) }}
                            className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500 transition-colors"
                          >
                            <FiTrash2 size={10} />
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
            if (dayItems.length === 0) return (
              <div className="py-12 text-center text-gray-400 text-sm">
                <FiCalendar size={28} className="mx-auto mb-2 opacity-40" />
                Nenhum agendamento neste dia
              </div>
            )
            return (
              <div className="divide-y divide-gray-50">
                {dayItems.map(item => {
                  const patient = getPatient(item.patientId)
                  const therapist = getTherapist(item.therapistId)
                  const room = getRoom(item.roomId)
                  const style = cardStyle(item)
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-4">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: style.backgroundColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{fmtTime(item.time)}</div>
                        <div className="text-sm text-gray-700 truncate">{patient?.fullName}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {therapist?.name}{room ? ` • ${room.name}` : ''}
                        </div>
                      </div>
                      {(user?.role === 'admin' || user?.id === item.therapistId) && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditItem(item); setShowModal(true) }} className="p-2 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => { if (confirm('Excluir?')) deleteConsultation(item.id) }} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <FiTrash2 size={15} />
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
          {activeTherapists.filter(t => t.color).map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              {t.name}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ConsultationFormModal
          onClose={() => setShowModal(false)}
          initial={editItem || {}}
        />
      )}
    </div>
  )
}
