import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'

const EMPTY = { name: '', active: true, displayOrder: '' }

export default function PaymentMethodFormModal({ onClose, initial = {} }) {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod } = useData()
  const { show } = useToast()
  const isEdit = !!initial.id
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    displayOrder: initial.displayOrder != null ? String(initial.displayOrder) : '',
  })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (form.displayOrder !== '') {
      const n = Number(form.displayOrder)
      if (!Number.isInteger(n) || n < 1) {
        e.displayOrder = 'Informe um número inteiro válido'
      } else if (paymentMethods.some(pm => pm.id !== initial.id && pm.displayOrder === n)) {
        e.displayOrder = 'Já existe uma forma de pagamento com esta ordem'
      }
    }
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const payload = { ...form, displayOrder: form.displayOrder === '' ? null : Number(form.displayOrder) }
    const result = isEdit ? await updatePaymentMethod(initial.id, payload) : await addPaymentMethod(payload)
    if (result?.error) { show(result.error, 'error'); return }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
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
          label="Forma de Pagamento *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Particular, Convênio, APAE..."
        />
        <Input
          label="Ordem (opcional)"
          type="number"
          step="1"
          min="1"
          value={form.displayOrder}
          onChange={e => set('displayOrder', e.target.value)}
          error={errors.displayOrder}
          placeholder="Ex: 1, 2, 3..."
        />
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="pm-active"
            type="checkbox"
            checked={form.active}
            onChange={e => set('active', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <label htmlFor="pm-active" className="text-sm font-medium text-gray-700">Forma de pagamento ativa</label>
        </div>
      </div>
    </Modal>
  )
}
