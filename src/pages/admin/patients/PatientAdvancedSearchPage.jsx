import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiFilter, FiX, FiSearch, FiUser, FiChevronRight, FiChevronDown, FiCheck } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import { calculateAge, calculateAgeYears, formatDateShort } from '../../../utils/dateUtils'

// ─── MultiSelectFilter ────────────────────────────────────────────────────────

function MultiSelectFilter({ label, options, value, onChange, placeholder = 'Todos' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  const trigger = value.length === 0
    ? placeholder
    : value.length === 1
      ? (options.find(o => o.value === value[0])?.label ?? `1 selecionado`)
      : `${value.length} selecionados`

  function toggle(v) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none text-left"
      >
        <span className={value.length > 0 ? 'text-gray-900 truncate' : 'text-gray-400 truncate'}>{trigger}</span>
        <FiChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400">Nenhuma opção</p>
          ) : (
            options.map(opt => {
              const selected = value.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'}`}>
                    {selected && <FiCheck size={10} className="text-white" />}
                  </span>
                  <input type="checkbox" checked={selected} onChange={() => toggle(opt.value)} className="sr-only" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(patients, { therapists, patientStatuses, paymentMethods, diagnoses, specialtiesData }) {
  const headers = [
    'Nome', 'Data Nasc.', 'Sexo', 'CPF', 'Telefone', 'Email',
    'Status', 'Forma Pagamento', 'Diagnóstico Principal',
    'Comorbidades', 'Especialidades', 'Gerente de Caso', 'Terapeutas Envolvidos',
    'Cidade', 'Escola',
  ]

  const therapistName = id => therapists.find(t => t.id === id)?.name || ''
  const statusName    = id => patientStatuses.find(s => s.id === id)?.name || ''
  const paymentName   = id => paymentMethods.find(m => m.id === id)?.name || ''
  const diagName      = id => diagnoses.find(d => d.id === id)?.name || id
  const sexLabel      = s  => s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : s || ''

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
    (p.specialties || []).map(s => specialtiesData.find(x => x.key === s.key)?.label || s.key).join(' | '),
    therapistName(p.therapistId),
    (p.involvedTherapistIds || []).map(therapistName).filter(Boolean).join(' | '),
    p.city || '',
    p.schoolName || '',
  ])

  const escape = v => {
    const str = String(v ?? '')
    return (str.includes(';') || str.includes('"') || str.includes('\n'))
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const csv = [headers, ...rows].map(row => row.map(escape).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `pacientes_${new Date().toISOString().split('T')[0]}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientAdvancedSearchPage() {
  const {
    patients, therapists, specialtiesData, paymentMethods,
    diagnoses, patientStatuses, ageRanges,
  } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [filterTherapists,    setFilterTherapists]    = useState([])
  const [filterCaseManagers,  setFilterCaseManagers]  = useState([])
  const [filterSpecialties,   setFilterSpecialties]   = useState([])
  const [filterPayments,      setFilterPayments]      = useState([])
  const [filterDiagnoses,     setFilterDiagnoses]     = useState([])
  const [filterStatuses,      setFilterStatuses]      = useState([])
  const [filterAgeRanges,     setFilterAgeRanges]     = useState([])
  const [search, setSearch] = useState('')

  const activeTherapists  = therapists.filter(t => t.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const activePayments    = paymentMethods.filter(m => m.active !== false)
  const activeDiagnoses   = diagnoses.filter(d => d.active !== false)
  const activeStatuses    = patientStatuses.filter(s => s.active !== false)

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
        if (
          !p.fullName?.toLowerCase().includes(q) &&
          !p.cpf?.includes(q) &&
          !p.diagnosis?.toLowerCase().includes(q)
        ) return false
      }

      if (filterCaseManagers.length > 0 && !filterCaseManagers.includes(p.therapistId)) return false

      if (filterTherapists.length > 0) {
        const isManager  = filterTherapists.includes(p.therapistId)
        const isInvolved = (p.involvedTherapistIds || []).some(id => filterTherapists.includes(id))
        if (!isManager && !isInvolved) return false
      }

      if (filterSpecialties.length > 0) {
        if (!filterSpecialties.some(key => (p.specialties || []).some(s => s.key === key))) return false
      }

      if (filterPayments.length > 0 && !filterPayments.includes(p.paymentMethodId)) return false

      if (filterDiagnoses.length > 0) {
        const match = filterDiagnoses.some(id => {
          const diag = diagnoses.find(d => d.id === id)
          return (diag && p.diagnosis === diag.name) || (p.conditionIds || []).includes(id)
        })
        if (!match) return false
      }

      if (filterStatuses.length > 0 && !filterStatuses.includes(p.statusId)) return false

      if (filterAgeRanges.length > 0) {
        const years = calculateAgeYears(p.dateOfBirth)
        const inRange = filterAgeRanges.some(id => {
          const range = ageRanges.find(r => r.id === id)
          return range && years !== null && years >= range.minAge && years < range.maxAge
        })
        if (!inRange) return false
      }

      return true
    })
  }, [
    accessiblePatients, search,
    filterCaseManagers, filterTherapists, filterSpecialties,
    filterPayments, filterDiagnoses, filterStatuses, filterAgeRanges,
    diagnoses, ageRanges,
  ])

  const hasFilters =
    filterTherapists.length > 0 || filterCaseManagers.length > 0 ||
    filterSpecialties.length > 0 || filterPayments.length > 0 ||
    filterDiagnoses.length > 0 || filterStatuses.length > 0 ||
    filterAgeRanges.length > 0 || search

  function clearFilters() {
    setFilterTherapists([]);   setFilterCaseManagers([])
    setFilterSpecialties([]);  setFilterPayments([])
    setFilterDiagnoses([]);    setFilterStatuses([])
    setFilterAgeRanges([]);    setSearch('')
  }

  function getAgeRange(dateOfBirth) {
    if (!dateOfBirth || !ageRanges?.length) return null
    const years = calculateAgeYears(dateOfBirth)
    if (years === null) return null
    return ageRanges.find(r => years >= r.minAge && years < r.maxAge) || null
  }

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

        {/* Text search */}
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
          <MultiSelectFilter
            label="Gerente de Caso"
            options={activeTherapists.map(t => ({ value: t.id, label: t.name }))}
            value={filterCaseManagers}
            onChange={setFilterCaseManagers}
          />
          <MultiSelectFilter
            label="Terapeuta (qualquer vínculo)"
            options={activeTherapists.map(t => ({ value: t.id, label: t.name }))}
            value={filterTherapists}
            onChange={setFilterTherapists}
          />
          <MultiSelectFilter
            label="Especialidade"
            options={activeSpecialties.map(s => ({ value: s.key, label: s.label }))}
            value={filterSpecialties}
            onChange={setFilterSpecialties}
            placeholder="Todas"
          />
          <MultiSelectFilter
            label="Forma de Pagamento"
            options={activePayments.map(m => ({ value: m.id, label: m.name }))}
            value={filterPayments}
            onChange={setFilterPayments}
            placeholder="Todas"
          />
          <MultiSelectFilter
            label="Diagnóstico"
            options={activeDiagnoses.map(d => ({ value: d.id, label: d.name }))}
            value={filterDiagnoses}
            onChange={setFilterDiagnoses}
            placeholder="Todos"
          />
          <MultiSelectFilter
            label="Status do Paciente"
            options={activeStatuses.map(s => ({ value: s.id, label: s.name }))}
            value={filterStatuses}
            onChange={setFilterStatuses}
            placeholder="Todos"
          />
          {ageRanges.length > 0 && (
            <MultiSelectFilter
              label="Faixa Etária"
              options={ageRanges.map(r => ({ value: r.id, label: `${r.name} (${r.minAge}–${r.maxAge} anos)` }))}
              value={filterAgeRanges}
              onChange={setFilterAgeRanges}
              placeholder="Todas"
            />
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