import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'

const COLOR_OPTIONS = [
  { value: 'bg-green-100 text-green-700',   label: 'Verde' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Amarelo' },
  { value: 'bg-gray-100 text-gray-600',     label: 'Cinza' },
  { value: 'bg-blue-100 text-blue-700',     label: 'Azul' },
  { value: 'bg-orange-100 text-orange-700', label: 'Laranja' },
  { value: 'bg-red-100 text-red-700',       label: 'Vermelho' },
  { value: 'bg-purple-100 text-purple-700', label: 'Roxo' },
]

const EMPTY = { name: '', color: 'bg-green-100 text-green-700', active: true, automatic: false }

export default function ConsultationStatusFormModal({ onClose, initial = {} }) {
  const { addConsultationStatus, updateConsultationStatus } = useData()
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
    if (isEdit) updateConsultationStatus(initial.id, form)
    else addConsultationStatus(form)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Status' : 'Novo Status de Consulta'}
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
          label="Descrição do Status *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Realizada, Faltou, Cancelada..."
        />
        <Select label="Cor do Badge" value={form.color} onChange={e => set('color', e.target.value)}>
          {COLOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prévia</label>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${form.color}`}>{form.name || 'Status'}</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="cs-automatic"
            type="checkbox"
            checked={form.automatic}
            onChange={e => set('automatic', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-automatic" className="text-sm font-medium text-gray-700">Automático</label>
            <p className="text-xs text-gray-400 mt-0.5">Status atribuído automaticamente pelo sistema (não aparece para seleção manual)</p>
          </div>
        </div>
        {isEdit && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="cs-active"
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <label htmlFor="cs-active" className="text-sm font-medium text-gray-700">Status ativo</label>
          </div>
        )}
      </div>
    </Modal>
  )
}
