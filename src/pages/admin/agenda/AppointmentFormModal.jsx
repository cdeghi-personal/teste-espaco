import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { SPECIALTIES, SPECIALTY_LIST, APPOINTMENT_STATUS } from '../../../constants/specialties'

const EMPTY = {
  patientId: '', therapistId: '', specialty: '', date: '', startTime: '08:00',
  endTime: '09:00', status: 'scheduled', roomId: '', notes: '',
}

export default function AppointmentFormModal({ onClose, initial = {} }) {
  const { patients, rooms, therapists: allTherapists, addAppointment, updateAppointment } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.patientId) e.patientId = 'Selecione um paciente'
    if (!form.therapistId) e.therapistId = 'Selecione um terapeuta'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!form.date) e.date = 'Informe a data'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) {
      updateAppointment(initial.id, form)
    } else {
      addAppointment(form)
    }
    onClose()
  }

  const therapists = allTherapists.filter(t => t.active !== false)
  const activeRooms = rooms.filter(r => r.active !== false)

  return (
    <Modal
      title={isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Agendar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Paciente *"
          value={form.patientId}
          onChange={(e) => set('patientId', e.target.value)}
          error={errors.patientId}
        >
          <option value="">Selecione o paciente</option>
          {patients.filter(p => p.status === 'active').map(p => (
            <option key={p.id} value={p.id}>{p.fullName}</option>
          ))}
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Especialidade *"
            value={form.specialty}
            onChange={(e) => set('specialty', e.target.value)}
            error={errors.specialty}
          >
            <option value="">Selecione</option>
            {SPECIALTY_LIST.map(k => (
              <option key={k} value={k}>{SPECIALTIES[k].label}</option>
            ))}
          </Select>

          <Select
            label="Terapeuta *"
            value={form.therapistId}
            onChange={(e) => set('therapistId', e.target.value)}
            error={errors.therapistId}
          >
            <option value="">Selecione</option>
            {therapists.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Data *" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />
          <Input label="Início" type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
          <Input label="Fim" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Sala" value={form.roomId} onChange={(e) => set('roomId', e.target.value)}>
            <option value="">Selecione</option>
            {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {Object.entries(APPOINTMENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Observações"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Objetivo da sessão, orientações especiais..."
          rows={3}
        />
      </div>
    </Modal>
  )
}
