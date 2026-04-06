import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { SPECIALTIES } from '../../../constants/specialties'
import { generateId } from '../../../utils/storageUtils'
import { isoToday } from '../../../utils/dateUtils'

const EMPTY_ACTIVITY = { id: '', name: '', description: '', outcome: 'achieved' }

const EMPTY = {
  patientId: '', therapistId: '', specialty: '', date: isoToday(),
  consultationStatusId: '',
  mainObjective: '', activities: [],
  evolutionNotes: '', nextObjectives: '',
  sessionQuality: 'good', guardianFeedback: '', appointmentId: '',
}

export default function ConsultationFormModal({ onClose, initial = {} }) {
  const { patients, therapists, specialtiesData, consultationStatuses, appointments, addConsultation, updateConsultation } = useData()
  const { user } = useAuth()
  const isEdit = !!initial.id

  const [form, setForm] = useState({
    ...EMPTY,
    therapistId: user?.id || '',
    ...initial,
    activities: initial.activities ? [...initial.activities.map(a => ({ ...a }))] : [],
  })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function addActivity() {
    set('activities', [...form.activities, { ...EMPTY_ACTIVITY, id: generateId() }])
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
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!form.mainObjective.trim()) e.mainObjective = 'Informe o objetivo da sessão'
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
  const activeStatuses = consultationStatuses.filter(s => s.active !== false)
  const patientAppointments = form.patientId
    ? appointments.filter(a => a.patientId === form.patientId && !a.consultationId)
    : []

  return (
    <Modal
      title={isEdit ? 'Editar Registro de Atendimento' : 'Novo Registro de Atendimento'}
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Registrar Atendimento'}</Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Dados do Atendimento */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados do Atendimento
          </h3>
          <div className="space-y-3">
            <Select label="Paciente *" value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId}>
              <option value="">Selecione o paciente</option>
              {patients.filter(p => !p.deleted).map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Terapeuta" value={form.therapistId} onChange={e => set('therapistId', e.target.value)}>
                <option value="">Selecione</option>
                {activeTherapists.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {SPECIALTIES[t.specialty]?.label || t.specialty}</option>
                ))}
              </Select>
              <Input label="Data *" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Especialidade *" value={form.specialty} onChange={e => set('specialty', e.target.value)} error={errors.specialty}>
                <option value="">Selecione</option>
                {activeSpecialties.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
              <Select label="Status da Consulta" value={form.consultationStatusId} onChange={e => set('consultationStatusId', e.target.value)}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            {patientAppointments.length > 0 && (
              <Select label="Vincular ao Agendamento" value={form.appointmentId} onChange={e => set('appointmentId', e.target.value)}>
                <option value="">Nenhum / Avulso</option>
                {patientAppointments.map(a => (
                  <option key={a.id} value={a.id}>{a.date} {a.time} — {SPECIALTIES[a.specialty]?.label || a.specialty}</option>
                ))}
              </Select>
            )}
          </div>
        </section>

        {/* Objetivo principal */}
        <section>
          <Textarea
            label="Objetivo Principal da Sessão *"
            value={form.mainObjective}
            onChange={e => set('mainObjective', e.target.value)}
            error={errors.mainObjective}
            placeholder="Descreva o objetivo terapêutico desta sessão..."
            rows={2}
          />
        </section>

        {/* Atividades */}
        <section>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Atividades Realizadas ({form.activities.length})
            </h3>
            <Button variant="outline" size="sm" onClick={addActivity}>
              <FiPlus size={13} /> Adicionar Atividade
            </Button>
          </div>

          {form.activities.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Nenhuma atividade adicionada.
            </div>
          ) : (
            <div className="space-y-4">
              {form.activities.map((act, idx) => (
                <div key={act.id} className="bg-gray-50 rounded-xl p-4 relative">
                  <button
                    onClick={() => removeActivity(idx)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                  <div className="text-xs font-semibold text-gray-500 mb-3">Atividade {idx + 1}</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Nome da Atividade"
                        value={act.name}
                        onChange={e => updateActivity(idx, 'name', e.target.value)}
                        placeholder="Ex: Jogo de encaixe, treino de marcha..."
                      />
                      <Select
                        label="Resultado"
                        value={act.outcome}
                        onChange={e => updateActivity(idx, 'outcome', e.target.value)}
                      >
                        <option value="achieved">Objetivo Alcançado</option>
                        <option value="partial">Parcialmente Alcançado</option>
                        <option value="not_achieved">Não Alcançado</option>
                      </Select>
                    </div>
                    <Textarea
                      label="Descrição"
                      value={act.description}
                      onChange={e => updateActivity(idx, 'description', e.target.value)}
                      placeholder="Como a atividade foi realizada..."
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Evolução */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Evolução e Observações
          </h3>
          <div className="space-y-3">
            <Textarea
              label="Notas de Evolução"
              value={form.evolutionNotes}
              onChange={e => set('evolutionNotes', e.target.value)}
              placeholder="Evolução clínica, comparação com sessões anteriores..."
              rows={3}
            />
            <Textarea
              label="Objetivos para a Próxima Sessão"
              value={form.nextObjectives}
              onChange={e => set('nextObjectives', e.target.value)}
              placeholder="Metas e foco para a próxima sessão..."
              rows={2}
            />
            <Textarea
              label="Orientações Passadas ao Responsável"
              value={form.guardianFeedback}
              onChange={e => set('guardianFeedback', e.target.value)}
              placeholder="O que foi comunicado ao responsável ao final da sessão..."
              rows={2}
            />
          </div>
        </section>
      </div>
    </Modal>
  )
}
