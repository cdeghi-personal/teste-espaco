import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiRepeat } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { generateId } from '../../../utils/storageUtils'
import { isoToday } from '../../../utils/dateUtils'

const EMPTY_ACTIVITY = { id: '', name: '', description: '', outcome: 'achieved' }

const EMPTY = {
  patientId: '', therapistId: '', specialty: '', date: isoToday(), time: '',
  consultationStatusId: '', appointmentTypeId: '', roomId: '',
  mainObjective: '', activities: [],
  evolutionNotes: '', nextObjectives: '',
  sessionQuality: 'good', guardianFeedback: '', appointmentId: '',
  secondaryTherapists: [],
}

export default function ConsultationFormModal({ onClose, initial = {}, readOnly = false }) {
  const { patients, therapists, specialtiesData, rooms, consultationStatuses, appointmentTypes, appointments, addConsultation, updateConsultation, updateConsultationSeries, getPrepaidData } = useData()
  const { user } = useAuth()
  const isEdit = !!initial.id

  const defaultStatusId = !isEdit
    ? (consultationStatuses.find(s => s.active !== false && s.name.toLowerCase().includes('agendada'))?.id || '')
    : ''

  const [newActivityDraft, setNewActivityDraft] = useState(null)
  const [form, setForm] = useState({
    ...EMPTY,
    therapistId: user?.id || '',
    ...initial,
    consultationStatusId: initial.consultationStatusId || defaultStatusId,
    activities: initial.activities ? [...initial.activities.map(a => ({ ...a }))] : [],
    secondaryTherapists: (initial.consultationTherapists || [])
      .filter(t => !t.isPrimary)
      .map(t => ({ tempId: generateId(), therapistId: t.therapistId, specialty: t.specialty })),
  })
  const [errors, setErrors] = useState({})
  const [prepaidBalance, setPrepaidBalance] = useState(null)
  const [confirmSeriesEdit, setConfirmSeriesEdit] = useState(false)

  const hasSeries = isEdit && !!initial.seriesId

  useEffect(() => {
    if (!form.patientId || !form.specialty) { setPrepaidBalance(null); return }
    const patient = patients.find(p => p.id === form.patientId)
    const spec = (patient?.specialties || []).find(s => s.key === form.specialty)
    if (spec?.paymentType !== 'PREPAID_PACKAGE') { setPrepaidBalance(null); return }
    let cancelled = false
    getPrepaidData(form.patientId, form.specialty).then(d => {
      if (!cancelled) setPrepaidBalance(d.balance)
    })
    return () => { cancelled = true }
  }, [form.patientId, form.specialty, patients, getPrepaidData])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function confirmNewActivity() {
    if (!newActivityDraft?.name?.trim()) return
    set('activities', [...form.activities, { ...EMPTY_ACTIVITY, ...newActivityDraft, id: generateId() }])
    setNewActivityDraft(null)
  }

  function updateActivity(idx, field, value) {
    const acts = [...form.activities]
    acts[idx] = { ...acts[idx], [field]: value }
    set('activities', acts)
  }

  function removeActivity(idx) {
    set('activities', form.activities.filter((_, i) => i !== idx))
  }

  function addSecondaryTherapist() {
    set('secondaryTherapists', [...form.secondaryTherapists, { tempId: generateId(), therapistId: '', specialty: '' }])
  }

  function updateSecondaryTherapist(tempId, field, value) {
    set('secondaryTherapists', form.secondaryTherapists.map(t => t.tempId === tempId ? { ...t, [field]: value } : t))
  }

  function removeSecondaryTherapist(tempId) {
    set('secondaryTherapists', form.secondaryTherapists.filter(t => t.tempId !== tempId))
  }

  function validate() {
    const e = {}
    if (!form.patientId) e.patientId = 'Selecione o paciente'
    if (!form.therapistId) e.therapistId = 'Selecione o terapeuta'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!form.time) e.time = 'Informe o horário'
    if (!form.roomId) e.roomId = 'Selecione a sala'
    if (!form.consultationStatusId) e.consultationStatusId = 'Selecione o status'
    if (!form.appointmentTypeId) e.appointmentTypeId = 'Selecione o tipo'
    const selectedStatus = consultationStatuses.find(s => s.id === form.consultationStatusId)
    if (selectedStatus?.name?.toLowerCase().includes('realizada')) {
      if (!form.mainObjective.trim()) e.mainObjective = 'Informe o objetivo da sessão'
      if (!form.evolutionNotes.trim()) e.evolutionNotes = 'Informe o relato da sessão / evolução'
      if (!form.nextObjectives.trim()) e.nextObjectives = 'Informe o objetivo da próxima sessão'
    }
    if (selectedStatus?.requiresObjectiveNote && !form.mainObjective.trim()) {
      e.mainObjective = 'Este status exige uma observação no Objetivo da Sessão'
    }
    // Validações de terapeutas secundários
    const secIds = form.secondaryTherapists.map(t => t.therapistId).filter(Boolean)
    if (secIds.includes(form.therapistId)) {
      e.secondaryTherapists = 'O terapeuta principal não pode ser adicionado como participante'
    } else if (new Set(secIds).size !== secIds.length) {
      e.secondaryTherapists = 'Há terapeutas duplicados na lista de participantes'
    } else {
      const patient = patients.find(p => p.id === form.patientId)
      const allSpecialties = [form.specialty, ...form.secondaryTherapists.map(t => t.specialty)].filter(Boolean)
      const prepaidCount = allSpecialties.filter(sp => {
        const spec = (patient?.specialties || []).find(s => s.key === sp)
        return spec?.paymentType === 'PREPAID_PACKAGE'
      }).length
      if (prepaidCount > 1) {
        e.secondaryTherapists = 'Apenas uma especialidade pré-paga por atendimento é permitida'
      }
    }
    // Em atendimentos com múltiplos terapeutas, o principal deve ser da equipe
    if (!e.therapistId && secIds.length > 0) {
      const primaryTherapist = therapists.find(t => t.id === form.therapistId)
      if (primaryTherapist && !primaryTherapist.belongsToTeam) {
        e.therapistId = 'Em atendimentos com múltiplos terapeutas, o terapeuta principal deve ser um profissional da equipe. Terapeutas externos podem ser incluídos apenas como participantes adicionais.'
      }
    }
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    // Terapeuta principal (admin ou não) escolhe escopo ao editar série
    if (hasSeries && (isAdmin || user?.id === initial.therapistId)) {
      setConfirmSeriesEdit(true)
      return
    }
    // Caso restante: terapeuta adicional ou sem série — salva como ocorrência individual
    const saveData = hasSeries ? { ...form, isSeriesException: true } : form
    if (isEdit) updateConsultation(initial.id, saveData)
    else addConsultation(saveData)
    onClose()
  }

  function doSave(scope) {
    const saveData = { ...form }
    if (scope === 'single') saveData.isSeriesException = true
    if (isEdit) {
      updateConsultation(initial.id, saveData)
      if (scope === 'forward') {
        updateConsultationSeries(initial.seriesId, initial.date, {
          time: form.time,
          roomId: form.roomId,
          appointmentTypeId: form.appointmentTypeId,
          therapistId: form.therapistId,
          specialty: form.specialty,
        })
      }
    } else {
      addConsultation(saveData)
    }
    onClose()
  }

  const activeTherapists = therapists.filter(t => t.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const activeStatuses = consultationStatuses.filter(s => s.active !== false && (user?.role === 'admin' || !s.automatic))
  const currentStatus = isEdit ? consultationStatuses.find(s => s.id === initial.consultationStatusId) : null
  const isAdmin  = user?.role === 'admin'
  const isAdminOrTeam = isAdmin || user?.belongsToTeam
  const canManageSecondary = isAdmin || (user?.belongsToTeam && user?.id === form.therapistId)
  const isBlocked = isEdit && currentStatus?.automatic && !isAdmin
  const activeAppointmentTypes = appointmentTypes.filter(t => t.active !== false)
  const activeRooms = rooms.filter(r => r.active !== false)
  const patientAppointments = form.patientId
    ? appointments.filter(a => a.patientId === form.patientId && !a.consultationId)
    : []

  const title = readOnly ? 'Visualizar Atendimento' : isEdit ? 'Editar Registro de Atendimento' : 'Novo Registro de Atendimento'
  const selectedStatus = consultationStatuses.find(s => s.id === form.consultationStatusId)
  const realizadaRequired = selectedStatus?.name?.toLowerCase().includes('realizada')
  const requiresNote = selectedStatus?.requiresObjectiveNote === true
  const mainObjectiveRequired = realizadaRequired || requiresNote
  const willConsume = selectedStatus?.consumesPrepaidSession === true
  const showPrepaidAlert = prepaidBalance !== null && willConsume && prepaidBalance <= 0
  const showConsumedChip = isEdit && initial.prepaidSessionConsumed !== undefined

  const payPerSessionSpec = form.patientId && form.specialty
    ? patients.find(p => p.id === form.patientId)?.specialties?.find(s => s.key === form.specialty && s.paymentType === 'PAY_PER_SESSION')
    : null

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="xl"
      footer={
        readOnly
          ? <Button variant="ghost" onClick={onClose}>Fechar</Button>
          : confirmSeriesEdit
          ? <>
              <Button variant="ghost" onClick={() => setConfirmSeriesEdit(false)}>Voltar</Button>
              <Button variant="outline" onClick={() => doSave('single')}>Apenas esta</Button>
              <Button variant="primary" onClick={() => doSave('forward')}>Esta e as próximas</Button>
            </>
          : <>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              {!isBlocked && <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Registrar Atendimento'}</Button>}
            </>
      }
    >
      <div className="space-y-6">
        {hasSeries && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <FiRepeat size={11} />
            Consulta recorrente
          </div>
        )}
        {confirmSeriesEdit && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <FiRepeat size={15} className="shrink-0 mt-0.5" />
            <span>Esta consulta faz parte de uma série. <strong>Apenas esta</strong> salva só este registro (marca como exceção). <strong>Esta e as próximas</strong> aplica horário, sala, terapeuta, especialidade e tipo de atendimento aos atendimentos futuros não faturados da série.</span>
          </div>
        )}
        {isBlocked && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 border border-amber-200">
            <span className="shrink-0 mt-0.5">⚠️</span>
            Este atendimento está com status <strong>{currentStatus?.name}</strong> (automático) e não pode ser editado.
          </div>
        )}
        {showConsumedChip && (
          <div className="flex items-center gap-2">
            {initial.prepaidSessionConsumed
              ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Consumiu sessão pré-paga</span>
              : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Não consumiu sessão pré-paga</span>
            }
          </div>
        )}
        {payPerSessionSpec && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs border bg-amber-50 border-amber-200 text-amber-800">
            <span className="shrink-0">ℹ️</span>
            <span>Modalidade <strong>Por Sessão</strong> — cobrança individual por atendimento.</span>
          </div>
        )}
        {prepaidBalance !== null && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-xs border ${showPrepaidAlert ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
            <span className="shrink-0">{showPrepaidAlert ? '⚠️' : 'ℹ️'}</span>
            <span>
              Pacote pré-pago — saldo atual: <strong>{prepaidBalance} {Math.abs(prepaidBalance) === 1 ? 'sessão' : 'sessões'}</strong>.
              {showPrepaidAlert ? ' Saldo insuficiente para consumir esta sessão.' : willConsume ? ' Este status irá debitar 1 sessão.' : ''}
            </span>
          </div>
        )}
        {/* Dados do Atendimento */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados do Atendimento
          </h3>
          <div className="space-y-3">
            <Select label="Paciente *" value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId} disabled={readOnly}>
              <option value="">Selecione o paciente</option>
              {patients.filter(p => !p.deleted).map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Terapeuta *" value={form.therapistId} onChange={e => set('therapistId', e.target.value)} error={errors.therapistId} disabled={readOnly || !isAdminOrTeam}>
                <option value="">Selecione</option>
                {activeTherapists.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              <Input label="Data *" type="date" value={form.date} onChange={e => set('date', e.target.value)} disabled={readOnly} />
              <Input label="Horário *" type="time" value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} disabled={readOnly} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Sala *" value={form.roomId} onChange={e => set('roomId', e.target.value)} error={errors.roomId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Especialidade *" value={form.specialty} onChange={e => set('specialty', e.target.value)} error={errors.specialty} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeSpecialties.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              <Select label="Status Atendimento *" value={form.consultationStatusId} onChange={e => set('consultationStatusId', e.target.value)} error={errors.consultationStatusId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select label="Tipo de Atendimento *" value={form.appointmentTypeId} onChange={e => set('appointmentTypeId', e.target.value)} error={errors.appointmentTypeId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeAppointmentTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>

            {!readOnly && patientAppointments.length > 0 && (
              <Select label="Vincular ao Agendamento" value={form.appointmentId} onChange={e => set('appointmentId', e.target.value)}>
                <option value="">Nenhum / Avulso</option>
                {patientAppointments.map(a => (
                  <option key={a.id} value={a.id}>{a.date} {a.time} — {specialtiesData.find(s => s.key === a.specialty)?.label || a.specialty}</option>
                ))}
              </Select>
            )}
          </div>
        </section>

        {/* Terapeutas Adicionais — visível para quem pode gerenciar ou quando já há participantes */}
        {(canManageSecondary || form.secondaryTherapists.length > 0) && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
              Terapeutas Adicionais
            </h3>
            <div className="space-y-2">
              {form.secondaryTherapists.map(sec => {
                const usedTherapistIds = [form.therapistId, ...form.secondaryTherapists.filter(t => t.tempId !== sec.tempId).map(t => t.therapistId)]
                return (
                  <div key={sec.tempId} className="flex items-end gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Select
                        label="Terapeuta"
                        value={sec.therapistId}
                        onChange={e => updateSecondaryTherapist(sec.tempId, 'therapistId', e.target.value)}
                        disabled={readOnly || !canManageSecondary}
                      >
                        <option value="">Selecione</option>
                        {activeTherapists.filter(t => !usedTherapistIds.includes(t.id)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Select>
                      <Select
                        label="Especialidade"
                        value={sec.specialty}
                        onChange={e => updateSecondaryTherapist(sec.tempId, 'specialty', e.target.value)}
                        disabled={readOnly || !canManageSecondary}
                      >
                        <option value="">Selecione</option>
                        {activeSpecialties.map(s => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </Select>
                    </div>
                    {!readOnly && canManageSecondary && (
                      <button
                        type="button"
                        onClick={() => removeSecondaryTherapist(sec.tempId)}
                        className="mb-1 p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
              {errors.secondaryTherapists && (
                <p className="text-xs text-red-500">{errors.secondaryTherapists}</p>
              )}
              {!readOnly && canManageSecondary && (
                <button
                  type="button"
                  onClick={addSecondaryTherapist}
                  className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1"
                >
                  <FiPlus size={14} /> Adicionar terapeuta
                </button>
              )}
            </div>
          </section>
        )}

        {/* Objetivo principal */}
        <section>
          {requiresNote && !readOnly && (
            <div className="flex items-start gap-2 p-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>Este status exige uma observação. Informe no Objetivo da Sessão as razões ou contexto da alteração do status do atendimento.</span>
            </div>
          )}
          <Textarea
            label={mainObjectiveRequired ? 'Objetivo Principal da Sessão *' : 'Objetivo Principal da Sessão'}
            value={form.mainObjective}
            onChange={e => set('mainObjective', e.target.value)}
            error={errors.mainObjective}
            placeholder="Descreva o objetivo terapêutico desta sessão..."
            rows={2}
            disabled={readOnly}
          />
        </section>

        {/* Atividades */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Atividades Realizadas ({form.activities.length})
          </h3>

          <div className="space-y-3">
            {form.activities.map((act, idx) => (
              <div key={act.id} className="bg-gray-50 rounded-xl p-4 relative">
                {!readOnly && (
                  <button onClick={() => removeActivity(idx)} className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                )}
                <div className="text-xs font-semibold text-gray-500 mb-3">Atividade {idx + 1}</div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input label="Nome da Atividade" value={act.name} onChange={e => updateActivity(idx, 'name', e.target.value)} placeholder="Ex: Jogo de encaixe, treino de marcha..." disabled={readOnly} />
                    <Select label="Resultado" value={act.outcome} onChange={e => updateActivity(idx, 'outcome', e.target.value)} disabled={readOnly}>
                      <option value="achieved">Objetivo Alcançado</option>
                      <option value="partial">Parcialmente Alcançado</option>
                      <option value="not_achieved">Não Alcançado</option>
                    </Select>
                  </div>
                  <Textarea label="Descrição" value={act.description} onChange={e => updateActivity(idx, 'description', e.target.value)} placeholder="Como a atividade foi realizada..." rows={2} disabled={readOnly} />
                </div>
              </div>
            ))}

            {!readOnly && (newActivityDraft ? (
              <div className="rounded-xl border-2 border-brand-blue border-dashed p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input label="Nome da Atividade *" value={newActivityDraft.name} onChange={e => setNewActivityDraft(d => ({ ...d, name: e.target.value }))} placeholder="Ex: Jogo de encaixe, treino de marcha..." autoFocus />
                  <Select label="Resultado" value={newActivityDraft.outcome} onChange={e => setNewActivityDraft(d => ({ ...d, outcome: e.target.value }))}>
                    <option value="achieved">Objetivo Alcançado</option>
                    <option value="partial">Parcialmente Alcançado</option>
                    <option value="not_achieved">Não Alcançado</option>
                  </Select>
                </div>
                <Textarea label="Descrição" value={newActivityDraft.description} onChange={e => setNewActivityDraft(d => ({ ...d, description: e.target.value }))} placeholder="Como a atividade foi realizada..." rows={2} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setNewActivityDraft(null)}>Cancelar</Button>
                  <Button variant="primary" onClick={confirmNewActivity}>Adicionar</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNewActivityDraft({ name: '', description: '', outcome: 'achieved' })} className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1">
                <FiPlus size={14} /> Adicionar atividade
              </button>
            ))}
          </div>
        </section>

        {/* Evolução */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Evolução e Observações
          </h3>
          <div className="space-y-3">
            <Textarea
              label={realizadaRequired ? 'Relato da Sessão / Evolução *' : 'Relato da Sessão / Evolução'}
              value={form.evolutionNotes}
              onChange={e => set('evolutionNotes', e.target.value)}
              error={errors.evolutionNotes}
              placeholder="Evolução clínica, comparação com sessões anteriores..."
              rows={3}
              disabled={readOnly}
            />
            <Textarea
              label={realizadaRequired ? 'Objetivo da Próxima Sessão *' : 'Objetivo da Próxima Sessão'}
              value={form.nextObjectives}
              onChange={e => set('nextObjectives', e.target.value)}
              error={errors.nextObjectives}
              placeholder="Metas e foco para a próxima sessão..."
              rows={2}
              disabled={readOnly}
            />
            <Textarea label="Orientações Passadas ao Responsável" value={form.guardianFeedback} onChange={e => set('guardianFeedback', e.target.value)} placeholder="O que foi comunicado ao responsável ao final da sessão..." rows={2} disabled={readOnly} />
          </div>
        </section>

        {/* Seção NF — admin sempre vê em edição; terapeuta vê apenas se já preenchido */}
        {isEdit && (isAdmin || initial.nfNumber || initial.nfIssueDate) && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nota Fiscal / Faturamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Número da NF"
                value={form.nfNumber || ''}
                onChange={e => set('nfNumber', e.target.value)}
                placeholder="Ex.: 000123"
                disabled={!isAdmin}
              />
              <Input
                label="Data de Emissão"
                type="date"
                value={form.nfIssueDate || ''}
                onChange={e => set('nfIssueDate', e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            {initial.previousStatusBeforeInvoice && (() => {
              const prevStatus = consultationStatuses.find(s => s.id === initial.previousStatusBeforeInvoice)
              return prevStatus ? (
                <p className="text-xs text-gray-400">
                  Status anterior ao faturamento: <span className="font-medium text-gray-600">{prevStatus.name}</span>
                </p>
              ) : null
            })()}
          </section>
        )}
      </div>
    </Modal>
  )
}
