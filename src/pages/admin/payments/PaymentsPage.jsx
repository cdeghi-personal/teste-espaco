import { useState, useEffect, useCallback } from 'react'
import { FiDollarSign, FiRefreshCw, FiSearch, FiEye, FiXCircle, FiCheckCircle, FiX } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'
import Modal from '../../../components/ui/Modal'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ISSUED:    { label: 'Emitida',   color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  PAID:      { label: 'Paga',      color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
}

function fmtDate(iso) {
  if (!iso) return '—'
  try { return format(parseISO(iso.length === 10 ? iso + 'T00:00:00' : iso), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return iso }
}
function fmtCurrency(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ISSUED
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ─── Modal de detalhes da fatura ──────────────────────────────────────────────

function InvoiceDetailModal({ invoice, onClose }) {
  const snap = invoice.snapshot || {}
  const consultations = snap.consultations || []

  return (
    <Modal title={`Fatura ${invoice.nf_number ? `NF ${invoice.nf_number}` : '(sem NF)'}`} onClose={onClose} size="xl">
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Paciente</p>
            <p className="font-medium text-gray-900">{snap.patientName || invoice.patients?.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Período</p>
            <p className="font-medium text-gray-900">{snap.period || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">NF / Data Emissão</p>
            <p className="font-medium text-gray-900">{invoice.nf_number || '—'} {invoice.nf_issue_date ? `· ${fmtDate(invoice.nf_issue_date)}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="font-semibold text-gray-900">{fmtCurrency(invoice.total_amount)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={invoice.status} />
          {invoice.cancelled_at && <span className="text-xs text-gray-400">Cancelada em {fmtDate(invoice.cancelled_at)}</span>}
          {invoice.paid_at && <span className="text-xs text-gray-400">Paga em {fmtDate(invoice.paid_at)}</span>}
        </div>

        {/* Atendimentos */}
        {consultations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Atendimentos incluídos</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500">
                    <th className="px-3 py-2 text-left font-medium">Data</th>
                    <th className="px-3 py-2 text-left font-medium">Horário</th>
                    <th className="px-3 py-2 text-left font-medium">Especialidade</th>
                    <th className="px-3 py-2 text-left font-medium">Terapeuta</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consultations.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2">{fmtDate(c.date)}</td>
                      <td className="px-3 py-2">{c.time ? c.time.slice(0, 5) : '—'}</td>
                      <td className="px-3 py-2">{c.specialtyLabel || c.specialty || '—'}</td>
                      <td className="px-3 py-2">{c.therapistName || '—'}</td>
                      <td className="px-3 py-2">{c.statusName || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {c.paymentType === 'POST_MONTHLY'
                          ? 'Mensal'
                          : c.paymentType === 'PREPAID_PACKAGE'
                          ? 'Pré-pago'
                          : c.patientValue != null ? fmtCurrency(c.patientValue) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={5} className="px-3 py-2 text-right text-xs text-gray-500">Total</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-900">{fmtCurrency(invoice.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400">Gerada em {fmtDate(invoice.created_at)}</p>
      </div>
    </Modal>
  )
}

// ─── Card da fatura ───────────────────────────────────────────────────────────

function InvoiceCard({ invoice, consultationStatuses, onView, onCancel, onPaid }) {
  const patientName = invoice.patients?.full_name || invoice.snapshot?.patientName || '—'
  const snap = invoice.snapshot || {}
  const canAction = invoice.status === 'ISSUED'
  const count = (invoice.consultation_ids || []).length

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 space-y-2">
      {/* Linha 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{patientName}</span>
        <StatusBadge status={invoice.status} />
        {invoice.nf_number && (
          <span className="text-xs text-gray-500">NF <strong className="text-gray-700">{invoice.nf_number}</strong></span>
        )}
        {invoice.nf_issue_date && (
          <span className="text-xs text-gray-500">Emissão <strong className="text-gray-700">{fmtDate(invoice.nf_issue_date)}</strong></span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={() => onView(invoice)}
            title="Ver detalhes"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
          >
            <FiEye size={15} />
          </button>
          <div className="text-right">
            <p className="font-bold text-gray-900 text-sm leading-tight">{fmtCurrency(invoice.total_amount)}</p>
            <p className="text-xs text-gray-400 leading-tight">{fmtDate(invoice.created_at)}</p>
          </div>
        </div>
      </div>
      {/* Linha 2 */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {snap.period && <span className="font-medium text-gray-600">{snap.period}</span>}
        <span>{count} atendimento{count !== 1 ? 's' : ''}</span>
        {canAction && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onPaid(invoice)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 rounded-lg border border-green-100 transition-colors"
            >
              <FiCheckCircle size={12} /> Paga
            </button>
            <button
              onClick={() => onCancel(invoice)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-100 transition-colors"
            >
              <FiXCircle size={12} /> Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── helpers de mês ───────────────────────────────────────────────────────────

function monthRange(offset) {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + offset
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const pad = n => String(n).padStart(2, '0')
  const fmt = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
  return { from: fmt(first), to: fmt(last) }
}

function monthBtnLabel(offset) {
  if (offset === 0) return 'Mês Atual'
  const d = new Date()
  const t = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return t.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(t.getFullYear()).slice(2)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { getPaymentInvoices, cancelPaymentInvoice, markInvoicePaid, consultationStatuses } = useData()
  const toast = useToast()

  const [invoices, setInvoices]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom]         = useState(() => monthRange(0).from)
  const [dateTo, setDateTo]             = useState(() => monthRange(0).to)

  const [viewInvoice, setViewInvoice]   = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'cancel'|'paid', invoice }
  const [actionLoading, setActionLoading] = useState(false)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPaymentInvoices({
        status:   filterStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo:   dateTo   || undefined,
        search:   search   || undefined,
      })
      setInvoices(data)
    } catch (err) {
      toast.show('Erro ao carregar faturas: ' + (err?.message || ''), 'error')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, dateFrom, dateTo, search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadInvoices() }, [loadInvoices])

  async function handleCancel(invoice) {
    setActionLoading(true)
    try {
      await cancelPaymentInvoice(invoice.id, invoice.consultation_ids || [])
      toast.show('NF cancelada. Atendimentos retornaram ao status anterior.', 'success')
      setConfirmAction(null)
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'CANCELLED', cancelled_at: new Date().toISOString() } : inv
      ))
    } catch (err) {
      toast.show('Erro ao cancelar: ' + (err?.message || ''), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handlePaid(invoice) {
    const pagoStatus = (consultationStatuses || []).find(s =>
      s.name?.toLowerCase().includes('pago') || s.name?.toLowerCase().includes('50')
    )
    if (!pagoStatus) {
      toast.show('Status "Pago" não encontrado. Crie-o em Status Atendimento antes de marcar como paga.', 'error')
      setConfirmAction(null)
      return
    }
    setActionLoading(true)
    try {
      await markInvoicePaid(invoice.id, invoice.consultation_ids || [], pagoStatus.id)
      toast.show('Fatura marcada como Paga. Atendimentos atualizados.', 'success')
      setConfirmAction(null)
      setInvoices(prev => prev.map(inv =>
        inv.id === invoice.id ? { ...inv, status: 'PAID', paid_at: new Date().toISOString() } : inv
      ))
    } catch (err) {
      toast.show('Erro ao marcar como paga: ' + (err?.message || ''), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <FiDollarSign size={18} className="text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pagamentos</h1>
            <p className="text-xs text-gray-500 mt-0.5">{invoices.length} fatura(s)</p>
          </div>
        </div>
        <button
          onClick={loadInvoices}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[-2, -1, 0].map(offset => {
            const { from, to } = monthRange(offset)
            const isActive = dateFrom === from && dateTo === to
            return (
              <button
                key={offset}
                onClick={() => { setDateFrom(from); setDateTo(to) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {monthBtnLabel(offset)}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por NF ou paciente..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Todos os Status</option>
            <option value="ISSUED">Emitida</option>
            <option value="PAID">Paga</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
              title="Emissão a partir de"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
              title="Emissão até"
            />
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : invoices.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          {search || filterStatus || dateFrom || dateTo
            ? 'Nenhuma fatura encontrada com os filtros aplicados.'
            : 'Nenhuma fatura registrada ainda. Gere um Demonstrativo Definitivo em Relatórios.'}
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              consultationStatuses={consultationStatuses}
              onView={setViewInvoice}
              onCancel={inv => setConfirmAction({ type: 'cancel', invoice: inv })}
              onPaid={inv  => setConfirmAction({ type: 'paid',   invoice: inv })}
            />
          ))}
        </div>
      )}

      {/* Modal de detalhes */}
      {viewInvoice && (
        <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* Modal de confirmação cancel/paid */}
      {confirmAction && (
        <Modal
          title={confirmAction.type === 'cancel' ? 'Cancelar NF' : 'Marcar como Paga'}
          onClose={() => !actionLoading && setConfirmAction(null)}
          size="sm"
          footer={
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmAction.type === 'cancel'
                  ? handleCancel(confirmAction.invoice)
                  : handlePaid(confirmAction.invoice)
                }
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  confirmAction.type === 'cancel'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {actionLoading
                  ? 'Aguarde...'
                  : confirmAction.type === 'cancel' ? 'Confirmar Cancelamento' : 'Confirmar Pagamento'}
              </button>
            </div>
          }
        >
          {confirmAction.type === 'cancel' ? (
            <p className="text-sm text-gray-700">
              Tem certeza que deseja cancelar esta NF?{' '}
              Os atendimentos vinculados retornarão ao status anterior ao faturamento e os campos de NF serão limpos.
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              Confirmar pagamento desta fatura?{' '}
              Os atendimentos vinculados serão atualizados para o status <strong>Pago</strong>.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
