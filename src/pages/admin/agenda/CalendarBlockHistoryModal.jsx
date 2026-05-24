import { useState, useEffect, useMemo } from 'react'
import { FiEdit2, FiXCircle, FiSearch, FiRepeat } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Spinner from '../../../components/ui/Spinner'
import { useToast } from '../../../components/ui/Toast'
import CalendarBlockFormModal from './CalendarBlockFormModal'
import { getCalendarBlockConflicts, buildConflictTooltip } from '../../../utils/conflictUtils'

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
  if (offset === 1) return 'Mês+1'
  const d = new Date()
  const t = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return t.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(t.getFullYear()).slice(2)
}

export default function CalendarBlockHistoryModal({ onClose, therapistId }) {
  const { therapists, patients, consultations, calendarBlocks, getCalendarBlockHistory, cancelCalendarBlock } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'

  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editBlock, setEditBlock] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const [filterSearch, setFilterSearch]       = useState('')
  const [filterStatus, setFilterStatus]       = useState('active')
  const [filterType, setFilterType]           = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterDateFrom, setFilterDateFrom]   = useState(() => monthRange(0).from)
  const [filterDateTo, setFilterDateTo]       = useState(() => monthRange(0).to)

  function reload() {
    setLoading(true)
    getCalendarBlockHistory(therapistId || null).then(data => {
      setBlocks(data)
      setLoading(false)
    })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCalendarBlockHistory(therapistId || null).then(data => {
      if (!cancelled) {
        setBlocks(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [therapistId, getCalendarBlockHistory])

  function getTherapistName(id) {
    return therapists.find(t => t.id === id)?.name || '—'
  }

  function fmtDate(d) {
    if (!d) return '—'
    return d.split('-').reverse().join('/')
  }

  function fmtTime(t) {
    if (!t) return '—'
    return t.slice(0, 5)
  }

  const filtered = blocks.filter(b => {
    if (filterSearch) {
      const s = filterSearch.toLowerCase()
      const tName = getTherapistName(b.therapistId).toLowerCase()
      if (!tName.includes(s) && !(b.description || '').toLowerCase().includes(s)) return false
    }
    if (filterStatus === 'active' && b.cancelled) return false
    if (filterStatus === 'cancelled' && !b.cancelled) return false
    if (filterType && b.blockType !== filterType) return false
    if (filterTherapist && b.therapistId !== filterTherapist) return false
    if (filterDateFrom && b.date < filterDateFrom) return false
    if (filterDateTo && b.date > filterDateTo) return false
    return true
  })

  // Conflitos para os bloqueios filtrados (computed fresh)
  const blockConflictMap = useMemo(() => {
    const activeCBlocks = (calendarBlocks || []).filter(b => !b.cancelled && b.active !== false)
    // Inclui também os bloqueios do histórico não cancelados (para conflito bloqueio×bloqueio)
    const activeHistoryBlocks = blocks.filter(b => !b.cancelled)
    const allBlocksForCheck = [
      ...activeCBlocks,
      ...activeHistoryBlocks.filter(b => !activeCBlocks.some(a => a.id === b.id)),
    ]
    const map = {}
    for (const b of filtered) {
      const cfs = getCalendarBlockConflicts(b, consultations, allBlocksForCheck)
      if (cfs.length > 0) {
        map[b.id] = cfs
        console.log('[CONFLICT_RENDER_DEBUG]', { eventType: 'block', eventId: b.id, conflicts: cfs, hasConflict: true })
      }
    }
    return map
  }, [filtered, consultations, calendarBlocks, blocks]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel() {
    if (!cancelConfirm) return
    setCancelLoading(true)
    try {
      await cancelCalendarBlock(cancelConfirm.id)
      toast.show('Bloqueio cancelado.', 'success')
      setCancelConfirm(null)
      reload()
    } catch (err) {
      toast.show(err.message || 'Erro ao cancelar bloqueio')
    } finally {
      setCancelLoading(false)
    }
  }

  if (editBlock) {
    return (
      <CalendarBlockFormModal
        initial={editBlock}
        onClose={() => {
          setEditBlock(null)
          reload()
        }}
      />
    )
  }

  if (cancelConfirm) {
    return (
      <Modal
        title="Cancelar bloqueio"
        onClose={() => setCancelConfirm(null)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelConfirm(null)}>Voltar</Button>
            <Button variant="danger" onClick={handleCancel} disabled={cancelLoading}>
              {cancelLoading ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Deseja cancelar o bloqueio de{' '}
          <strong>{fmtDate(cancelConfirm.date)}</strong>{' '}
          ({fmtTime(cancelConfirm.startTime)}–{fmtTime(cancelConfirm.endTime)})?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    )
  }

  const activeTherapists = therapists.filter(t => t.active !== false)

  return (
    <Modal
      title="Histórico de Bloqueios de Agenda"
      onClose={onClose}
      size="xl"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      {/* Filtros */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[-2, -1, 0, 1].map(offset => {
            const { from, to } = monthRange(offset)
            const isActive = filterDateFrom === from && filterDateTo === to
            return (
              <button
                key={offset}
                onClick={() => { setFilterDateFrom(from); setFilterDateTo(to) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {monthBtnLabel(offset)}
              </button>
            )
          })}
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none flex-1 sm:flex-none"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none flex-1 sm:flex-none"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Buscar descrição ou terapeuta..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Status: Todos</option>
            <option value="active">Ativo</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Tipo: Todos</option>
            <option value="RIGID">Rígido</option>
            <option value="FLEX">Flex</option>
          </select>
          {isAdmin && (
            <select
              value={filterTherapist}
              onChange={e => setFilterTherapist(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Todos os Terapeutas</option>
              {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nenhum bloqueio encontrado.</p>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</th>
                  <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  {isAdmin && <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Terapeuta</th>}
                  <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                  <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(b => {
                  const canEdit = isAdmin || user?.id === b.therapistId
                  return (
                    <tr key={b.id} className={b.cancelled ? 'opacity-50' : ''}>
                      <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                        {fmtDate(b.date)}
                        {b.seriesId && (
                          <span title="Bloqueio recorrente" className="ml-1 inline-flex items-center text-indigo-500"><FiRepeat size={11} /></span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                        {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          b.blockType === 'RIGID' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {b.blockType === 'RIGID' ? 'Rígido' : 'Flex'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-2 pr-3 text-gray-700 text-xs">{getTherapistName(b.therapistId)}</td>
                      )}
                      <td className="py-2 pr-3 text-gray-500 text-xs max-w-[160px] truncate">
                        {b.description || '—'}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {b.cancelled ? (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Cancelado</span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700">Ativo</span>
                          )}
                          {(blockConflictMap[b.id] || []).length > 0 && (
                            <span
                              title={buildConflictTooltip(blockConflictMap[b.id], { therapists, patients, consultations, calendarBlocks: [...(calendarBlocks || []), ...blocks] })}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600"
                            >
                              ⚠ Conflito
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2">
                        {!b.cancelled && canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              title="Editar bloqueio"
                              onClick={() => setEditBlock(b)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              title="Cancelar bloqueio"
                              onClick={() => setCancelConfirm(b)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                            >
                              <FiXCircle size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-2">
            {filtered.map(b => {
              const canEdit = isAdmin || user?.id === b.therapistId
              const isRigid = b.blockType === 'RIGID'
              const conflicts = blockConflictMap[b.id] || []
              return (
                <div key={b.id} className={`rounded-xl border p-3 ${b.cancelled ? 'opacity-50 bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{fmtDate(b.date)}</span>
                        <span className="text-xs text-gray-500">{fmtTime(b.startTime)}–{fmtTime(b.endTime)}</span>
                        {b.seriesId && <span className="text-indigo-500"><FiRepeat size={10} /></span>}
                      </div>
                      {isAdmin && <div className="text-xs text-gray-500 mt-0.5">{getTherapistName(b.therapistId)}</div>}
                      {b.description && <div className="text-xs text-gray-500 mt-0.5 truncate">{b.description}</div>}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isRigid ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isRigid ? 'Rígido' : 'Flex'}
                        </span>
                        {b.cancelled
                          ? <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Cancelado</span>
                          : <span className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700">Ativo</span>
                        }
                        {conflicts.length > 0 && (
                          <span
                            title={buildConflictTooltip(conflicts, { therapists, patients, consultations, calendarBlocks: [...(calendarBlocks || []), ...blocks] })}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600"
                          >
                            ⚠ Conflito
                          </span>
                        )}
                      </div>
                    </div>
                    {!b.cancelled && canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          title="Editar"
                          onClick={() => setEditBlock(b)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          title="Cancelar"
                          onClick={() => setCancelConfirm(b)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                        >
                          <FiXCircle size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
