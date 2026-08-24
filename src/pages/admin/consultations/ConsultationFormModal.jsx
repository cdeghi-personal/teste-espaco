import { useState, useEffect } from 'react'
import { FiPlus, FiTrash2, FiRepeat, FiVideo, FiMapPin, FiExternalLink } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { generateId } from '../../../utils/storageUtils'
import { isoToday } from '../../../utils/dateUtils'
import { detectConflicts, buildConflictTooltip } from '../../../utils/conflictUtils'
import { PAYMENT_TYPE_LABELS } from '../../../constants/paymentTypes'

const EMPTY_ACTIVITY = { id: '', name: '', description: '', outcome: 'achieved' }

const EMPTY = {
  patientId: '', therapistId: '', specialty: '', date: isoToday(), time: '',
  consultationStatusId: '', appointmentTypeId: '', roomId: '',
  eventType: 'SESSION', interviewFormat: '', meetingPlatform: '', meetingLink: '', intervieweeName: '',
  notes: '', mainObjective: '', activities: [],
  evolutionNotes: '', nextObjectives: '',
  sessionQuality: 'good', guardianFeedback: '', appointmentId: '',
  secondaryTherapists: [],
  willHaveReplacement: null,
}

const EMPTY_REPLACEMENT_DRAFT = { date: '', time: '', roomId: '', therapistId: '', specialty: '', appointmentTypeId: '', secondaryTherapists: [] }

function fmtShortDate(iso) {
  if (!iso) return ''
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

export default function ConsultationFormModal({ onClose, initial = {}, readOnly = false, onEditRequest = null, onNavigate = null }) {
  const { patients, therapists, specialtiesData, rooms, consultationStatuses, appointmentTypes, appointments, addConsultation, updateConsultation, createConsultationReplacement, updateConsultationSeries, getPrepaidData, consultations, calendarBlocks } = useData()
  const { user } = useAuth()
  const isEdit = !!initial.id

  const defaultStatusId = !isEdit
    ? (
        consultationStatuses.find(s => s.active !== false && s.isSchedulingDefault)?.id
        || consultationStatuses.find(s => s.active !== false && s.name.toLowerCase().includes('agendada'))?.id
        || ''
      )
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
  const [conflictsToConfirm, setConflictsToConfirm] = useState(null) // null | conflicts[]
  const [pendingConflicts, setPendingConflicts] = useState([])
  const [saving, setSaving] = useState(false)
  const [replicateNextObjective, setReplicateNextObjective] = useState(true)
  const [replacementDraft, setReplacementDraft] = useState(EMPTY_REPLACEMENT_DRAFT)
  const [replacementConflictsToConfirm, setReplacementConflictsToConfirm] = useState(null)
  const { show } = useToast()

  const hasSeries = isEdit && !!initial.seriesId

  // Reposição — derivados calculados ao vivo a partir de `consultations` (sem state próprio)
  const selectedStatusForReplacement = consultationStatuses.find(s => s.id === form.consultationStatusId)
  const showsReplacementQuestion = isEdit && form.eventType === 'SESSION' && selectedStatusForReplacement?.requestsReplacementDecision === true
  const linkedReplacement = isEdit ? consultations.find(c => c.replacementForConsultationId === initial.id) : null
  const originalConsultation = initial.replacementForConsultationId
    ? consultations.find(c => c.id === initial.replacementForConsultationId)
    : null
  const schedulingDefaultStatus = consultationStatuses.find(s => s.isSchedulingDefault && s.active !== false)

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

  // Troca manual de status: reseta a decisão de reposição (não se aplica mais / se aplica de novo do zero)
  function handleStatusChange(newStatusId) {
    set('consultationStatusId', newStatusId)
    set('willHaveReplacement', null)
    setReplacementDraft(EMPTY_REPLACEMENT_DRAFT)
  }

  function openReplacementDraft() {
    set('willHaveReplacement', true)
    setReplacementDraft({
      date: '', time: '',
      roomId: form.roomId, therapistId: form.therapistId, specialty: form.specialty, appointmentTypeId: form.appointmentTypeId,
      secondaryTherapists: form.secondaryTherapists.map(t => ({ ...t, tempId: generateId() })),
    })
  }

  function setReplacementField(field, value) {
    setReplacementDraft(d => ({ ...d, [field]: value }))
    setErrors(e => ({ ...e, [`replacement${field.charAt(0).toUpperCase()}${field.slice(1)}`]: undefined }))
  }

  function addReplacementSecondaryTherapist() {
    setReplacementDraft(d => ({ ...d, secondaryTherapists: [...d.secondaryTherapists, { tempId: generateId(), therapistId: '', specialty: '' }] }))
  }

  function updateReplacementSecondaryTherapist(tempId, field, value) {
    setReplacementDraft(d => ({ ...d, secondaryTherapists: d.secondaryTherapists.map(t => t.tempId === tempId ? { ...t, [field]: value } : t) }))
  }

  function removeReplacementSecondaryTherapist(tempId) {
    setReplacementDraft(d => ({ ...d, secondaryTherapists: d.secondaryTherapists.filter(t => t.tempId !== tempId) }))
  }

  const isRemoteInterview = form.eventType === 'INTERVIEW' && form.interviewFormat === 'REMOTE'

  function validate() {
    const e = {}
    if (!form.patientId && form.eventType !== 'INTERVIEW') e.patientId = 'Selecione o paciente'
    if (form.eventType === 'INTERVIEW' && !form.intervieweeName?.trim()) e.intervieweeName = 'Informe o nome do(s) entrevistado(s)'
    if (!form.therapistId) e.therapistId = 'Selecione o terapeuta'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!form.time) e.time = 'Informe o horário'
    if (form.eventType === 'INTERVIEW' && !form.interviewFormat) e.interviewFormat = 'Selecione o formato'
    if (!form.roomId && (form.eventType !== 'INTERVIEW' || form.interviewFormat === 'PRESENTIAL')) e.roomId = 'Selecione a sala'
    if (!form.consultationStatusId) e.consultationStatusId = 'Selecione o status'
    if (!form.appointmentTypeId && form.eventType !== 'INTERVIEW') e.appointmentTypeId = 'Selecione o tipo'
    const selectedStatus = consultationStatuses.find(s => s.id === form.consultationStatusId)
    const _showsObservation = selectedStatus?.showsObservation === true
    const _isAwaitingOutcome = selectedStatus?.isAwaitingOutcome === true
    if (_showsObservation) {
      const _requiresObservation = selectedStatus?.requiresObservation !== false
      if (_requiresObservation && !form.notes?.trim()) e.notes = 'Informe a observação do atendimento'
    } else if (form.eventType !== 'INTERVIEW' && !_isAwaitingOutcome) {
      // Status "aguarda desfecho" (ex.: Agendada) representa atendimento que ainda não
      // aconteceu — não faz sentido exigir Objetivo/Relato antes da sessão ocorrer.
      if (!form.mainObjective.trim()) e.mainObjective = 'Informe o objetivo da sessão'
      if (!form.evolutionNotes.trim()) e.evolutionNotes = 'Informe o relato da sessão / evolução'
      // "Objetivo da Próxima Sessão" é sempre opcional
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
    // Decisão de reposição — só quando o status pede e ainda não existe reposição criada
    if (showsReplacementQuestion && !linkedReplacement) {
      if (form.willHaveReplacement == null) {
        e.willHaveReplacement = 'Informe se este atendimento terá reposição'
      } else if (form.willHaveReplacement === true) {
        if (!schedulingDefaultStatus) {
          e.willHaveReplacement = 'Nenhum status padrão de agendamento está configurado. Peça a um administrador para configurar em Status Atendimento.'
        }
        if (!replacementDraft.date) e.replacementDate = 'Informe a data da reposição'
        if (!replacementDraft.time) e.replacementTime = 'Informe o horário da reposição'
        if (!replacementDraft.therapistId) e.replacementTherapistId = 'Selecione o terapeuta da reposição'
        if (!replacementDraft.specialty) e.replacementSpecialty = 'Selecione a especialidade da reposição'
        if (!replacementDraft.roomId) e.replacementRoomId = 'Selecione a sala da reposição'
        if (!replacementDraft.appointmentTypeId) e.replacementAppointmentTypeId = 'Selecione o tipo de atendimento da reposição'
      }
    }
    return e
  }

  function buildConflictInput() {
    return {
      id: initial.id || null,
      date: form.date,
      time: form.time,
      therapistId: form.therapistId,
      roomId: form.roomId,
      eventType: form.eventType,
      interviewFormat: form.interviewFormat,
      consultationTherapists: [
        { therapistId: form.therapistId, isPrimary: true },
        ...(form.secondaryTherapists || []).filter(t => t.therapistId).map(t => ({ therapistId: t.therapistId, isPrimary: false })),
      ],
    }
  }

  function buildReplacementConflictInput() {
    return {
      id: null,
      date: replacementDraft.date,
      time: replacementDraft.time,
      therapistId: replacementDraft.therapistId,
      roomId: replacementDraft.roomId,
      eventType: 'SESSION',
      interviewFormat: null,
      consultationTherapists: [
        { therapistId: replacementDraft.therapistId, isPrimary: true },
        ...(replacementDraft.secondaryTherapists || []).filter(t => t.therapistId).map(t => ({ therapistId: t.therapistId, isPrimary: false })),
      ],
    }
  }

  async function doReplicateObjective() {
    if (!replicateNextObjective || !form.nextObjectives.trim() || !form.patientId) return
    const agendadaIds = consultationStatuses.filter(s => s.isAwaitingOutcome).map(s => s.id)
    const curDT = `${form.date}T${form.time || '00:00'}`
    const next = consultations
      .filter(c =>
        c.id !== initial?.id &&
        c.patientId === form.patientId &&
        (c.therapistId === form.therapistId || c.consultationTherapists?.some(t => t.therapistId === form.therapistId)) &&
        agendadaIds.includes(c.consultationStatusId) &&
        `${c.date}T${c.time || '00:00'}` > curDT
      )
      .sort((a, b) => {
        const da = `${a.date}T${a.time || '00:00'}`
        const db = `${b.date}T${b.time || '00:00'}`
        return da < db ? -1 : 1
      })[0]
    if (!next) return
    await updateConsultation(next.id, { mainObjective: form.nextObjectives })
    const dd = next.date ? `${next.date.slice(8, 10)}/${next.date.slice(5, 7)}` : ''
    const hh = next.time ? ` às ${next.time.slice(0, 5)}` : ''
    show(`Atendimento de ${dd}${hh} teve os objetivos atualizados`, 'success')
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    // Decisão de reposição = Sim: fluxo dedicado, sempre individual (nunca passa por
    // proceedSave/série) e nunca reaproveita a checagem de conflito do atendimento original
    // (que não muda de data/hora/sala nesse fluxo) — só a proposta da própria reposição.
    if (showsReplacementQuestion && form.willHaveReplacement === true && !linkedReplacement) {
      const replConflicts = detectConflicts(buildReplacementConflictInput(), consultations, calendarBlocks, rooms)
      if (replConflicts.length > 0) {
        setReplacementConflictsToConfirm(replConflicts)
        return
      }
      finalizeReplacementSave([])
      return
    }

    const conflicts = detectConflicts(buildConflictInput(), consultations, calendarBlocks, rooms)
    if (conflicts.length > 0) {
      setConflictsToConfirm(conflicts)
      return
    }
    proceedSave([])
  }

  async function finalizeReplacementSave(conflicts) {
    setSaving(true)
    const result = await createConsultationReplacement({
      originalId: initial.id,
      originalUpdateData: applyFieldCleanup(form),
      replacementData: {
        patientId: form.patientId,
        eventType: 'SESSION',
        therapistId: replacementDraft.therapistId,
        specialty: replacementDraft.specialty,
        date: replacementDraft.date,
        time: replacementDraft.time,
        roomId: replacementDraft.roomId,
        appointmentTypeId: replacementDraft.appointmentTypeId,
        consultationStatusId: schedulingDefaultStatus.id,
        secondaryTherapists: replacementDraft.secondaryTherapists,
      },
      conflicts,
    })
    setSaving(false)
    if (result?.error) { show(result.error, 'error'); return }
    show('Atendimento salvo e reposição agendada com sucesso.', 'success')
    onClose()
  }

  async function handleSaveReplacementAnyway() {
    const conflicts = replacementConflictsToConfirm || []
    setReplacementConflictsToConfirm(null)
    await finalizeReplacementSave(conflicts)
  }

  // Aplica limpeza de campos para manter consistência entre modo clínico e administrativo.
  // Regra 1 (requiresNote=true): limpa todos os campos clínicos, mantém apenas notes.
  // Regra 2 (requiresNote=false): limpa notes, mantém campos clínicos.
  function applyFieldCleanup(formData) {
    const status = consultationStatuses.find(s => s.id === formData.consultationStatusId)
    if (status?.showsObservation === true) {
      return {
        ...formData,
        mainObjective: '',
        activities: [],
        evolutionNotes: '',
        nextObjectives: '',
        guardianFeedback: '',
      }
    }
    return { ...formData, notes: '' }
  }

  async function proceedSave(conflicts) {
    const canShowSeriesDialog = hasSeries && isAdmin
    if (canShowSeriesDialog) {
      // Only ask scope when a propagatable (structural) field actually changed.
      // Note fields (mainObjective, sessionReport, nextObjective) are always per-session
      // and are never sent to updateConsultationSeries, so no dialog is needed for them.
      const structuralFields = ['time', 'roomId', 'appointmentTypeId', 'therapistId', 'specialty']
      const hasStructuralChange = structuralFields.some(
        f => String(form[f] ?? '') !== String(initial[f] ?? '')
      )
      if (hasStructuralChange) {
        setPendingConflicts(conflicts)
        setConfirmSeriesEdit(true)
        return
      }
      // Notes-only change: save directly without marking as exception
      setSaving(true)
      const cleanForm = applyFieldCleanup(form)
      if (isEdit) await updateConsultation(initial.id, { ...cleanForm, conflicts })
      else await addConsultation({ ...cleanForm, conflicts })
      await doReplicateObjective()
      setSaving(false)
      onClose()
      return
    }
    const baseData = hasSeries ? { ...form, isSeriesException: true } : form
    const saveData = applyFieldCleanup(baseData)
    setSaving(true)
    if (isEdit) await updateConsultation(initial.id, { ...saveData, conflicts })
    else await addConsultation({ ...saveData, conflicts })
    await doReplicateObjective()
    setSaving(false)
    onClose()
  }

  async function handleSaveAnyway() {
    const conflicts = conflictsToConfirm || []
    setConflictsToConfirm(null)
    await proceedSave(conflicts)
  }

  async function doSave(scope) {
    const baseData = { ...form }
    if (scope === 'single') baseData.isSeriesException = true
    const saveData = applyFieldCleanup(baseData)
    const conflicts = pendingConflicts
    setSaving(true)
    if (isEdit) {
      await updateConsultation(initial.id, { ...saveData, conflicts })
      if (scope === 'forward') {
        await updateConsultationSeries(initial.seriesId, initial.date, {
          time: form.time,
          roomId: form.roomId,
          appointmentTypeId: form.appointmentTypeId,
          therapistId: form.therapistId,
          specialty: form.specialty,
        })
      }
    } else {
      await addConsultation({ ...saveData, conflicts })
    }
    await doReplicateObjective()
    setSaving(false)
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
  const requiresNote = selectedStatus?.showsObservation === true
  const requiresObservation = requiresNote && selectedStatus?.requiresObservation !== false
  const isAwaitingOutcome = selectedStatus?.isAwaitingOutcome === true
  const clinicalFieldsRequired = !requiresNote && !isAwaitingOutcome && form.eventType !== 'INTERVIEW'
  const willConsume = selectedStatus?.consumesPrepaidSession === true
  const showPrepaidAlert = prepaidBalance !== null && willConsume && prepaidBalance <= 0
  const selectedPatient = form.patientId ? patients.find(p => p.id === form.patientId) : null
  const patSpec = (selectedPatient && form.specialty)
    ? ((selectedPatient.specialties || []).find(s => s.key === form.specialty) ?? null)
    : null
  const patSpecMissing = !!(selectedPatient && form.specialty && patSpec === null)
  const showConsumedChip = isEdit && patSpec?.paymentType === 'PREPAID_PACKAGE' && initial.prepaidSessionConsumed !== undefined

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="xl"
      footer={
        readOnly
          ? <>
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              {onEditRequest && <Button variant="primary" onClick={onEditRequest}>Editar</Button>}
            </>
          : conflictsToConfirm !== null
          ? <>
              <Button variant="ghost" onClick={() => setConflictsToConfirm(null)} disabled={saving}>Cancelar</Button>
              <Button variant="danger" onClick={handleSaveAnyway} disabled={saving}>{saving ? 'Salvando…' : 'Salvar mesmo assim'}</Button>
            </>
          : replacementConflictsToConfirm !== null
          ? <>
              <Button variant="ghost" onClick={() => setReplacementConflictsToConfirm(null)} disabled={saving}>Cancelar</Button>
              <Button variant="danger" onClick={handleSaveReplacementAnyway} disabled={saving}>{saving ? 'Salvando…' : 'Salvar mesmo assim'}</Button>
            </>
          : confirmSeriesEdit
          ? <>
              <Button variant="ghost" onClick={() => setConfirmSeriesEdit(false)} disabled={saving}>Voltar</Button>
              <Button variant="outline" onClick={() => doSave('single')} disabled={saving}>{saving ? 'Salvando…' : 'Apenas esta'}</Button>
              <Button variant="primary" onClick={() => doSave('forward')} disabled={saving}>{saving ? 'Salvando…' : 'Esta e as próximas'}</Button>
            </>
          : <>
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
              {!isBlocked && <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : (isEdit ? 'Salvar' : 'Registrar Atendimento')}</Button>}
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
        {/* Tipo do Evento */}
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo:</span>
            {[{ v: 'SESSION', l: 'Atendimento' }, { v: 'INTERVIEW', l: 'Entrevista' }].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  set('eventType', v)
                  if (v === 'SESSION') {
                    set('interviewFormat', '')
                    set('meetingPlatform', '')
                    set('meetingLink', '')
                  } else {
                    set('appointmentTypeId', '')
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  form.eventType === v
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {l}
              </button>
            ))}
            {form.eventType === 'INTERVIEW' && (
              <>
                <span className="text-gray-300 mx-1">|</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Formato:</span>
                {[{ v: 'PRESENTIAL', l: 'Presencial' }, { v: 'REMOTE', l: 'Remoto' }].map(({ v, l }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      set('interviewFormat', v)
                      if (v === 'REMOTE') set('roomId', '')
                      else { set('meetingPlatform', ''); set('meetingLink', '') }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.interviewFormat === v
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {v === 'PRESENTIAL' ? <FiMapPin size={10} className="inline mr-1" /> : <FiVideo size={10} className="inline mr-1" />}
                    {l}
                  </button>
                ))}
                {errors.interviewFormat && (
                  <p className="text-xs text-red-500 w-full">{errors.interviewFormat}</p>
                )}
              </>
            )}
          </div>
        )}
        {readOnly && form.eventType === 'INTERVIEW' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
              {form.interviewFormat === 'REMOTE' ? <FiVideo size={11} /> : <FiMapPin size={11} />}
              Entrevista {form.interviewFormat === 'REMOTE' ? 'Remota' : 'Presencial'}
            </span>
          </div>
        )}
        {confirmSeriesEdit && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <FiRepeat size={15} className="shrink-0 mt-0.5" />
            <span>Esta consulta faz parte de uma série. <strong>Apenas esta</strong> salva só este registro (marca como exceção). <strong>Esta e as próximas</strong> aplica horário, sala, terapeuta, especialidade e tipo de atendimento aos atendimentos futuros não faturados da série.</span>
          </div>
        )}
        {conflictsToConfirm !== null && conflictsToConfirm.length > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <span>⚠️</span>
              <span>Conflitos encontrados para este atendimento:</span>
            </div>
            <ul className="space-y-1 pl-2 text-xs text-amber-800">
              {conflictsToConfirm.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{buildConflictTooltip([c], { therapists, rooms, patients, consultations, calendarBlocks })}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mt-1">Deseja salvar mesmo assim?</p>
          </div>
        )}
        {replacementConflictsToConfirm !== null && replacementConflictsToConfirm.length > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <span>⚠️</span>
              <span>Conflitos encontrados para a reposição:</span>
            </div>
            <ul className="space-y-1 pl-2 text-xs text-amber-800">
              {replacementConflictsToConfirm.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{buildConflictTooltip([c], { therapists, rooms, patients, consultations, calendarBlocks })}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700 mt-1">Deseja salvar mesmo assim?</p>
          </div>
        )}
        {isBlocked && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 border border-amber-200">
            <span className="shrink-0 mt-0.5">⚠️</span>
            Este atendimento está com status <strong>{currentStatus?.name}</strong> (automático) e não pode ser editado.
          </div>
        )}
        {/* Dados do Atendimento */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados do Atendimento
          </h3>
          <div className="space-y-3">
            <Select
              label={form.eventType === 'INTERVIEW' ? 'Paciente (opcional)' : 'Paciente *'}
              value={form.patientId}
              onChange={e => set('patientId', e.target.value)}
              error={errors.patientId}
              disabled={readOnly}
            >
              <option value="">Selecione o paciente</option>
              {patients.filter(p => !p.deleted).sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR', { sensitivity: 'base' })).map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </Select>

            {(form.eventType === 'INTERVIEW' || form.intervieweeName) && (
              <Input
                label={readOnly ? 'Entrevistado(s)' : 'Nome(s) do(s) entrevistado(s) *'}
                value={form.intervieweeName || ''}
                onChange={e => set('intervieweeName', e.target.value)}
                error={errors.intervieweeName}
                placeholder="Ex: Maria (responsável)"
                disabled={readOnly}
              />
            )}

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
            {isRemoteInterview ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select label="Plataforma" value={form.meetingPlatform} onChange={e => set('meetingPlatform', e.target.value)} disabled={readOnly}>
                  <option value="">Selecione</option>
                  <option value="GOOGLE_MEET">Google Meet</option>
                  <option value="TEAMS">Microsoft Teams</option>
                  <option value="ZOOM">Zoom</option>
                  <option value="OTHER">Outra plataforma</option>
                </Select>
                <Input label="Link da Reunião" value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} placeholder="https://..." disabled={readOnly} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label={form.eventType !== 'INTERVIEW' || form.interviewFormat === 'PRESENTIAL' ? 'Sala *' : 'Sala'}
                  value={form.roomId}
                  onChange={e => set('roomId', e.target.value)}
                  error={errors.roomId}
                  disabled={readOnly}
                >
                  <option value="">Selecione</option>
                  {activeRooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className={`grid grid-cols-1 gap-3 ${form.eventType === 'INTERVIEW' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
              <Select label="Especialidade *" value={form.specialty} onChange={e => set('specialty', e.target.value)} error={errors.specialty} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeSpecialties.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              <Select label="Status Atendimento *" value={form.consultationStatusId} onChange={e => handleStatusChange(e.target.value)} error={errors.consultationStatusId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              {form.eventType !== 'INTERVIEW' && (
                <Select label="Tipo de Atendimento *" value={form.appointmentTypeId} onChange={e => set('appointmentTypeId', e.target.value)} error={errors.appointmentTypeId} disabled={readOnly}>
                  <option value="">Selecione</option>
                  {activeAppointmentTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              )}
            </div>

            {/* Modalidade de Pagamento */}
            {form.patientId && form.specialty && form.eventType === 'SESSION' && (
              patSpecMissing ? (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <span className="shrink-0">⚠️</span>
                  <span>Especialidade <strong>não configurada</strong> para este paciente — verifique as Especialidades em Atendimento na ficha do paciente antes de faturar.</span>
                </div>
              ) : patSpec ? (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs border ${
                  showPrepaidAlert ? 'bg-red-50 border-red-200 text-red-800'
                  : patSpec.paymentType === 'PREPAID_PACKAGE' ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}>
                  <span className="shrink-0">{showPrepaidAlert ? '⚠️' : 'ℹ️'}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Modalidade: <strong>{PAYMENT_TYPE_LABELS[patSpec.paymentType || 'POST_PER_SESSION']}</strong>
                      {(!patSpec.paymentType || patSpec.paymentType === 'POST_PER_SESSION') && ' — Cobrança por sessão realizada.'}
                      {patSpec.paymentType === 'POST_MONTHLY' && ' — Valor mensal fixo, independente do número de sessões.'}
                      {patSpec.paymentType === 'PAY_PER_SESSION' && ' — Pagamento antecipado sessão a sessão, sem pacote.'}
                      {patSpec.paymentType === 'PREPAID_PACKAGE' && prepaidBalance !== null && (
                        <> — Saldo atual: <strong>{prepaidBalance} {Math.abs(prepaidBalance) === 1 ? 'sessão' : 'sessões'}</strong>.{' '}
                          {showPrepaidAlert ? 'Saldo insuficiente para consumir esta sessão.' : willConsume ? 'Este status irá debitar 1 sessão.' : ''}</>
                      )}
                    </span>
                    {showConsumedChip && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        initial.prepaidSessionConsumed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {initial.prepaidSessionConsumed ? 'Consumiu sessão pré-paga' : 'Não consumiu sessão pré-paga'}
                      </span>
                    )}
                  </div>
                </div>
              ) : null
            )}

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

        {/* Seção clínica: Observação do Atendimento (requiresNote) ou campos normais */}
        {(requiresNote || (readOnly && form.notes)) ? (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
              Observação do Atendimento
            </h3>
            <Textarea
              label={requiresObservation && !readOnly ? 'Observação do Atendimento *' : 'Observação do Atendimento'}
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              error={errors.notes}
              placeholder="Descreva a observação relacionada ao atendimento..."
              rows={4}
              disabled={readOnly}
            />
          </section>
        ) : (
          <>
            {/* Objetivo principal */}
            <section>
              <Textarea
                label={clinicalFieldsRequired ? 'Objetivo Principal da Sessão *' : 'Objetivo Principal da Sessão'}
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
                  label={clinicalFieldsRequired ? 'Relato da Sessão / Evolução *' : 'Relato da Sessão / Evolução'}
                  value={form.evolutionNotes}
                  onChange={e => set('evolutionNotes', e.target.value)}
                  error={errors.evolutionNotes}
                  placeholder="Evolução clínica, comparação com sessões anteriores..."
                  rows={3}
                  disabled={readOnly}
                />
                <Textarea
                  label="Objetivo da Próxima Sessão"
                  value={form.nextObjectives}
                  onChange={e => set('nextObjectives', e.target.value)}
                  error={errors.nextObjectives}
                  placeholder="Metas e foco para a próxima sessão..."
                  rows={2}
                  disabled={readOnly}
                />
                {!readOnly && form.patientId && form.eventType !== 'INTERVIEW' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none -mt-1">
                    <input
                      type="checkbox"
                      checked={replicateNextObjective}
                      onChange={e => setReplicateNextObjective(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-brand-blue"
                    />
                    <span className="text-xs text-gray-500">Replicar como objetivo da próxima sessão agendada deste paciente</span>
                  </label>
                )}
                <Textarea label="Orientações Passadas ao Responsável" value={form.guardianFeedback} onChange={e => set('guardianFeedback', e.target.value)} placeholder="O que foi comunicado ao responsável ao final da sessão..." rows={2} disabled={readOnly} />
              </div>
            </section>
          </>
        )}

        {/* Este atendimento É uma reposição — link para o original */}
        {originalConsultation && (
          <div className="flex items-center justify-between gap-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-sm text-cyan-800">
            <span>Reposição do atendimento de <strong>{fmtShortDate(originalConsultation.date)}</strong>.</span>
            {onNavigate && <Button type="button" variant="outline" onClick={() => onNavigate(originalConsultation)}>Ver atendimento original</Button>}
          </div>
        )}

        {/* Decisão de reposição — só quando o status selecionado solicita */}
        {showsReplacementQuestion && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
              Reposição
            </h3>
            {linkedReplacement ? (
              <div className="flex items-center justify-between gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl text-sm text-teal-800">
                <span>
                  <strong>Reposição agendada</strong> para {fmtShortDate(linkedReplacement.date)}
                  {linkedReplacement.time ? ` às ${linkedReplacement.time.slice(0, 5)}` : ''}
                  {' '}com {therapists.find(t => t.id === linkedReplacement.therapistId)?.name || '—'}.
                </span>
                {onNavigate && <Button type="button" variant="outline" onClick={() => onNavigate(linkedReplacement)}>Abrir reposição</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Este atendimento terá reposição? *</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => { set('willHaveReplacement', false); setReplacementDraft(EMPTY_REPLACEMENT_DRAFT) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.willHaveReplacement === false ? 'bg-gray-700 text-white border-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={openReplacementDraft}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        form.willHaveReplacement === true ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      Sim
                    </button>
                  </div>
                  {errors.willHaveReplacement && <p className="text-xs text-red-500 mt-1">{errors.willHaveReplacement}</p>}
                </div>

                {hasSeries && form.willHaveReplacement === true && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-2">
                    Esta decisão será aplicada apenas a este atendimento — a série recorrente não será alterada.
                  </p>
                )}

                {form.willHaveReplacement === true && (
                  <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Agendamento da Reposição</h4>
                    {!schedulingDefaultStatus && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                        Nenhum status padrão de agendamento configurado — peça a um administrador para marcar "Padrão de Agendamento" em Status Atendimento antes de salvar.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select label="Terapeuta *" value={replacementDraft.therapistId} onChange={e => setReplacementField('therapistId', e.target.value)} error={errors.replacementTherapistId} disabled={readOnly}>
                        <option value="">Selecione</option>
                        {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      <Input label="Data *" type="date" value={replacementDraft.date} onChange={e => setReplacementField('date', e.target.value)} error={errors.replacementDate} disabled={readOnly} />
                      <Input label="Horário *" type="time" value={replacementDraft.time} onChange={e => setReplacementField('time', e.target.value)} error={errors.replacementTime} disabled={readOnly} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select label="Sala *" value={replacementDraft.roomId} onChange={e => setReplacementField('roomId', e.target.value)} error={errors.replacementRoomId} disabled={readOnly}>
                        <option value="">Selecione</option>
                        {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </Select>
                      <Select label="Especialidade *" value={replacementDraft.specialty} onChange={e => setReplacementField('specialty', e.target.value)} error={errors.replacementSpecialty} disabled={readOnly}>
                        <option value="">Selecione</option>
                        {activeSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </Select>
                      <Select label="Tipo de Atendimento *" value={replacementDraft.appointmentTypeId} onChange={e => setReplacementField('appointmentTypeId', e.target.value)} error={errors.replacementAppointmentTypeId} disabled={readOnly}>
                        <option value="">Selecione</option>
                        {activeAppointmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Terapeutas Participantes</p>
                      {replacementDraft.secondaryTherapists.map(sec => {
                        const usedIds = [replacementDraft.therapistId, ...replacementDraft.secondaryTherapists.filter(t => t.tempId !== sec.tempId).map(t => t.therapistId)]
                        return (
                          <div key={sec.tempId} className="flex items-end gap-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Select label="Terapeuta" value={sec.therapistId} onChange={e => updateReplacementSecondaryTherapist(sec.tempId, 'therapistId', e.target.value)} disabled={readOnly}>
                                <option value="">Selecione</option>
                                {activeTherapists.filter(t => !usedIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </Select>
                              <Select label="Especialidade" value={sec.specialty} onChange={e => updateReplacementSecondaryTherapist(sec.tempId, 'specialty', e.target.value)} disabled={readOnly}>
                                <option value="">Selecione</option>
                                {activeSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                              </Select>
                            </div>
                            {!readOnly && (
                              <button type="button" onClick={() => removeReplacementSecondaryTherapist(sec.tempId)} className="mb-1 p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {!readOnly && (
                        <button type="button" onClick={addReplacementSecondaryTherapist} className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1">
                          <FiPlus size={14} /> Adicionar terapeuta
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Seção NF — visível apenas para admin em modo edição */}
        {isEdit && form.eventType !== 'INTERVIEW' && isAdmin && (
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
