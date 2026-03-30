import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiClipboard, FiUser, FiPhone, FiMail } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import PatientFormModal from './PatientFormModal'
import { calculateAge, formatDateBR, formatDateShort } from '../../../utils/dateUtils'
import { SPECIALTIES } from '../../../constants/specialties'

const tabs = [
  { id: 'dados', label: 'Dados', icon: FiUser },
  { id: 'consultas', label: 'Consultas', icon: FiClipboard },
  { id: 'responsaveis', label: 'Responsáveis', icon: FiUser },
]

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPatientById, getGuardiansForPatient, consultations, therapists, paymentMethods, patientStatuses, diagnoses } = useData()
  const [activeTab, setActiveTab] = useState('dados')
  const [showEdit, setShowEdit] = useState(false)

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
  const secondaryTherapists = (patient.secondaryTherapistIds || [])
    .map(tid => therapists.find(t => t.id === tid))
    .filter(Boolean)
  const paymentMethod = paymentMethods.find(pm => pm.id === patient.paymentMethodId)

  const patientConsultations = consultations
    .filter(c => c.patientId === id)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="p-3 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/admin/pacientes')} className="mt-1 p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <FiArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-2xl bg-brand-yellow/20 flex items-center justify-center text-brand-blue font-bold text-2xl">
              {patient.fullName?.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">{patient.fullName}</h1>
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
            <div className="ml-auto">
              <Button variant="outline" onClick={() => setShowEdit(true)}>
                <FiEdit2 size={14} /> Editar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tid
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dados */}
      {activeTab === 'dados' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Dados Pessoais</h3>
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
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Informações Clínicas</h3>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Diagnóstico Principal</span>
              <span className="font-medium text-gray-900">{patient.diagnosis || '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 block mb-2">Condições Associadas</span>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const ids = patient.conditionIds || patient.conditions || []
                  if (!ids.length) return <span className="text-gray-400">—</span>
                  return ids.map(idOrName => {
                    const diag = diagnoses.find(d => d.id === idOrName || d.name === idOrName)
                    return (
                      <span key={idOrName} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                        {diag ? diag.name : idOrName}
                      </span>
                    )
                  })
                })()}
              </div>
            </div>
            <div className="text-sm flex justify-between">
              <span className="text-gray-500">Forma de Pagamento</span>
              <span className="font-medium text-gray-900">{paymentMethod?.name || '—'}</span>
            </div>
          </div>

          {/* Terapeutas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Terapeutas</h3>
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">Terapeuta Principal</span>
              {primaryTherapist ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">
                    {primaryTherapist.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{primaryTherapist.name}</span>
                    {primaryTherapist.specialty && (
                      <Badge specialty={primaryTherapist.specialty} className="ml-2" />
                    )}
                  </div>
                </div>
              ) : <span className="text-gray-400">—</span>}
            </div>
            {secondaryTherapists.length > 0 && (
              <div className="text-sm">
                <span className="text-gray-500 block mb-2">Terapeutas Secundários</span>
                <div className="space-y-2">
                  {secondaryTherapists.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <span className="text-gray-900">{t.name}</span>
                      {t.specialty && <Badge specialty={t.specialty} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {patient.notes && (
            <div className="bg-brand-yellow/10 rounded-2xl p-6 border border-brand-yellow/20">
              <h3 className="font-semibold text-gray-900 mb-2">Observações</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{patient.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Consultas */}
      {activeTab === 'consultas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{patientConsultations.length} Registro(s) de Consulta</h3>
          </div>
          {patientConsultations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <FiClipboard size={32} className="mx-auto mb-3 opacity-40" />
              <p>Nenhum registro de consulta ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientConsultations.map(c => {
                const therapist = therapists.find(t => t.id === c.therapistId)
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge specialty={c.specialty} />
                        <span className="text-sm font-medium text-gray-900">{formatDateShort(c.date)}</span>
                        <span className="text-xs text-gray-500">Sessão #{c.sessionNumber}</span>
                      </div>
                      <Badge quality={c.sessionQuality} />
                    </div>
                    <p className="text-sm text-gray-700 mb-2"><strong>Objetivo:</strong> {c.mainObjective}</p>
                    <p className="text-sm text-gray-600 mb-2">{c.evolutionNotes}</p>
                    <p className="text-xs text-gray-400">{therapist?.name}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Responsáveis */}
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
                <div key={g.id} className="bg-white rounded-2xl border border-gray-100 p-6">
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
                    {g.cpf && (
                      <div className="text-xs text-gray-400">CPF: {g.cpf}</div>
                    )}
                    {g.occupation && (
                      <div className="text-xs text-gray-400">Profissão: {g.occupation}</div>
                    )}
                  </div>
                  {g.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                      {g.notes}
                    </div>
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
