import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'

const EMPTY = { name: '', description: '', active: true }

export default function RoomFormModal({ onClose, initial = {} }) {
  const { addRoom, updateRoom } = useData()
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
    if (isEdit) updateRoom(initial.id, form)
    else addRoom(form)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Sala' : 'Nova Sala'}
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
          label="Nome da Sala *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Sala 1, Sala de Fono..."
        />
        <Input
          label="Descrição"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Capacidade, equipamentos, etc."
        />
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="room-active"
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <label htmlFor="room-active" className="text-sm font-medium text-gray-700">Sala ativa</label>
        </div>
      </div>
    </Modal>
  )
}
