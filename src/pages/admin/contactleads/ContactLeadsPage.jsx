import { useState, useEffect, useCallback } from 'react'
import { FiMessageSquare, FiRefreshCw, FiPhone, FiMail, FiSearch, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SPECIALTIES } from '../../../constants/specialties'
import HelpButton from '../../../components/ui/HelpButton'

const STATUSES = {
  novo:          { label: 'Novo',            color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  em_contato:    { label: 'Em Contato',      color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  agendado:      { label: 'Agendado',        color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  convertido:    { label: 'Convertido',      color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  sem_interesse: { label: 'Sem Interesse',   color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
}

function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.novo
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function LeadCard({ lead, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(lead.status)
  const [note, setNote] = useState(lead.internal_note || '')
  const [assigned, setAssigned] = useState(lead.assigned_to || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('contact_leads')
      .update({
        status,
        internal_note: note || null,
        assigned_to: assigned || null,
        last_contact_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
    setSaving(false)
    if (!error) onUpdate({ ...lead, status, internal_note: note, assigned_to: assigned })
  }

  const specialty = lead.specialty ? (SPECIALTIES[lead.specialty]?.label || lead.specialty) : null

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${status === 'novo' ? 'border-red-200' : 'border-gray-100'}`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${status === 'novo' ? 'bg-red-100 text-red-700' : 'bg-brand-yellow/20 text-brand-blue'}`}>
          {lead.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{lead.name}</span>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">{format(parseISO(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            {specialty && <span className="text-xs text-brand-blue font-medium">{specialty}</span>}
            {lead.how_found && <span className="text-xs text-gray-400">{lead.how_found}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.phone && (
            <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
              <FiPhone size={14} />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
              <FiMail size={14} />
            </a>
          )}
          {expanded ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Body expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-50">
          {/* Contato */}
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-400 text-xs">Telefone</span><div className="font-medium text-gray-800">{lead.phone}</div></div>
            {lead.email && <div><span className="text-gray-400 text-xs">E-mail</span><div className="font-medium text-gray-800">{lead.email}</div></div>}
          </div>

          {/* Mensagem */}
          <div>
            <span className="text-xs text-gray-400">Mensagem</span>
            <p className="mt-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 whitespace-pre-line">{lead.message}</p>
          </div>

          {/* Controles admin */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
                >
                  {Object.entries(STATUSES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
                <input
                  value={assigned}
                  onChange={e => setAssigned(e.target.value)}
                  placeholder="E-mail do responsável"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nota Interna</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder="Observações sobre o contato..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none resize-none"
              />
            </div>
            {lead.last_contact_at && (
              <p className="text-xs text-gray-400">
                Último contato: {format(parseISO(lead.last_contact_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue-dark transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ContactLeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contact_leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  function handleUpdate(updated) {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  const filtered = leads.filter(l => {
    const matchStatus = !filterStatus || l.status === filterStatus
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.message.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const novosCount = leads.filter(l => l.status === 'novo').length

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <FiMessageSquare size={18} className="text-brand-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Contatos</h1>
              {novosCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{novosCount}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{filtered.length} exibido(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton title="Como usar Contatos">
            <p><strong>Origem:</strong> este painel exibe mensagens enviadas pelo formulário de contato do site público.</p>
            <p><strong>Status:</strong> avance o status conforme o andamento — <em>Novo</em> (vermelho) → <em>Em Contato</em> → <em>Agendado</em> → <em>Convertido</em> ou <em>Sem Interesse</em>.</p>
            <p><strong>Notas internas:</strong> use o campo de nota interna para registrar informações do atendimento (não visível pelo contato).</p>
            <p><strong>Responsável:</strong> preencha o campo <em>Responsável</em> para indicar quem está tratando o contato.</p>
            <p><strong>Dashboard:</strong> um banner vermelho aparece no painel principal enquanto houver contatos com status <em>Novo</em>.</p>
          </HelpButton>
          <button
            onClick={fetchLeads}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou mensagem..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Todos os Status</option>
          {Object.entries(STATUSES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">Nenhum contato encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lead => (
            <LeadCard key={lead.id} lead={lead} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
