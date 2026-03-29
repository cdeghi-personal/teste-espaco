import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'
import { SPECIALTY_LIST, SPECIALTIES } from '../../../constants/specialties'

const EMPTY = { name: '', email: '', phone: '', specialty: '', credential: '', active: true }

export default function TherapistFormModal({ onClose, initial = {} }) {
  const { addTherapist, updateTherapist } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) updateTherapist(initial.id, form)
    else addTherapist(form)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Terapeuta' : 'Novo Terapeuta'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Nome Completo *" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="Nome do terapeuta" />

        <Select label="Especialidade *" value={form.specialty} onChange={e => set('specialty', e.target.value)} error={errors.specialty}>
          <option value="">Selecione</option>
          {SPECIALTY_LIST.map(k => <option key={k} value={k}>{SPECIALTIES[k].label}</option>)}
        </Select>

        <Input label="Registro Profissional" value={form.credential} onChange={e => set('credential', e.target.value)} placeholder="Ex: CRP 06/12345, CRFa 2/12345..." />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@clinica.com.br" />
          <Input label="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 9 9999-9999" />
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="active"
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">Terapeuta ativo</label>
        </div>
      </div>
    </Modal>
  )
}
