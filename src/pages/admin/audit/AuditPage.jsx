import { useState, useEffect, useCallback } from 'react'
import { FiShield, FiSearch, FiRefreshCw } from 'react-icons/fi'
import { supabase } from '../../../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACTION_LABELS = {
  VIEW:   { label: 'Visualização', color: 'bg-blue-100 text-blue-700' },
  INSERT: { label: 'Inclusão',     color: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Alteração',    color: 'bg-yellow-100 text-yellow-700' },
  DELETE: { label: 'Exclusão',     color: 'bg-red-100 text-red-700' },
}

const RESOURCE_LABELS = {
  patients:                 'Paciente',
  guardians:                'Responsável',
  consultations:            'Atendimento',
  medical_records:          'Prontuário',
  medical_record_exams:     'Exame',
  medical_record_medications: 'Medicamento',
  medical_record_conducts:  'Conduta',
}

const PAGE_SIZE = 50

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  // Carrega lista de usuários distintos para o filtro
  useEffect(() => {
    supabase
      .from('audit_logs')
      .select('user_email')
      .neq('user_email', '')
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map(r => r.user_email))].sort()
          setUsers(unique)
        }
      })
  }, [])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (filterAction) query = query.eq('action', filterAction)
    if (filterResource) query = query.eq('resource_type', filterResource)
    if (filterUser) query = query.eq('user_email', filterUser)
    if (filterDate) {
      query = query.gte('created_at', `${filterDate}T00:00:00`)
                   .lte('created_at', `${filterDate}T23:59:59`)
    }
    if (search) {
      query = query.ilike('resource_name', `%${search}%`)
    }

    const { data, count, error } = await query
    if (!error) {
      setLogs(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [page, filterAction, filterResource, filterDate, filterUser, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Reset page when filters change
  useEffect(() => { setPage(0) }, [filterAction, filterResource, filterDate, filterUser, search])

  function formatDate(iso) {
    try { return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) }
    catch { return iso }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <FiShield size={18} className="text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Log de Auditoria</h1>
            <p className="text-xs text-gray-500 mt-0.5">{total} registro(s)</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por registro..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Todos os Usuários</option>
          {users.map(email => (
            <option key={email} value={email}>{email}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Todas as Ações</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterResource}
          onChange={e => setFilterResource(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        >
          <option value="">Todos os Recursos</option>
          {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Nenhum registro encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50/50">
                  <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-medium">Usuário</th>
                  <th className="px-4 py-3 text-left font-medium">Ação</th>
                  <th className="px-4 py-3 text-left font-medium">Recurso</th>
                  <th className="px-4 py-3 text-left font-medium">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const action = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' }
                  const resource = RESOURCE_LABELS[log.resource_type] || log.resource_type
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate text-xs">{log.user_email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${action.color}`}>
                          {action.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{resource}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium text-xs max-w-[200px] truncate">{log.resource_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 text-xs">
            Página {page + 1} de {totalPages} ({total} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 text-xs"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
