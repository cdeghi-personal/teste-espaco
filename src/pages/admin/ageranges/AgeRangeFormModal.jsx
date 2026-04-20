import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b',
]

const EMPTY = { name: '', minAge: '', maxAge: '', color: '#3b82f6' }

export default function AgeRangeFormModal({ onClose, initial = {} }) {
  const { addAgeRange, updateAgeRange } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial, minAge: initial.minAge ?? '', maxAge: initial.maxAge ?? '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Informe o nome da faixa'
    const min = Number(form.minAge)
    const max = Number(form.maxAge)
    if (form.minAge === '' || isNaN(min) || min < 0) e.minAge = 'Idade inicial inválida'
    if (form.maxAge === '' || isNaN(max) || max <= 0) e.maxAge = 'Idade final inválida'
    if (!e.minAge && !e.maxAge && min >= max) e.maxAge = 'Idade final deve ser maior que a inicial'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const payload = { name: form.name.trim(), minAge: Number(form.minAge), maxAge: Number(form.maxAge), color: form.color }
    if (isEdit) await updateAgeRange(initial.id, payload)
    else await addAgeRange(payload)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Faixa Etária' : 'Nova Faixa Etária'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da Faixa *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Bebê, Criança, Adolescente..."
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Idade Inicial (anos) *"
            type="number"
            min="0"
            value={form.minAge}
            onChange={e => set('minAge', e.target.value)}
            error={errors.minAge}
            placeholder="0"
          />
          <Input
            label="Idade Final (anos) *"
            type="number"
            min="1"
            value={form.maxAge}
            onChange={e => set('maxAge', e.target.value)}
            error={errors.maxAge}
            placeholder="18"
          />
        </div>
        <p className="text-xs text-gray-400">Critério: Idade Inicial ≤ idade do paciente &lt; Idade Final</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cor da Tag</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs text-gray-500">Outra cor:</label>
            <input
              type="color"
              value={form.color}
              onChange={e => set('color', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-gray-200"
            />
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: form.color }}
            >
              {form.name || 'Prévia'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}