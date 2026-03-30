import { useState } from 'react'
import { FiPlus, FiSearch, FiClipboard, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import ConsultationFormModal from './ConsultationFormModal'
import { formatDateShort } from '../../../utils/dateUtils'
import { SPECIALTY_LIST, SPECIALTIES } from '../../../constants/specialties'
export default function ConsultationsPage() {
  const { consultations, patients, therapists, deleteConsultation } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editConsultation, setEditConsultation] = useState(null)
  const [expanded, setExpanded] = useState(null)

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }

  // Role-based: therapists see only their own consultations
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
    if (confirm('Excluir este registro de consulta?')) deleteConsultation(id)
  }

  const outcomeColors = {
    achieved: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    not_achieved: 'text-red-600 bg-red-50',
  }
  const outcomeLabels = { achieved: 'Alcançado', partial: 'Parcial', not_achieved: 'Não alcançado' }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Consulta</h1>
          <p className="text-sm text-gray-500 mt-0.5">{consultations.length} registro(s)</p>
        </div>
        <Button variant="primary" onClick={() => { setEditConsultation(null); setShowModal(true) }}>
          <FiPlus size={16} /> Novo Registro
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
          <option value="">Todas as especialidades</option>
          {SPECIALTY_LIST.map(k => <option key={k} value={k}>{SPECIALTIES[k].label}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState
              icon={FiClipboard}
              title="Nenhum registro encontrado"
              description="Registre a primeira consulta clicando em 'Novo Registro'."
              action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo Registro</Button>}
            />
          </div>
        ) : filtered.map(c => {
          const patient = getPatient(c.patientId)
          const therapist = getTherapist(c.therapistId)
          const isExpanded = expanded === c.id
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{patient?.fullName || '—'}</span>
                    <Badge specialty={c.specialty} />
                    <Badge quality={c.sessionQuality} />
                    <span className="text-xs text-gray-400">Sessão #{c.sessionNumber}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatDateShort(c.date)}</span>
                    <span>•</span>
                    <span>{therapist?.name}</span>
                    <span>•</span>
                    <span>{c.activities?.length || 0} atividade(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objetivo Principal</h4>
                    <p className="text-sm text-gray-700">{c.mainObjective}</p>
                  </div>

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

                  {c.nextObjectives && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Próximos Objetivos</h4>
                      <p className="text-sm text-gray-700">{c.nextObjectives}</p>
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
    </div>
  )
}
