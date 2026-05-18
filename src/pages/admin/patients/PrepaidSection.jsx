import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiPlus, FiSliders } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'

function fmtVal(v) {
  if (v == null || v === '') return '—'
  return `R$ ${Number(v).toFixed(2)}`
}

function fmtDatetime(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d)) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function entryTypeLabel(e) {
  const op = e.operation
  if (!op) {
    if (e.entry_type === 'CREDIT') return 'Pacote adicionado'
    if (e.entry_type === 'DEBIT') return 'Sessão consumida'
    return 'Ajuste'
  }
  switch (op) {
    case 'PACKAGE_PURCHASE': return 'Pacote adicionado'
    case 'CONSULTATION_ADD': return 'Inclusão de atendimento'
    case 'CONSULTATION_UPDATE': return 'Alteração de atendimento'
    case 'MANUAL_ADJUSTMENT': return 'Ajuste manual'
    case 'AUTO_REVERSAL': {
      if (e.notes?.includes('excluído')) return 'Estorno — Atend. excluído'
      if (e.notes?.includes('Paciente/especialidade')) return 'Estorno — Pac./espec. alterado'
      return 'Estorno automático'
    }
    default: return op
  }
}

function entryQtyColor(e) {
  if (e.entry_type === 'CREDIT') return 'text-green-600'
  if (e.entry_type === 'DEBIT') return 'text-red-500'
  return e.sessions_quantity >= 0 ? 'text-green-600' : 'text-red-500'
}

function entryBgColor(e) {
  if (e.entry_type === 'CREDIT') return 'border-l-2 border-green-300'
  if (e.entry_type === 'DEBIT') return 'border-l-2 border-red-300'
  return e.sessions_quantity >= 0
    ? 'border-l-2 border-green-200'
    : 'border-l-2 border-orange-300'
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
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <span className="text-xs text-gray-400">{Math.abs(balance) === 1 ? 'sessão' : 'sessões'}</span>
      </div>

      {/* Extrato enriquecido */}
      {ledger.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-gray-500 px-1">Extrato</div>
          {ledger.map(e => (
            <div key={e.id} className={`rounded-xl bg-gray-50 px-3 py-2.5 ${entryBgColor(e)}`}>
              {/* Linha principal */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-800">{entryTypeLabel(e)}</span>
                    <span className={`text-xs font-bold ${entryQtyColor(e)}`}>
                      {e.sessions_quantity > 0 ? `+${e.sessions_quantity}` : e.sessions_quantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-gray-400">{fmtDatetime(e.created_at)}</span>
                    {(e.created_by_name) && (
                      <span className="text-[11px] text-gray-400">por <span className="font-medium text-gray-500">{e.created_by_name}</span></span>
                    )}
                    {!e.created_by_name && e.created_by && (
                      <span className="text-[11px] text-gray-400">por <span className="font-medium text-gray-500">Sistema</span></span>
                    )}
                  </div>
                </div>
              </div>
              {/* Detalhes (notes) */}
              {e.notes && (
                <div className="mt-1.5 text-[11px] text-gray-500 bg-white/80 rounded-lg px-2 py-1 leading-snug">
                  {e.notes}
                </div>
              )}
            </div>
          ))}
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
