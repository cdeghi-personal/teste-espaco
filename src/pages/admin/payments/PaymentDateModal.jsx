import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import { isoToday } from '../../../utils/dateUtils'

// Modal genérico de confirmação com data — reaproveitado tanto para "Marcar
// como Pago" quanto para "Informar data do pagamento" (legado), via injeção
// de title/helperText/onConfirm. Sem prop de "modo": quem chama decide o que
// onConfirm(date) faz.
export default function PaymentDateModal({ title, helperText, onConfirm, onClose }) {
  const [date, setDate] = useState(isoToday())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (loading) return
    if (!date) { setError('Informe a data do pagamento.'); return }
    if (date > isoToday()) { setError('A data do pagamento não pode ser no futuro.'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm(date)
    } catch (err) {
      setError(err?.message || 'Erro ao confirmar.')
      setLoading(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={() => !loading && onClose()}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 bg-green-600 text-white hover:bg-green-700"
          >
            {loading ? 'Aguarde...' : 'Confirmar pagamento'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-700">{helperText}</p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Data do pagamento *</label>
          <input
            type="date"
            value={date}
            max={isoToday()}
            onChange={e => { setDate(e.target.value); setError('') }}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
