import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
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
}

export default function ConsultationFormModal({ onClose, initial = {}, readOnly = false }) {
  const { patients, therapists, specialtiesData, rooms, consultationStatuses, appointmentTypes, appointments, addConsultation, updateConsultation } = useData()
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
  })
  const [errors, setErrors] = useState({})

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
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) updateConsultation(initial.id, form)
    else addConsultation(form)
    onClose()
  }

  const activeTherapists = therapists.filter(t => t.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const activeStatuses = consultationStatuses.filter(s => s.active !== false && (user?.role === 'admin' || !s.automatic))
  const currentStatus = isEdit ? consultationStatuses.find(s => s.id === initial.consultationStatusId) : null
  const isBlocked = isEdit && currentStatus?.automatic && user?.role !== 'admin'
  const activeAppointmentTypes = appointmentTypes.filter(t => t.active !== false)
  const activeRooms = rooms.filter(r => r.active !== false)
  const patientAppointments = form.patientId
    ? appointments.filter(a => a.patientId === form.patientId && !a.consultationId)
    : []

  const title = readOnly ? 'Visualizar Atendimento' : isEdit ? 'Editar Registro de Atendimento' : 'Novo Registro de Atendimento'
  const selectedStatus = consultationStatuses.find(s => s.id === form.consultationStatusId)
  const realizadaRequired = selectedStatus?.name?.toLowerCase().includes('realizada')
  const mainObjectiveRequired = realizadaRequired

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="xl"
      footer={
        readOnly
          ? <Button variant="ghost" onClick={onClose}>Fechar</Button>
          : <>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              {!isBlocked && <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Registrar Atendimento'}</Button>}
            </>
      }
    >
      <div className="space-y-6">
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
            <Select label="Paciente *" value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId} disabled={readOnly}>
              <option value="">Selecione o paciente</option>
              {patients.filter(p => !p.deleted).map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select label="Terapeuta *" value={form.therapistId} onChange={e => set('therapistId', e.target.value)} error={errors.therapistId} disabled={readOnly}>
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

        {/* Objetivo principal */}
        <section>
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
      </div>
    </Modal>
  )
}
