import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiFilter, FiX, FiSearch, FiUser, FiChevronRight } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import { calculateAge, calculateAgeYears, formatDateShort } from '../../../utils/dateUtils'

function exportCSV(patients, { therapists, patientStatuses, paymentMethods, diagnoses, specialtiesData }) {
  const headers = [
    'Nome', 'Data Nasc.', 'Sexo', 'CPF', 'Telefone', 'Email',
    'Status', 'Forma Pagamento', 'Diagnóstico Principal',
    'Comorbidades', 'Especialidades', 'Gerente de Caso', 'Terapeutas Envolvidos',
    'Cidade', 'Escola',
  ]

  function therapistName(id) {
    return therapists.find(t => t.id === id)?.name || ''
  }
  function statusName(id) {
    return patientStatuses.find(s => s.id === id)?.name || ''
  }
  function paymentName(id) {
    return paymentMethods.find(m => m.id === id)?.name || ''
  }
  function diagName(id) {
    return diagnoses.find(d => d.id === id)?.name || id
  }
  function sexLabel(s) {
    return s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : s || ''
  }

  const rows = patients.map(p => [
    p.fullName,
    p.dateOfBirth || '',
    sexLabel(p.sex),
    p.cpf || '',
    p.phone || '',
    p.email || '',
    statusName(p.statusId),
    paymentName(p.paymentMethodId),
    p.diagnosis || '',
    (p.conditionIds || []).map(diagName).join(' | '),
    (p.specialties || []).map(s => {
      const sp = specialtiesData.find(x => x.key === s.key)
      return sp?.label || s.key
    }).join(' | '),
    therapistName(p.therapistId),
    (p.involvedTherapistIds || []).map(therapistName).filter(Boolean).join(' | '),
    p.city || '',
    p.schoolName || '',
  ])

  const escape = (v) => {
    const str = String(v ?? '')
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const csvContent = [headers, ...rows]
    .map(row => row.map(escape).join(';'))
    .join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PatientAdvancedSearchPage() {
  const {
    patients, therapists, specialtiesData, paymentMethods, diagnoses,
    patientStatuses, ageRanges,
  } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterCaseManager, setFilterCaseManager] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [filterDiagnosis, setFilterDiagnosis] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAgeRange, setFilterAgeRange] = useState('')
  const [search, setSearch] = useState('')

  const activeTherapists = therapists.filter(t => t.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const activePayments = paymentMethods.filter(m => m.active !== false)
  const activeDiagnoses = diagnoses.filter(d => d.active !== false)
  const activeStatuses = patientStatuses.filter(s => s.active !== false)

  const accessiblePatients = useMemo(() => {
    const base = patients.filter(p => !p.deleted)
    if (user?.role === 'admin' || user?.belongsToTeam) return base
    return base.filter(p =>
      p.therapistId === user?.id ||
      (p.involvedTherapistIds || []).includes(user?.id)
    )
  }, [patients, user])

  const filtered = useMemo(() => {
    return accessiblePatients.filter(p => {
      if (search) {
        const q = search.toLowerCase()
        const matchSearch =
          p.fullName?.toLowerCase().includes(q) ||
          p.cpf?.includes(q) ||
          p.diagnosis?.toLowerCase().includes(q)
        if (!matchSearch) return false
      }

      if (filterCaseManager && p.therapistId !== filterCaseManager) return false

      if (filterTherapist) {
        const isManager = p.therapistId === filterTherapist
        const isInvolved = (p.involvedTherapistIds || []).includes(filterTherapist)
        if (!isManager && !isInvolved) return false
      }

      if (filterSpecialty && !(p.specialties || []).some(s => s.key === filterSpecialty)) return false

      if (filterPayment && p.paymentMethodId !== filterPayment) return false

      if (filterDiagnosis) {
        const diag = diagnoses.find(d => d.id === filterDiagnosis)
        const inMain = diag && p.diagnosis === diag.name
        const inComorbidity = (p.conditionIds || []).includes(filterDiagnosis)
        if (!inMain && !inComorbidity) return false
      }

      if (filterStatus && p.statusId !== filterStatus) return false

      if (filterAgeRange) {
        const range = ageRanges.find(r => r.id === filterAgeRange)
        if (range) {
          const years = calculateAgeYears(p.dateOfBirth)
          if (years === null || years < range.minAge || years >= range.maxAge) return false
        }
      }

      return true
    })
  }, [accessiblePatients, search, filterCaseManager, filterTherapist, filterSpecialty, filterPayment, filterDiagnosis, filterStatus, filterAgeRange, diagnoses, ageRanges])

  const hasFilters = filterTherapist || filterCaseManager || filterSpecialty || filterPayment || filterDiagnosis || filterStatus || filterAgeRange || search

  function clearFilters() {
    setFilterTherapist('')
    setFilterCaseManager('')
    setFilterSpecialty('')
    setFilterPayment('')
    setFilterDiagnosis('')
    setFilterStatus('')
    setFilterAgeRange('')
    setSearch('')
  }

  function getAgeRange(dateOfBirth) {
    if (!dateOfBirth || !ageRanges?.length) return null
    const years = calculateAgeYears(dateOfBirth)
    if (years === null) return null
    return ageRanges.find(r => years >= r.minAge && years < r.maxAge) || null
  }

  const selectClass = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none w-full'

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.PATIENTS)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Busca Avançada — Pacientes</h1>
            <p className="text-xs text-gray-500 mt-0.5">{filtered.length} resultado(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <FiX size={13} /> Limpar
            </button>
          )}
          <Button
            variant="secondary"
            onClick={() => exportCSV(filtered, { therapists, patientStatuses, paymentMethods, diagnoses, specialtiesData })}
            disabled={filtered.length === 0}
          >
            <FiDownload size={15} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FiFilter size={14} className="text-brand-blue" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filtros</span>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou diagnóstico..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Gerente de Caso */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gerente de Caso</label>
            <select value={filterCaseManager} onChange={e => setFilterCaseManager(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Terapeuta (qualquer vínculo) */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Terapeuta (qualquer vínculo)</label>
            <select value={filterTherapist} onChange={e => setFilterTherapist(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Especialidade */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Especialidade</label>
            <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)} className={selectClass}>
              <option value="">Todas</option>
              {activeSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Forma de Pagamento</label>
            <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} className={selectClass}>
              <option value="">Todas</option>
              {activePayments.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Diagnóstico */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Diagnóstico</label>
            <select value={filterDiagnosis} onChange={e => setFilterDiagnosis(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {activeDiagnoses.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Status do Paciente */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status do Paciente</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="">Todos</option>
              {activeStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Faixa Etária */}
          {ageRanges.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Faixa Etária</label>
              <select value={filterAgeRange} onChange={e => setFilterAgeRange(e.target.value)} className={selectClass}>
                <option value="">Todas</option>
                {ageRanges.map(r => <option key={r.id} value={r.id}>{r.name} ({r.minAge}–{r.maxAge} anos)</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FiUser}
            title="Nenhum paciente encontrado"
            description={hasFilters ? 'Tente ajustar os filtros.' : 'Selecione filtros para buscar pacientes.'}
          />
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map(p => {
                const ps = patientStatuses.find(s => s.id === p.statusId)
                const ar = getAgeRange(p.dateOfBirth)
                const therapist = therapists.find(t => t.id === p.therapistId)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-3 active:bg-gray-50"
                    onClick={() => navigate(`/admin/pacientes/${p.id}`)}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 bg-brand-yellow/20 text-brand-blue">
                      {p.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.fullName}</div>
                      <div className="text-xs text-gray-500">{calculateAge(p.dateOfBirth)}</div>
                      {therapist && <div className="text-xs text-gray-400 truncate">{therapist.name}</div>}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {ps && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.name}</span>}
                        {ar && <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: ar.color }}>{ar.name}</span>}
                        {(p.specialties || []).slice(0, 1).map(s => <Badge key={s.key} specialty={s.key} />)}
                      </div>
                    </div>
                    <FiChevronRight size={14} className="text-gray-300 shrink-0" />
                  </div>
                )
              })}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Idade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Gerente de Caso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Especialidades</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Diagnóstico</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => {
                    const ps = patientStatuses.find(s => s.id === p.statusId)
                    const ar = getAgeRange(p.dateOfBirth)
                    const therapist = therapists.find(t => t.id === p.therapistId)
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/admin/pacientes/${p.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 bg-brand-yellow/20 text-brand-blue">
                              {p.fullName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{p.fullName}</div>
                              <div className="text-xs text-gray-500">{formatDateShort(p.dateOfBirth)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{calculateAge(p.dateOfBirth)}</div>
                          {ar && <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: ar.color }}>{ar.name}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{therapist?.name || '—'}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(p.specialties || []).slice(0, 2).map(s => <Badge key={s.key} specialty={s.key} />)}
                            {(p.specialties || []).length > 2 && <span className="text-xs text-gray-400">+{p.specialties.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell max-w-xs">
                          <span className="truncate block">{p.diagnosis || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {ps
                            ? <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.name}</span>
                            : <Badge patientStatus={p.statusId} />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}