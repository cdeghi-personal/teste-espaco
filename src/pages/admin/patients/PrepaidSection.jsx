import { useState, useEffect, useCallback } from 'react'
import { FiPackage, FiPlus, FiSliders } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDateShort(dateStr) {
  if (!dateStr) return '—'
  return dateStr.split('-').reverse().join('/')
}

// Resolve dados do atendimento relacionado ao lançamento.
// Usa o JOIN (e.consultations) quando disponível; cai no snapshot em notes quando não.
function resolveAtendimento(e, therapists, consultationStatuses, specialtiesData) {
  const c = e.consultations
  if (c) {
    const date = fmtDateShort(c.date)
    const time = c.time ? c.time.slice(0, 5) : null
    const therapist = therapists.find(t => t.id === c.therapist_id)
    const specLabel = specialtiesData.find(s => s.key === c.specialty)?.label || c.specialty || ''
    const status = consultationStatuses.find(s => s.id === c.consultation_status_id)
    const parts = [`${date}${time ? ' às ' + time : ''}`]
    if (therapist?.name) parts.push(therapist.name)
    if (specLabel) parts.push(specLabel)
    if (status?.name) parts.push(status.name)
    return parts.join(' | ')
  }
  // Fallback: snapshot em notes (consulta excluída ou entrada antiga)
  if (e.notes?.startsWith('Atendimento:')) {
    return e.notes.replace(/^Atendimento:\s*/, '')
  }
  return null
}

// Extrai o nome do status do snapshot frozen em notes.
// Formato das notes de DEBIT: "Atendimento: ... | Status: NomeDoStatus"
function frozenStatusFromNotes(notes) {
  if (!notes) return null
  const match = notes.match(/\|\s*Status:\s*(.+)$/)
  return match ? match[1].trim() : null
}

// Tipo descritivo — usa snapshot frozen em notes (imutável) em vez de liveStatusName
// para que o label não mude quando o status da consulta for alterado posteriormente
function entryTypeLabel(e, consultationStatuses) {
  const op = e.operation

  if (!op) {
    if (e.entry_type === 'CREDIT') return 'Pacote adicionado'
    if (e.entry_type === 'DEBIT') return 'Sessão consumida'
    return 'Ajuste'
  }
  switch (op) {
    case 'PACKAGE_PURCHASE': return 'Pacote adicionado'
    case 'CONSULTATION_ADD': {
      const snap = frozenStatusFromNotes(e.notes)
      return snap ? `Inclusão Atend. — ${snap}` : 'Inclusão de atendimento'
    }
    case 'CONSULTATION_UPDATE': {
      const snap = frozenStatusFromNotes(e.notes)
      return snap ? `Alteração Atend. — ${snap}` : 'Alteração de atendimento'
    }
    case 'MANUAL_ADJUSTMENT': return 'Ajuste manual'
    case 'AUTO_REVERSAL': {
      if (e.notes?.includes('excluído')) return 'Estorno — Atend. excluído'
      if (e.notes?.includes('Paciente/especialidade')) return 'Estorno — Pac./espec. alterado'
      const match = e.notes?.match(/Status alterado para:\s*(.+)/)
      if (match) return `Estorno — Status: ${match[1]}`
      return 'Estorno automático'
    }
    default: return op
  }
}

// Observação: mostra apenas notas que não são geradas automaticamente
function getObservation(e) {
  if (!e.notes) return null
  if (e.notes.startsWith('Atendimento:')) return null
  if (e.notes.startsWith('Estorno automático')) return null
  return e.notes
}

function entryQtyColor(e) {
  if (e.entry_type === 'CREDIT') return 'text-green-600 font-semibold'
  if (e.entry_type === 'DEBIT') return 'text-red-500 font-semibold'
  return e.sessions_quantity >= 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'
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
    ? (parseFloat(pvps) * parseInt(qty)).toFixed(2) : ''

  async function handleSave(e) {
    e.preventDefault()
    if (!qty || parseInt(qty) <= 0) return
    setSaving(true)
    const result = await addPrepaidPackage(patientId, specialty, {
      sessionsQuantity: parseInt(qty),
      patientValuePerSession: pvps !== '' ? parseFloat(pvps) : null,
      therapistValuePerSession: tvps !== '' ? parseFloat(tvps) : null,
      totalPaid: totalPaid !== '' ? parseFloat(totalPaid) : (autoTotal ? parseFloat(autoTotal) : null),
      notes: notes || null, purchasedAt,
    })
    setSaving(false)
    if (!result?.error) onSaved()
  }

  const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'
  const lbl = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="font-bold text-gray-900 mb-4">Adicionar Pacote</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Qtd de Sessões *</label>
              <input type="number" min="1" className={inp} value={qty} onChange={e => setQty(e.target.value)} required /></div>
            <div><label className={lbl}>Data de Compra</label>
              <input type="date" className={inp} value={purchasedAt} onChange={e => setPurchasedAt(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Vlr por sessão (Paciente)</label>
              <input type="number" min="0" step="0.01" className={inp} value={pvps} onChange={e => setPvps(e.target.value)} placeholder="R$" /></div>
            <div><label className={lbl}>Vlr por sessão (Terapeuta)</label>
              <input type="number" min="0" step="0.01" className={inp} value={tvps} onChange={e => setTvps(e.target.value)} placeholder="R$" /></div>
          </div>
          <div>
            <label className={lbl}>Total Pago{autoTotal && <span className="ml-1 font-normal text-gray-400">(sugerido: R$ {autoTotal})</span>}</label>
            <input type="number" min="0" step="0.01" className={inp} value={totalPaid} onChange={e => setTotalPaid(e.target.value)} placeholder={autoTotal ? `R$ ${autoTotal}` : 'R$'} />
          </div>
          <div><label className={lbl}>Observações</label>
            <input className={inp} value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} /></div>
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

  const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none'
  const lbl = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4">Ajuste Manual de Saldo</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className={lbl}>Quantidade de Sessões (negativo para deduzir) *</label>
            <input type="number" className={inp} value={qty} onChange={e => setQty(e.target.value)} required placeholder="Ex: -1 ou 3" /></div>
          <div><label className={lbl}>Motivo / Observações</label>
            <input className={inp} value={notes} onChange={e => setNotes(e.target.value)} maxLength={200} /></div>
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
  const { getPrepaidData, consultationStatuses, therapists, specialtiesData } = useData()
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
            <button onClick={() => setShowAdjModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              <FiSliders size={11} /> Ajuste
            </button>
            <button onClick={() => setShowPackageModal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-brand-blue text-white rounded-xl hover:bg-blue-800">
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

      {/* Extrato */}
      {ledger.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 px-1 pt-1">Extrato</div>

          {/* Desktop: tabela */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Data/Hora Registro</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Tipo</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-500">Sessões</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Responsável</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Atendimento</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Observação</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, i) => {
                  const atendimento = resolveAtendimento(e, therapists, consultationStatuses, specialtiesData)
                  const obs = getObservation(e)
                  const isEven = i % 2 === 0
                  return (
                    <tr key={e.id} className={`border-t border-gray-100 ${isEven ? '' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{fmtDatetime(e.created_at)}</td>
                      <td className="px-3 py-2.5 text-gray-700 max-w-[160px]">
                        {entryTypeLabel(e, consultationStatuses)}
                      </td>
                      <td className={`px-3 py-2.5 text-center ${entryQtyColor(e)}`}>
                        {e.sessions_quantity > 0 ? `+${e.sessions_quantity}` : e.sessions_quantity}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {e.created_by_name || (e.created_by ? 'Sistema' : '—')}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-[220px]">
                        {atendimento
                          ? <span className="leading-snug">{atendimento}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 max-w-[140px]">
                        {obs || <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards compactos */}
          <div className="md:hidden space-y-2">
            {ledger.map(e => {
              const atendimento = resolveAtendimento(e, therapists, consultationStatuses, specialtiesData)
              const obs = getObservation(e)
              return (
                <div key={e.id} className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-800 flex-1">{entryTypeLabel(e, consultationStatuses)}</span>
                    <span className={`text-xs ${entryQtyColor(e)}`}>
                      {e.sessions_quantity > 0 ? `+${e.sessions_quantity}` : e.sessions_quantity}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-2 flex-wrap">
                    <span>{fmtDatetime(e.created_at)}</span>
                    {(e.created_by_name || e.created_by) && (
                      <span>· {e.created_by_name || 'Sistema'}</span>
                    )}
                  </div>
                  {atendimento && (
                    <div className="text-[11px] text-gray-500 leading-snug">{atendimento}</div>
                  )}
                  {obs && (
                    <div className="text-[11px] text-gray-400">{obs}</div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {ledger.length === 0 && (
        <p className="text-xs text-gray-400">Nenhuma movimentação registrada.</p>
      )}

      {showPackageModal && (
        <PackageModal
          patientId={patientId} specialty={specialty}
          defaultPatientValue={defaultPatientValue} defaultTherapistValue={defaultTherapistValue}
          onClose={() => setShowPackageModal(false)} onSaved={handleSaved}
        />
      )}
      {showAdjModal && (
        <AdjustmentModal
          patientId={patientId} specialty={specialty}
          onClose={() => setShowAdjModal(false)} onSaved={handleSaved}
        />
      )}
    </div>
  )
}
