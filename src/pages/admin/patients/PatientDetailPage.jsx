import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiClipboard, FiUser, FiPhone, FiMail, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import PatientFormModal from './PatientFormModal'
import { calculateAge, formatDateBR, formatDateShort } from '../../../utils/dateUtils'
import { SPECIALTIES } from '../../../constants/specialties'

const CONSULTATIONS_PER_PAGE = 10

const tabs = [
  { id: 'resumo',       label: 'Resumo',       icon: FiUser },
  { id: 'consultas',    label: 'Consultas',    icon: FiClipboard },
  { id: 'responsaveis', label: 'Responsáveis', icon: FiUser },
]

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPatientById, getGuardiansForPatient, consultations, therapists, paymentMethods, patientStatuses, diagnoses, consultationStatuses, appointmentTypes } = useData()
  const [activeTab, setActiveTab] = useState('resumo')
  const [showEdit, setShowEdit] = useState(false)
  const [consultPage, setConsultPage] = useState(0)

  const patient = getPatientById(id)
  if (!patient) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Paciente não encontrado.</p>
        <Button className="mt-4" onClick={() => navigate('/admin/pacientes')}>Voltar</Button>
      </div>
    )
  }

  const linkedGuardians = getGuardiansForPatient(id)
  const patientStatus = patientStatuses.find(s => s.id === (patient.statusId || patient.status))
  const primaryTherapist = therapists.find(t => t.id === patient.therapistId)
  const paymentMethod = paymentMethods.find(pm => pm.id === patient.paymentMethodId)
  const patientConsultations = consultations
    .filter(c => c.patientId === id)
    .sort((a, b) => b.date.localeCompare(a.date))

  const totalPages = Math.ceil(patientConsultations.length / CONSULTATIONS_PER_PAGE)
  const pagedConsultations = patientConsultations.slice(
    consultPage * CONSULTATIONS_PER_PAGE,
    (consultPage + 1) * CONSULTATIONS_PER_PAGE
  )

  const outcomeColors = {
    achieved: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    not_achieved: 'text-red-600 bg-red-50',
  }
  const outcomeLabels = { achieved: 'Alcançado', partial: 'Parcial', not_achieved: 'Não alcançado' }

  // For comorbidades: filter out the primary diagnosis
  const comorbidadeIds = (patient.conditionIds || patient.conditions || []).filter(condId => {
    const diag = diagnoses.find(d => d.id === condId)
    return diag && diag.name !== patient.diagnosis
  })

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/admin/pacientes')} className="mt-1 p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <FiArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-14 h-14 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-brand-blue font-bold text-2xl shrink-0">
              {patient.fullName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{patient.fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-gray-500">{calculateAge(patient.dateOfBirth)}</span>
                <span className="text-gray-300">•</span>
                {patientStatus
                  ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${patientStatus.color}`}>{patientStatus.name}</span>
                  : <Badge patientStatus={patient.status} />
                }
                {patient.specialties?.map(s => <Badge key={s} specialty={s} />)}
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowEdit(true)} className="shrink-0">
              <FiEdit2 size={14} /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-none">
        <div className="flex gap-0 min-w-max">
          {tabs.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tid
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Resumo ── */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Dados Pessoais */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Dados Pessoais</h3>
            {[
              { label: 'Nome Completo', value: patient.fullName },
              { label: 'Data de Nascimento', value: formatDateBR(patient.dateOfBirth) },
              { label: 'Idade', value: calculateAge(patient.dateOfBirth) },
              { label: 'Sexo', value: patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Feminino' : 'Outro' },
              { label: 'CPF', value: patient.cpf || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900 text-right">{value}</span>
              </div>
            ))}
            {/* Terapeuta Principal */}
            <div className="flex justify-between items-center text-sm pt-1 border-t border-gray-50">
              <span className="text-gray-500">Terapeuta Principal</span>
              {primaryTherapist ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">
                    {primaryTherapist.name.charAt(0)}
                  </div>
                  <span className="font-medium text-gray-900">{primaryTherapist.name}</span>
                  {primaryTherapist.specialty && <Badge specialty={primaryTherapist.specialty} />}
                </div>
              ) : <span className="text-gray-400">—</span>}
            </div>
          </div>

          {/* Informações Clínicas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Informações Clínicas</h3>
            <div className="text-sm">
              <span className="text-gray-500 block mb-0.5">Diagnóstico Principal</span>
              <span className="font-medium text-gray-900">{patient.diagnosis || '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1.5">Comorbidades</span>
              <div className="flex flex-wrap gap-1">
                {comorbidadeIds.length === 0 ? (
                  <span className="text-gray-400">—</span>
                ) : comorbidadeIds.map(condId => {
                  const diag = diagnoses.find(d => d.id === condId)
                  return (
                    <span key={condId} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-700">
                      {diag ? diag.name : condId}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="text-sm flex justify-between">
              <span className="text-gray-500">Forma de Pagamento</span>
              <span className="font-medium text-gray-900">{paymentMethod?.name || '—'}</span>
            </div>
          </div>

          {/* Responsáveis */}
          {linkedGuardians.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">Responsáveis</h3>
              <div className="space-y-3">
                {linkedGuardians.map(g => (
                  <div key={g.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
                      {g.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">{g.fullName}</div>
                      <div className="text-xs text-gray-500">{g.relationship}</div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {g.phone && <span className="flex items-center gap-1 text-xs text-gray-500"><FiPhone size={10} />{g.phone}</span>}
                        {g.email && <span className="flex items-center gap-1 text-xs text-gray-500"><FiMail size={10} />{g.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {patient.notes && (
            <div className="bg-brand-yellow/10 rounded-2xl p-5 border border-brand-yellow/20">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">Observações Gerais</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{patient.notes}</p>
            </div>
          )}

          {/* Últimas consultas */}
          {patientConsultations.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Últimas Consultas
                  <span className="ml-2 text-xs font-normal text-gray-400">({patientConsultations.length} no total)</span>
                </h3>
                <button onClick={() => setActiveTab('consultas')} className="text-xs text-brand-blue hover:underline">
                  Ver todas
                </button>
              </div>
              <div className="space-y-2">
                {patientConsultations.slice(0, 10).map(c => {
                  const t = therapists.find(th => th.id === c.therapistId)
                  const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
                  const apptType = appointmentTypes.find(at => at.id === c.appointmentTypeId)
                  return (
                    <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{formatDateShort(c.date)}</span>
                        <Badge specialty={c.specialty} />
                        {status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>}
                        {apptType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">{apptType.name}</span>}
                        <span className="text-xs text-gray-500">{t?.name || '—'}</span>
                      </div>
                      {c.mainObjective && <p className="text-xs text-gray-600 mt-1 line-clamp-1">{c.mainObjective}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Consultas ── */}
      {activeTab === 'consultas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{patientConsultations.length} Registro(s) de Consulta</h3>
            {totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <button
                  onClick={() => setConsultPage(p => Math.max(0, p - 1))}
                  disabled={consultPage === 0}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  <FiChevronLeft size={14} />
                </button>
                <span className="text-xs">{consultPage + 1} / {totalPages}</span>
                <button
                  onClick={() => setConsultPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={consultPage === totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
          {patientConsultations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <FiClipboard size={32} className="mx-auto mb-3 opacity-40" />
              <p>Nenhum registro de consulta ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedConsultations.map(c => {
                const therapist = therapists.find(t => t.id === c.therapistId)
                const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
                const apptType = appointmentTypes.find(at => at.id === c.appointmentTypeId)
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge specialty={c.specialty} />
                      <span className="text-sm font-medium text-gray-900">{formatDateShort(c.date)}</span>
                      {status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>}
                      {apptType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{apptType.name}</span>}
                      <span className="text-xs text-gray-400">{therapist?.name}</span>
                    </div>
                    {c.mainObjective && <p className="text-sm text-gray-700 mb-2"><strong>Objetivo:</strong> {c.mainObjective}</p>}
                    {c.evolutionNotes && <p className="text-sm text-gray-600 mb-2">{c.evolutionNotes}</p>}
                    {c.activities?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {c.activities.map(act => (
                          <div key={act.id} className="flex items-start gap-2 bg-gray-50 rounded-xl p-2.5">
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${outcomeColors[act.outcome]}`}>
                              {outcomeLabels[act.outcome]}
                            </span>
                            <div>
                              <div className="text-xs font-medium text-gray-900">{act.name}</div>
                              {act.description && <div className="text-xs text-gray-500">{act.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.guardianFeedback && (
                      <div className="mt-3 p-3 bg-brand-yellow/10 rounded-xl border border-brand-yellow/20">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Orientação ao Responsável</div>
                        <p className="text-sm text-gray-700">{c.guardianFeedback}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Responsáveis ── */}
      {activeTab === 'responsaveis' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">{linkedGuardians.length} Responsável(is)</h3>
          {linkedGuardians.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <FiUser size={32} className="mx-auto mb-3 opacity-40" />
              <p>Nenhum responsável vinculado.</p>
              <p className="text-xs mt-1">Edite o paciente para adicionar responsáveis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedGuardians.map(g => (
                <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                      {g.fullName?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{g.fullName}</h4>
                      <span className="text-xs text-gray-500">{g.relationship}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiPhone size={13} className="text-gray-400" />
                      {g.phone || '—'}
                    </div>
                    {g.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FiMail size={13} className="text-gray-400" />
                        {g.email}
                      </div>
                    )}
                    {g.cpf && <div className="text-xs text-gray-400">CPF: {g.cpf}</div>}
                    {g.occupation && <div className="text-xs text-gray-400">Profissão: {g.occupation}</div>}
                  </div>
                  {g.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">{g.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEdit && (
        <PatientFormModal onClose={() => setShowEdit(false)} initial={patient} />
      )}
    </div>
  )
}
