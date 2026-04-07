import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'

const EMPTY = { key: '', label: '', color: '#6b7280', active: true }

function ColorPicker({ value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor (usada na agenda)</label>
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#6b7280'} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="#6b7280"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-blue outline-none" />
        <span className="w-8 h-8 rounded-lg border border-gray-200 shrink-0" style={{ backgroundColor: value || '#6b7280' }} />
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

// Gera uma key a partir do label: "Terapia Ocupacional" → "TERAPIA_OCUPACIONAL"
function labelToKey(label) {
  return label
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export default function SpecialtyFormModal({ onClose, initial = {} }) {
  const { addSpecialtyData, updateSpecialtyData } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial, color: initial.color || '#6b7280' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function set(field, value) {
    setForm(f => {
      const updated = { ...f, [field]: value }
      // Preenche key automaticamente ao digitar o label (só no cadastro)
      if (field === 'label' && !isEdit) {
        updated.key = labelToKey(value)
      }
      return updated
    })
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.label.trim()) e.label = 'Nome obrigatório'
    if (!form.key.trim()) e.key = 'Chave obrigatória'
    if (!/^[A-Z0-9_]+$/.test(form.key)) e.key = 'Use apenas letras maiúsculas, números e _'
    if (form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color)) e.color = 'Use formato hex (#rrggbb)'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    const result = isEdit
      ? await updateSpecialtyData(initial.id, { key: form.key, label: form.label, color: form.color, active: form.active })
      : await addSpecialtyData({ key: form.key, label: form.label, color: form.color, active: true })
    setLoading(false)
    if (result?.error) {
      setErrors({ submit: result.error })
      return
    }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Especialidade' : 'Nova Especialidade'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da Especialidade *"
          value={form.label}
          onChange={e => set('label', e.target.value)}
          error={errors.label}
          placeholder="Ex: Musicoterapia, Neuropsicologia..."
        />

        <div>
          <Input
            label="Chave (gerada automaticamente)"
            value={form.key}
            onChange={e => set('key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
            error={errors.key}
            placeholder="Ex: MUSICOTERAPIA"
          />
          <p className="text-xs text-gray-400 mt-1">
            Identificador único. Gerado automaticamente — altere só se necessário.
          </p>
        </div>

        <ColorPicker value={form.color} onChange={v => set('color', v)} error={errors.color} />

        {isEdit && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="sp-active"
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <label htmlFor="sp-active" className="text-sm font-medium text-gray-700">Especialidade ativa</label>
          </div>
        )}

        {errors.submit && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{errors.submit}</p>
        )}
      </div>
    </Modal>
  )
}
