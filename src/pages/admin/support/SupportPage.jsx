import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiRefreshCw, FiSearch } from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import SupportFormModal, { TICKET_TYPES, TICKET_STATUS } from './SupportFormModal'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function SupportPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)

  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*, support_ticket_history(*)')
      .order('created_at', { ascending: false })
    setTickets((data || []).map(t => ({
      ...t,
      history: (t.support_ticket_history || []).sort((a, b) => a.changed_at.localeCompare(b.changed_at)),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setSelected(null); setShowModal(true) }
  function openEdit(ticket) { setSelected(ticket); setShowModal(true) }
  function handleSaved() { load() }

  const filtered = tickets.filter(t => {
    if (filterType && t.type !== filterType) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.subject?.toLowerCase().includes(q) && !t.author?.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (!isAdmin) return <div className="p-8 text-center text-gray-500">Acesso restrito a administradores.</div>

  return (
    <div className="p-3 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suporte</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de erros, dúvidas e melhorias do sistema.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-blue-dark transition-colors"
        >
          <FiPlus size={16} /> Novo Suporte
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar assunto ou autor..."
            className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none w-56"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none text-gray-700"
        >
          <option value="">Todos os Tipos</option>
          {Object.entries(TICKET_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none text-gray-700"
        >
          <option value="">Todos os Status</option>
          {Object.entries(TICKET_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue transition-colors"
          title="Atualizar"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {tickets.length === 0 ? 'Nenhum ticket registrado.' : 'Nenhum resultado para os filtros aplicados.'}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assunto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Autor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const type = TICKET_TYPES[t.type]
                  const status = TICKET_STATUS[t.status]
                  return (
                    <tr
                      key={t.id}
                      onClick={() => openEdit(t)}
                      className="border-b border-gray-50 last:border-0 hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{t.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${type?.color || 'bg-gray-100 text-gray-600'}`}>
                          {type?.label || t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.author}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-600'}`}>
                          {status?.label || t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(t.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(t => {
              const type = TICKET_TYPES[t.type]
              const status = TICKET_STATUS[t.status]
              return (
                <div
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className="bg-white rounded-2xl border border-gray-200 p-4 cursor-pointer hover:border-brand-blue transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-gray-900 text-sm leading-snug">{t.subject}</p>
                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status?.color || 'bg-gray-100 text-gray-600'}`}>
                      {status?.label || t.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${type?.color || 'bg-gray-100 text-gray-600'}`}>
                      {type?.label || t.type}
                    </span>
                    <span className="text-xs text-gray-500">{t.author}</span>
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(t.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Contagem */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">{filtered.length} registro(s)</p>
      )}

      {showModal && (
        <SupportFormModal
          initial={selected}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
