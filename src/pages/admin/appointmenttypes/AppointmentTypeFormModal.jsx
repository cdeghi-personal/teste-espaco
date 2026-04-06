import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'

const EMPTY = { name: '', active: true }

export default function AppointmentTypeFormModal({ onClose, initial = {} }) {
  const { addAppointmentType, updateAppointmentType } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Descrição obrigatória'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) updateAppointmentType(initial.id, form)
    else addAppointmentType(form)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Tipo de Atendimento' : 'Novo Tipo de Atendimento'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Descrição *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Sessão Individual, Grupo, Avaliação..."
        />
        {isEdit && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="at-active"
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <label htmlFor="at-active" className="text-sm font-medium text-gray-700">Tipo ativo</label>
          </div>
        )}
      </div>
    </Modal>
  )
}
