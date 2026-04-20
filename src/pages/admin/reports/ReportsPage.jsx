import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiUser, FiUsers, FiCalendar, FiChevronDown, FiExternalLink } from 'react-icons/fi'
import HelpButton from '../../../components/ui/HelpButton'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { generateConsultasPacientePDF, generateConsultasTerapeutaPDF } from '../../../utils/generateReportPDF'
import { SPECIALTIES } from '../../../constants/specialties'
import { ROUTES } from '../../../constants/routes'

const CURRENT_MONTH = new Date().toISOString().slice(0, 7) // YYYY-MM

export default function ReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    patients,
    therapists,
    consultations,
    consultationStatuses,
    appointmentTypes,
    specialtiesData,
    getGuardiansForPatient,
  } = useData()

  const isAdmin = user?.role === 'admin'

  // Terapeutas só podem gerar relatório deles mesmos
  const [reportType, setReportType] = useState('therapist')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedTherapistId, setSelectedTherapistId] = useState(isAdmin ? '' : (user?.id || ''))
  const [periodType, setPeriodType] = useState('month')
  const [periodMonth, setPeriodMonth] = useState(CURRENT_MONTH)
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [therapistSearch, setTherapistSearch] = useState('')
  const [patientOpen, setPatientOpen] = useState(false)
  const [therapistOpen, setTherapistOpen] = useState(false)
  const [selectedStatusIds, setSelectedStatusIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activePatients = useMemo(
    () => (patients || []).filter(p => !p.deleted).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [patients]
  )
  const activeTherapists = useMemo(
    () => (therapists || []).filter(t => t.active !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [therapists]
  )

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return activePatients
    const q = patientSearch.toLowerCase()
    return activePatients.filter(p => p.fullName?.toLowerCase().includes(q))
  }, [activePatients, patientSearch])

  const filteredTherapists = useMemo(() => {
    if (!therapistSearch) return activeTherapists
    const q = therapistSearch.toLowerCase()
    return activeTherapists.filter(t => t.name?.toLowerCase().includes(q))
  }, [activeTherapists, therapistSearch])

  const selectedPatient = activePatients.find(p => p.id === selectedPatientId)
  const selectedTherapist = activeTherapists.find(t => t.id === selectedTherapistId)

  function buildFilter() {
    if (periodType === 'month') return { type: 'month', month: periodMonth }
    return { type: 'range', from: periodFrom, to: periodTo }
  }

  function filterConsultations(list) {
    return list.filter(c => {
      if (periodType === 'month') {
        if (!c.date || !c.date.startsWith(periodMonth)) return false
      } else {
        if (!c.date) return false
        if (periodFrom && c.date < periodFrom) return false
        if (periodTo && c.date > periodTo) return false
      }
      if (selectedStatusIds.length > 0 && !selectedStatusIds.includes(c.consultationStatusId)) return false
      return true
    })
  }

  function toggleStatus(id) {
    setSelectedStatusIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function validateForm() {
    if (reportType === 'patient' && !selectedPatientId) return 'Selecione um paciente.'
    if (reportType === 'therapist' && !selectedTherapistId) return 'Selecione um terapeuta.'
    if (periodType === 'range') {
      if (!periodFrom || !periodTo) return 'Informe as datas de início e fim do período.'
      if (periodFrom > periodTo) return 'A data inicial deve ser anterior à data final.'
    }
    return ''
  }

  async function handleGenerate() {
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }
    setError('')
    setLoading(true)

    try {
      const filter = buildFilter()
      const allConsults = consultations || []
      const specialtiesArr = specialtiesData || Object.entries(SPECIALTIES).map(([key, v]) => ({ key, label: v.label }))

      if (reportType === 'patient') {
        const patientConsultations = filterConsultations(
          allConsults.filter(c => c.patientId === selectedPatientId)
        ).sort((a, b) => (a.date > b.date ? 1 : -1))

        const guardians = await getGuardiansForPatient(selectedPatientId)

        await generateConsultasPacientePDF({
          patient: selectedPatient,
          guardians: guardians || [],
          consultations: patientConsultations,
          therapists: activeTherapists,
          consultationStatuses: consultationStatuses || [],
          appointmentTypes: appointmentTypes || [],
          specialtiesData: specialtiesArr,
          filter,
        })
      } else {
        const therapistConsultations = filterConsultations(
          allConsults.filter(c => c.therapistId === selectedTherapistId)
        ).sort((a, b) => (a.date > b.date ? 1 : -1))

        await generateConsultasTerapeutaPDF({
          therapist: selectedTherapist,
          consultations: therapistConsultations,
          patients: activePatients,
          consultationStatuses: consultationStatuses || [],
          appointmentTypes: appointmentTypes || [],
          specialtiesData: specialtiesArr,
          filter,
        })
      }
    } catch (err) {
      setError('Erro ao gerar o PDF. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Card de acesso rápido — Relatório de Convênio */}
      <div
        onClick={() => navigate(ROUTES.CONVENIO_REPORT)}
        className="mb-5 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 cursor-pointer hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center shrink-0">
            <FiFileText size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">Relatório de Convênio</div>
            <div className="text-xs text-gray-500 mt-0.5">Gera o Relatório ao Convênio e a Lista de Presença para planos de saúde</div>
          </div>
        </div>
        <FiExternalLink size={16} className="text-brand-blue shrink-0" />
      </div>

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios em PDF</h1>
          <p className="text-sm text-gray-500 mt-1">Gere relatórios de atendimentos por paciente ou terapeuta.</p>
        </div>
        <HelpButton title="Como gerar Relatórios">
          <p><strong>Tipo de relatório:</strong> escolha entre <em>Consultas por Paciente</em> (mostra o valor cobrado do paciente por atendimento) ou <em>Consultas por Terapeuta</em> (mostra o valor do repasse ao terapeuta).</p>
          <p><strong>Selecionar:</strong> use o campo de busca para encontrar o paciente ou terapeuta desejado.</p>
          <p><strong>Período:</strong> selecione <em>Por mês</em> para escolher um mês específico, ou <em>Intervalo de datas</em> para definir um período personalizado.</p>
          <p><strong>Status:</strong> filtre por um ou mais status de atendimento para incluir apenas os registros desejados. Deixe em branco para incluir todos.</p>
          <p><strong>Valores:</strong> os valores por especialidade são configurados no cadastro de cada paciente (seção Terapeutas → Especialidades em Atendimento).</p>
          <p><strong>PDF:</strong> clique em <em>Gerar PDF</em> para baixar o arquivo.</p>
        </HelpButton>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">

        {/* Tipo de Relatório — terapeuta só vê Consultas por Terapeuta */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Relatório</label>
          <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isAdmin && (
              <button
                type="button"
                onClick={() => { setReportType('patient'); setSelectedPatientId(''); setPatientSearch('') }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  reportType === 'patient'
                    ? 'border-brand-blue bg-blue-50 text-brand-blue'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiUser size={18} />
                Consultas por Paciente
              </button>
            )}
            <button
              type="button"
              onClick={() => { setReportType('therapist'); setSelectedTherapistId(isAdmin ? '' : (user?.id || '')); setTherapistSearch('') }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                reportType === 'therapist'
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <FiUsers size={18} />
              Consultas por Terapeuta
            </button>
          </div>
        </div>

        {/* Seleção de Paciente (admin only) */}
        {reportType === 'patient' && isAdmin && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Paciente</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPatientOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl text-sm text-left bg-white hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-brand-blue"
              >
                <span className={selectedPatient ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedPatient ? selectedPatient.fullName : 'Selecione um paciente...'}
                </span>
                <FiChevronDown size={16} className="text-gray-400 shrink-0" />
              </button>
              {patientOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
                  <div className="p-2 border-b border-gray-100">
                    <input
                      autoFocus
                      type="text"
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      placeholder="Buscar paciente..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {filteredPatients.length === 0 ? (
                      <li className="px-4 py-2 text-sm text-gray-400">Nenhum paciente encontrado</li>
                    ) : filteredPatients.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedPatientId(p.id); setPatientOpen(false); setPatientSearch('') }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition ${
                            selectedPatientId === p.id ? 'bg-blue-50 text-brand-blue font-medium' : 'text-gray-700'
                          }`}
                        >
                          {p.fullName}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seleção de Terapeuta */}
        {reportType === 'therapist' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Terapeuta</label>
            {isAdmin ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTherapistOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl text-sm text-left bg-white hover:border-gray-400 transition focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <span className={selectedTherapist ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedTherapist ? selectedTherapist.name : 'Selecione um terapeuta...'}
                  </span>
                  <FiChevronDown size={16} className="text-gray-400 shrink-0" />
                </button>
                {therapistOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                      <input
                        autoFocus
                        type="text"
                        value={therapistSearch}
                        onChange={e => setTherapistSearch(e.target.value)}
                        placeholder="Buscar terapeuta..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {filteredTherapists.length === 0 ? (
                        <li className="px-4 py-2 text-sm text-gray-400">Nenhum terapeuta encontrado</li>
                      ) : filteredTherapists.map(t => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedTherapistId(t.id); setTherapistOpen(false); setTherapistSearch('') }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition ${
                              selectedTherapistId === t.id ? 'bg-blue-50 text-brand-blue font-medium' : 'text-gray-700'
                            }`}
                          >
                            {t.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-700 cursor-not-allowed">
                {selectedTherapist ? selectedTherapist.name : 'Carregando...'}
              </div>
            )}
          </div>
        )}

        {/* Período */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Período</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setPeriodType('month')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                periodType === 'month'
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <FiCalendar size={14} />
              Por mês
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('range')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                periodType === 'range'
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <FiCalendar size={14} />
              Intervalo de datas
            </button>
          </div>

          {periodType === 'month' ? (
            <input
              type="month"
              value={periodMonth}
              onChange={e => setPeriodMonth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">De</label>
                <input
                  type="date"
                  value={periodFrom}
                  onChange={e => setPeriodFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Até</label>
                <input
                  type="date"
                  value={periodTo}
                  onChange={e => setPeriodTo(e.target.value)}
                  min={periodFrom || undefined}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status do Atendimento */}
        {(consultationStatuses || []).filter(s => s.active !== false).length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status do Atendimento
              <span className="ml-2 text-xs font-normal text-gray-400">(deixe em branco para incluir todos)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(consultationStatuses || [])
                .filter(s => s.active !== false)
                .map(s => {
                  const checked = selectedStatusIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStatus(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        checked
                          ? 'border-brand-blue bg-blue-50 text-brand-blue'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color || '#6b7280' }} />
                      {s.name}
                    </button>
                  )
                })}
            </div>
            {selectedStatusIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedStatusIds([])}
                className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Limpar seleção
              </button>
            )}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Botão gerar */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm"
        >
          <FiFileText size={18} />
          {loading ? 'Gerando PDF...' : 'Gerar PDF'}
        </button>
      </div>
    </div>
  )
}