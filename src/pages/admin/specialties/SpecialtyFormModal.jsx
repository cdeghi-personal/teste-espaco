import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'

const EMPTY = { key: '', label: '', active: true }

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
  const [form, setForm] = useState({ ...EMPTY, ...initial })
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
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setLoading(true)
    const result = isEdit
      ? await updateSpecialtyData(initial.id, { key: form.key, label: form.label, active: form.active })
      : await addSpecialtyData({ key: form.key, label: form.label, active: true })
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
