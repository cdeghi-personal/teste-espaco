import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiEdit2, FiUser, FiPhone, FiMail } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import PatientFormModal from './PatientFormModal'
import { calculateAge, formatDateBR, formatDateShort } from '../../../utils/dateUtils'
import { hexTextColor } from '../../../utils/colorUtils'


export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getPatientById, getGuardiansForPatient, consultations, therapists, paymentMethods, patientStatuses, diagnoses, consultationStatuses, appointmentTypes, rooms, specialtiesData, logAudit } = useData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [showEdit, setShowEdit] = useState(false)

  const patient = getPatientById(id)

  useEffect(() => {
    if (patient) logAudit('VIEW', 'patients', patient.id, patient.fullName)
  }, [id, patient?.id])

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
  const involvedTherapists = (patient.involvedTherapistIds || [])
    .map(tid => therapists.find(t => t.id === tid))
    .filter(Boolean)
  const paymentMethod = paymentMethods.find(pm => pm.id === patient.paymentMethodId)
  const patientConsultations = consultations
    .filter(c => c.patientId === id)
    .sort((a, b) => b.date.localeCompare(a.date))

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
                {patient.specialties?.map(s => <Badge key={s.key} specialty={s.key} />)}
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowEdit(true)} className="shrink-0">
              <FiEdit2 size={14} /> Editar
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo */}
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

          {/* Terapeutas */}
          {(primaryTherapist || involvedTherapists.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Terapeutas</h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Gerente do Caso</span>
                {primaryTherapist ? (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: primaryTherapist.color || '#6b7280', color: hexTextColor(primaryTherapist.color || '#6b7280') }}
                    >
                      {primaryTherapist.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{primaryTherapist.name}</span>
                    {primaryTherapist.specialty && <Badge specialty={primaryTherapist.specialty} />}
                  </div>
                ) : <span className="text-gray-400">—</span>}
              </div>
              {involvedTherapists.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500 block mb-2">Terapeutas Envolvidos</span>
                  <div className="flex flex-wrap gap-2">
                    {involvedTherapists.map(t => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: t.color || '#6b7280', color: hexTextColor(t.color || '#6b7280') }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {patient.specialties?.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500 block mb-2">Especialidades em Atendimento</span>
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-gray-500">Especialidade</th>
                          {isAdmin && <th className="text-left px-3 py-2 font-semibold text-gray-500">Valor Paciente</th>}
                          {isAdmin && <th className="text-left px-3 py-2 font-semibold text-gray-500">Valor Terapeuta</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {patient.specialties.map(s => {
                          const spec = specialtiesData.find(sd => sd.key === s.key)
                          const color = spec?.color || '#6b7280'
                          return (
                            <tr key={s.key} className="border-t border-gray-100">
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color, color: hexTextColor(color) }}>
                                  {spec?.label || s.key}
                                </span>
                              </td>
                              {isAdmin && <td className="px-3 py-2 text-gray-700">{s.patientValue != null && s.patientValue !== '' ? `R$ ${Number(s.patientValue).toFixed(2)}` : '—'}</td>}
                              {isAdmin && <td className="px-3 py-2 text-gray-700">{s.therapistValue != null && s.therapistValue !== '' ? `R$ ${Number(s.therapistValue).toFixed(2)}` : '—'}</td>}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  Últimos Atendimentos
                  <span className="ml-2 text-xs font-normal text-gray-400">({patientConsultations.length} no total)</span>
                </h3>
              </div>
              <div className="space-y-2">
                {patientConsultations.slice(0, 10).map(c => {
                  const t = therapists.find(th => th.id === c.therapistId)
                  const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
                  const apptType = appointmentTypes.find(at => at.id === c.appointmentTypeId)
                  const room = rooms.find(r => r.id === c.roomId)
                  return (
                    <div key={c.id} className="bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{formatDateShort(c.date)}{c.time && <span className="font-normal text-gray-500"> {c.time}</span>}</span>
                        <Badge specialty={c.specialty} />
                        {status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>}
                        {apptType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">{apptType.name}</span>}
                        <span className="text-xs text-gray-500">{t?.name || '—'}</span>
                        {room && <span className="text-xs text-gray-400">{room.name}</span>}
                      </div>
                      {c.mainObjective && <p className="text-xs text-gray-600 mt-1 line-clamp-1">{c.mainObjective}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
      </div>

      {showEdit && (
        <PatientFormModal onClose={() => setShowEdit(false)} initial={patient} />
      )}
    </div>
  )
}
