import { useState } from 'react'
import { FiPlus, FiChevronLeft, FiChevronRight, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import AppointmentFormModal from './AppointmentFormModal'
import { SPECIALTIES, SPECIALTY_LIST } from '../../../constants/specialties'
import { getWeekDays, formatWeekDay, formatMonthYear, isoToday } from '../../../utils/dateUtils'

export default function AgendaPage() {
  const { appointments, patients, rooms, therapists, deleteAppointment } = useData()
  const { user } = useAuth()
  const [weekRef, setWeekRef] = useState(new Date())
  const [filterMode, setFilterMode] = useState('mine') // 'mine' | specialty key
  const [showModal, setShowModal] = useState(false)
  const [editAppt, setEditAppt] = useState(null)

  const days = getWeekDays(weekRef)
  const today = isoToday()

  function prevWeek() { const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d) }
  function nextWeek() { const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d) }

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getRoom(id) { return rooms.find(r => r.id === id) }

  function getApptsByDay(date) {
    const iso = date.toISOString().split('T')[0]
    return appointments
      .filter(a => {
        if (a.date !== iso) return false
        if (filterMode === 'mine') return a.therapistId === user?.id
        if (filterMode === 'all') return true
        return a.specialty === filterMode
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const specColor = (key) => SPECIALTIES[key]?.calendarColor || '#6b7280'

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{formatMonthYear(weekRef)}</p>
        </div>
        <Button variant="primary" onClick={() => { setEditAppt(null); setShowModal(true) }}>
          <FiPlus size={16} /> Novo Agendamento
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600"><FiChevronLeft size={18} /></button>
          <button
            onClick={() => setWeekRef(new Date())}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            Hoje
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-600"><FiChevronRight size={18} /></button>
        </div>

        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 flex-wrap">
          <button
            onClick={() => setFilterMode('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === 'mine' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Minha Agenda
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === 'all' ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Todas
          </button>
          {SPECIALTY_LIST.map(k => (
            <button
              key={k}
              onClick={() => setFilterMode(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterMode === k ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              style={filterMode === k ? { backgroundColor: SPECIALTIES[k].calendarColor } : {}}
            >
              {SPECIALTIES[k].label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-5 border-b border-gray-100">
          {days.map((day) => {
            const iso = day.toISOString().split('T')[0]
            const isToday = iso === today
            return (
              <div
                key={iso}
                className={`px-3 py-3 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-brand-blue/5' : ''}`}
              >
                <div className={`text-xs font-semibold capitalize ${isToday ? 'text-brand-blue' : 'text-gray-500'}`}>
                  {formatWeekDay(day)}
                </div>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mx-auto mt-1" />}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-5 min-h-[400px]">
          {days.map((day) => {
            const iso = day.toISOString().split('T')[0]
            const dayAppts = getApptsByDay(day)
            return (
              <div key={iso} className={`border-r border-gray-100 last:border-r-0 p-2 space-y-2 ${iso === today ? 'bg-brand-blue/5' : ''}`}>
                {dayAppts.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 py-8">Livre</div>
                ) : (
                  dayAppts.map((appt) => {
                    const patient = getPatient(appt.patientId)
                    const therapist = getTherapist(appt.therapistId)
                    const room = getRoom(appt.roomId)
                    return (
                      <div
                        key={appt.id}
                        className="rounded-xl p-2.5 text-white text-xs cursor-pointer hover:opacity-90 transition-opacity group relative"
                        style={{ backgroundColor: specColor(appt.specialty) }}
                      >
                        <div className="font-semibold truncate">{appt.startTime} – {appt.endTime}</div>
                        <div className="truncate opacity-90">{patient?.fullName}</div>
                        <div className="truncate opacity-75 text-xs">{therapist?.name?.split(' ')[0]}</div>
                        {room && <div className="truncate opacity-75 text-xs">{room.name}</div>}
                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                          <button
                            onClick={() => { setEditAppt(appt); setShowModal(true) }}
                            className="w-5 h-5 bg-white/20 hover:bg-white/40 rounded flex items-center justify-center"
                          >
                            <FiEdit2 size={10} />
                          </button>
                          <button
                            onClick={() => { if (confirm('Excluir este agendamento?')) deleteAppointment(appt.id) }}
                            className="w-5 h-5 bg-white/20 hover:bg-red-500 rounded flex items-center justify-center"
                          >
                            <FiTrash2 size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legendas */}
      <div className="flex flex-wrap gap-3">
        {SPECIALTY_LIST.map(k => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: SPECIALTIES[k].calendarColor }} />
            {SPECIALTIES[k].label}
          </div>
        ))}
      </div>

      {showModal && (
        <AppointmentFormModal
          onClose={() => setShowModal(false)}
          initial={editAppt || {}}
        />
      )}
    </div>
  )
}
