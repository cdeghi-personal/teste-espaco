import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiPlus, FiSliders } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { formatDateBR } from '../../../utils/dateUtils'

function fmtVal(v) {
  if (v == null || v === '') return '—'
  return `R$ ${Number(v).toFixed(2)}`
}

function entryLabel(e) {
  if (e.entry_type === 'CREDIT') return 'Pacote adicionado'
  if (e.entry_type === 'DEBIT') return 'Sessão consumida'
  return 'Ajuste manual'
}

function entryColor(e) {
  if (e.entry_type === 'CREDIT') return 'text-green-600'
  if (e.entry_type === 'DEBIT') return 'text-red-500'
  return e.sessions_quantity >= 0 ? 'text-green-600' : 'text-red-500'
}

// ─── Modal de Novo Pacote ──────────────────────────────────────────────────────

function PackageModal({ patientId, specialty, defaultPatientValue, defaultTherapistValue, onClose, onSaved }) {
  const { addPrepaidPackage } = useData()
  const [qty, setQty] = useState('')
  const [pvps, setPvps] = useState(defaultPatientValue != null ? String(defaultPatientValue) : '')
  const [tvps, setTvps] = useState(defaultTherapistValue != null ? String(defaultTherapistValue) : '')
  const [totalPaid, setTotalPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const autoTotal = parseFloat(pvps) > 0 && parseInt(qty) > 0
    ? (parseFloat(pvps) * parseInt(qty)).toFixed(2)
    : ''

  async function handleSave(e) {
    e.preventDefault()
    if (!qty || parseInt(qty) <= 0) return
    setSaving(true)
    const result = await addPrepaidPackage(patientId, specialty, {
      sessionsQuantity: parseInt(qty),
      patientValuePerSession: pvps !== '' ? parseFloat(pvps) : null,
      therapistValuePerSession: tvps !== '' ? parseFloat(tvps) : null,
      totalPaid: totalPaid !== '' ? parseFloat(totalPaid) : (autoTotal ? parseFloat(autoTotal) : null),
      notes: notes || null,
      purchasedAt,
    })
    setSaving(false)
    if (!result?.error) onSaved()
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-bold text-gray-900 mb-4">Adicionar Pacote</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Qtd de Sessões *</label>
              <input type="number" min="1" className={inputCls} value={qty} onChange={e => setQty(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Data de Compra</label>
              <input type="date" className={inputCls} value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Vlr por sessão (Paciente)</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={pvps} onChange={e => setPvps(e.target.value)} placeholder="R$" />
            </div>
            <div>
              <label className={labelCls}>Vlr por sessão (Terapeuta)</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={tvps} onChange={e => setTvps(e.target.value)} placeholder="R$" />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Total Pago
              {autoTotal && <span className="ml-1 font-normal text-gray-400">(sugerido: R$ {autoTotal})</span>}
            </label>
            <input type="number" min="0" step="0.01" className={inputCls} value={totalPaid}
              onChange={e => setTotalPaid(e.target.value)} placeholder={autoTotal ? `R$ ${autoTotal}` : 'R$'} />
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal de Ajuste ──────────────────────────────────────────────────────────

function AdjustmentModal({ patientId, specialty, onClose, onSaved }) {
  const { addLedgerAdjustment } = useData()
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    const n = parseInt(qty)
    if (isNaN(n) || n === 0) return
    setSaving(true)
    const result = await addLedgerAdjustment(patientId, specialty, n, notes)
    setSaving(false)
    if (!result?.error) onSaved()
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4">Ajuste Manual de Saldo</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className={labelCls}>Quantidade de Sessões (use negativo para deduzir) *</label>
            <input type="number" className={inputCls} value={qty} onChange={e => setQty(e.target.value)} required placeholder="Ex: -1 ou 3" />
          </div>
          <div>
            <label className={labelCls}>Motivo / Observações</label>
            <input className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-brand-blue text-white rounded-xl hover:bg-blue-800 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── PrepaidSection ───────────────────────────────────────────────────────────

export default function PrepaidSection({ patientId, specialty, specialtyLabel, defaultPatientValue, defaultTherapistValue }) {
  const { getPrepaidData } = useData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showAdjModal, setShowAdjModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const result = await getPrepaidData(patientId, specialty)
    setData(result)
    setLoading(false)
  }, [patientId, specialty, getPrepaidData])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-xs text-gray-400 py-2">Carregando saldo...</div>

  const { balance, ledger } = data || { balance: 0, ledger: [] }
  const balanceColor = balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-500' : 'text-gray-400'

  function handleSaved() {
    setShowPackageModal(false)
    setShowAdjModal(false)
    load()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiPackage size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Pacote Pré-pago — {specialtyLabel}</span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdjModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              <FiSliders size={11} /> Ajuste
            </button>
            <button
              onClick={() => setShowPackageModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-brand-blue text-white rounded-xl hover:bg-blue-800"
            >
              <FiPlus size={11} /> Adicionar Pacote
            </button>
          </div>
        )}
      </div>

      {/* Saldo */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
        <span className="text-xs text-gray-500">Saldo disponível</span>
        <span className={`text-2xl font-bold ${balanceColor}`}>{balance}</span>
        <span className="text-xs text-gray-400">sessão{Math.abs(balance) !== 1 ? 'ões' : ''}</span>
      </div>

      {/* Ledger */}
      {ledger.length > 0 && (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Data</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Tipo</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-500">Sessões</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-500">Obs.</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map(e => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-500">{formatDateBR(e.created_at?.slice(0, 10))}</td>
                  <td className="px-3 py-2 text-gray-700">{entryLabel(e)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${entryColor(e)}`}>
                    {e.sessions_quantity > 0 ? `+${e.sessions_quantity}` : e.sessions_quantity}
                  </td>
                  <td className="px-3 py-2 text-gray-400 truncate max-w-[120px]">{e.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ledger.length === 0 && (
        <p className="text-xs text-gray-400">Nenhuma movimentação registrada.</p>
      )}

      {showPackageModal && (
        <PackageModal
          patientId={patientId}
          specialty={specialty}
          defaultPatientValue={defaultPatientValue}
          defaultTherapistValue={defaultTherapistValue}
          onClose={() => setShowPackageModal(false)}
          onSaved={handleSaved}
        />
      )}
      {showAdjModal && (
        <AdjustmentModal
          patientId={patientId}
          specialty={specialty}
          onClose={() => setShowAdjModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
