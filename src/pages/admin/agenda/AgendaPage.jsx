import { useState } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight, FiSearch, FiCalendar, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import AppointmentFormModal from './AppointmentFormModal'
import { getWeekDays, formatWeekDay, formatMonthYear, isoToday } from '../../../utils/dateUtils'
import { format } from 'date-fns'

function textColorForBg(hex) {
  if (!hex) return 'white'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#1f2937' : '#ffffff'
}

export default function AgendaPage() {
  const { appointments, patients, rooms, therapists, deleteAppointment } = useData()
  const { user } = useAuth()
  const [weekRef, setWeekRef] = useState(new Date())
  const [search, setSearch] = useState('')
  const [filterRoom, setFilterRoom] = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt] = useState(null)
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const d = new Date().getDay()
    return d === 0 || d === 6 ? 0 : d - 1
  })

  const days = getWeekDays(weekRef)
  const today = format(new Date(), 'yyyy-MM-dd')

  const isAdminOrTeam = user?.role === 'admin' || user?.belongsToTeam

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d) }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d) }

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getRoom(id) { return rooms.find(r => r.id === id) }

  const activeRooms = rooms.filter(r => r.active !== false)
  const activeTherapists = therapists.filter(t => t.active !== false)

  function getApptsByDay(date) {
    const iso = format(date, 'yyyy-MM-dd')
    return appointments
      .filter(a => {
        if (a.date !== iso) return false
        // Visibilidade base
        if (!isAdminOrTeam && a.therapistId !== user?.id) return false
        // Filtros
        if (search) {
          const patient = getPatient(a.patientId)
          if (!patient?.fullName.toLowerCase().includes(search.toLowerCase())) return false
        }
        if (filterRoom && a.roomId !== filterRoom) return false
        if (filterTherapist && a.therapistId !== filterTherapist) return false
        return true
      })
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }

  function cardStyle(appt) {
    const therapist = getTherapist(appt.therapistId)
    const bg = therapist?.color || '#1e6a9e'
    return { backgroundColor: bg, color: textColorForBg(bg) }
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatMonthYear(weekRef)}</p>
        </div>
        <Button variant="primary" onClick={() => { setEditAppt(null); setShowModal(true) }}>
          <FiPlus size={16} />
          <span className="hidden sm:inline">Novo Agendamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        {/* Week navigation */}
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

        {/* Patient search */}
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>

        {/* Sala + Terapeuta — admin e equipe apenas */}
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
        {/* Day headers */}
        <div className="grid grid-cols-5 border-b border-gray-100">
          {days.map(day => {
            const iso = format(day, 'yyyy-MM-dd')
            const isToday = iso === today
            return (
              <div key={iso} className={`px-3 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-brand-blue/5' : ''}`}>
                <div className={`text-xs font-semibold capitalize ${isToday ? 'text-brand-blue' : 'text-gray-500'}`}>
                  {formatWeekDay(day)}
                </div>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mx-auto mt-1" />}
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-5 min-h-[440px]">
          {days.map(day => {
            const iso = format(day, 'yyyy-MM-dd')
            const dayAppts = getApptsByDay(day)
            return (
              <div key={iso} className={`border-r border-gray-100 last:border-r-0 p-2 space-y-1.5 ${iso === today ? 'bg-brand-blue/5' : ''}`}>
                {dayAppts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-10">Livre</div>
                ) : dayAppts.map(appt => {
                  const patient = getPatient(appt.patientId)
                  const room = getRoom(appt.roomId)
                  const style = cardStyle(appt)
                  return (
                    <div
                      key={appt.id}
                      className="rounded-xl px-2.5 py-2 text-xs cursor-pointer group relative transition-opacity hover:opacity-90"
                      style={style}
                    >
                      <div className="font-bold">{appt.startTime}</div>
                      <div className="font-medium truncate mt-0.5">{patient?.fullName || '—'}</div>
                      {room && <div className="truncate opacity-80 text-xs mt-0.5">{room.name}</div>}
                      {/* Actions on hover */}
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                        <button
                          onClick={() => { setEditAppt(appt); setShowModal(true) }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                        >
                          <FiEdit2 size={10} />
                        </button>
                        <button
                          onClick={() => { if (confirm('Excluir este agendamento?')) deleteAppointment(appt.id) }}
                          className="w-5 h-5 rounded flex items-center justify-center bg-black/20 hover:bg-red-500 transition-colors"
                        >
                          <FiTrash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
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
            {days.map((day, idx) => {
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
                  <div className="capitalize">{formatWeekDay(day).slice(0, 3)}</div>
                  <div className="font-bold">{day.getDate()}</div>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setSelectedDayIdx(i => Math.min(4, i + 1))}
            disabled={selectedDayIdx === 4}
            className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-30"
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(() => {
            const dayAppts = getApptsByDay(days[selectedDayIdx])
            if (dayAppts.length === 0) return (
              <div className="py-12 text-center text-gray-400 text-sm">
                <FiCalendar size={28} className="mx-auto mb-2 opacity-40" />
                Nenhum agendamento neste dia
              </div>
            )
            return (
              <div className="divide-y divide-gray-50">
                {dayAppts.map(appt => {
                  const patient = getPatient(appt.patientId)
                  const therapist = getTherapist(appt.therapistId)
                  const room = getRoom(appt.roomId)
                  const style = cardStyle(appt)
                  return (
                    <div key={appt.id} className="flex items-center gap-3 p-4">
                      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: style.backgroundColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{appt.startTime}{appt.endTime ? ` – ${appt.endTime}` : ''}</div>
                        <div className="text-sm text-gray-700 truncate">{patient?.fullName}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {therapist?.name}{room ? ` • ${room.name}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditAppt(appt); setShowModal(true) }} className="p-2 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => { if (confirm('Excluir?')) deleteAppointment(appt.id) }} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
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
              {t.name.split(' ')[0]}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AppointmentFormModal
          onClose={() => setShowModal(false)}
          initial={editAppt || {}}
        />
      )}
    </div>
  )
}
