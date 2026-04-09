import { useState } from 'react'
import { FiPlus, FiSearch, FiClipboard, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import ConsultationFormModal from './ConsultationFormModal'
import { formatDateShort } from '../../../utils/dateUtils'

export default function ConsultationsPage() {
  const { consultations, patients, therapists, rooms, specialtiesData, consultationStatuses, appointmentTypes, deleteConsultation } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editConsultation, setEditConsultation] = useState(null)
  const [viewConsultation, setViewConsultation] = useState(null)
  const [expanded, setExpanded] = useState(null)

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getStatus(id) { return consultationStatuses.find(s => s.id === id) }

  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  const visibleConsultations = user?.role === 'admin'
    ? consultations
    : consultations.filter(c => c.therapistId === user?.id)

  const filtered = visibleConsultations
    .filter(c => {
      const patient = getPatient(c.patientId)
      const matchSearch = !search || patient?.fullName.toLowerCase().includes(search.toLowerCase())
      const matchSpecialty = !filterSpecialty || c.specialty === filterSpecialty
      return matchSearch && matchSpecialty
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  function handleDelete(id) {
    if (confirm('Excluir este registro de atendimento?')) deleteConsultation(id)
  }

  const outcomeColors = {
    achieved: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    not_achieved: 'text-red-600 bg-red-50',
  }
  const outcomeLabels = { achieved: 'Alcançado', partial: 'Parcial', not_achieved: 'Não alcançado' }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Atendimentos</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} registro(s)</p>
        </div>
        <Button variant="primary" onClick={() => { setEditConsultation(null); setShowModal(true) }}>
          <FiPlus size={16} />
          <span className="hidden sm:inline">Novo Registro</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>
        <select
          value={filterSpecialty}
          onChange={e => setFilterSpecialty(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Especialidade</option>
          {activeSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState
              icon={FiClipboard}
              title="Nenhum registro encontrado"
              description="Registre o primeiro atendimento clicando em 'Novo Registro'."
              action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo Registro</Button>}
            />
          </div>
        ) : filtered.map(c => {
          const patient = getPatient(c.patientId)
          const therapist = getTherapist(c.therapistId)
          const status = getStatus(c.consultationStatusId)
          const apptType = appointmentTypes.find(t => t.id === c.appointmentTypeId)
          const room = rooms.find(r => r.id === c.roomId)
          const isExpanded = expanded === c.id
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{patient?.fullName || '—'}</span>
                    <Badge specialty={c.specialty} />
                    {status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>
                    )}
                    {apptType && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{apptType.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>{formatDateShort(c.date)}{c.time && <span className="text-gray-400"> {c.time}</span>}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {therapist?.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: therapist.color }} />}
                      {therapist?.name || '—'}
                    </span>
                    {room && (
                      <><span>•</span>
                      <span className="flex items-center gap-1">
                        {room.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: room.color }} />}
                        {room.name}
                      </span></>
                    )}
                    <span>•</span>
                    <span>{c.activities?.length || 0} atividade(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewConsultation(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                  >
                    <FiEye size={15} />
                  </button>
                  {(user?.role === 'admin' || user?.id === c.therapistId) && (<>
                  <button
                    onClick={() => { setEditConsultation(c); setShowModal(true) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                  >
                    <FiEdit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <FiTrash2 size={15} />
                  </button>
                  </>)}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
                  {c.mainObjective && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objetivo Principal</h4>
                      <p className="text-sm text-gray-700">{c.mainObjective}</p>
                    </div>
                  )}

                  {c.activities?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Atividades Realizadas</h4>
                      <div className="space-y-2">
                        {c.activities.map(act => (
                          <div key={act.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-3">
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${outcomeColors[act.outcome]}`}>
                              {outcomeLabels[act.outcome]}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900">{act.name}</div>
                              {act.description && <div className="text-xs text-gray-500 mt-0.5">{act.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.evolutionNotes && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas de Evolução</h4>
                      <p className="text-sm text-gray-700">{c.evolutionNotes}</p>
                    </div>
                  )}

                  {c.guardianFeedback && (
                    <div className="bg-brand-yellow/10 rounded-xl p-3 border border-brand-yellow/20">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Orientação ao Responsável</h4>
                      <p className="text-sm text-gray-700">{c.guardianFeedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <ConsultationFormModal
          onClose={() => setShowModal(false)}
          initial={editConsultation || {}}
        />
      )}
      {viewConsultation && (
        <ConsultationFormModal
          onClose={() => setViewConsultation(null)}
          initial={viewConsultation}
          readOnly
        />
      )}
    </div>
  )
}
