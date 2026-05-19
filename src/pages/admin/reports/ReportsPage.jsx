import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiFileText, FiUser, FiUsers, FiCalendar, FiChevronDown, FiExternalLink, FiX, FiDownload, FiChevronRight } from 'react-icons/fi'
import HelpButton from '../../../components/ui/HelpButton'
import Modal from '../../../components/ui/Modal'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { generateConsultasPacientePDF, generateConsultasTerapeutaPDF, findPatientSpecialtyConfig } from '../../../utils/generateReportPDF'
import { SPECIALTIES } from '../../../constants/specialties'
import { ROUTES } from '../../../constants/routes'
import { formatMesLabel } from '../../../utils/pdfShared'

const fmtDate = iso => iso ? new Date(iso.length === 10 ? iso + 'T00:00:00' : iso).toLocaleDateString('pt-BR') : '—'
const fmtCurrency = v => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function DemonstrativoPreviewModal({ previewData, patient, onClose, onDraft, onFaturar, draftLoading }) {
  const { blob, filename } = previewData
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  return (
    <Modal
      title={`Pré-visualização — ${patient?.fullName || 'Demonstrativo'}`}
      onClose={onClose}
      size="xl"
      footer={
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onDraft}
            disabled={draftLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <FiFileText size={14} />
            {draftLoading ? 'Gerando...' : 'Gerar DRAFT'}
          </button>
          <button
            type="button"
            onClick={onFaturar}
            disabled={draftLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-dark transition-colors disabled:opacity-60"
          >
            <FiDownload size={14} />
            Faturar
          </button>
        </div>
      }
    >
      {url
        ? <iframe src={url} className="w-full border-0 rounded-xl" style={{ height: '70vh' }} title={filename} />
        : <div className="flex items-center justify-center" style={{ height: '70vh' }}>
            <span className="text-gray-400 text-sm">Carregando pré-visualização...</span>
          </div>
      }
    </Modal>
  )
}

function HistoricoSection({ patientId, refreshKey, getPaymentDemonstrativos }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)

  useEffect(() => {
    if (!patientId) { setRecords([]); return }
    let cancelled = false
    setLoading(true)
    getPaymentDemonstrativos(patientId)
      .then(data => { if (!cancelled) setRecords(data || []) })
      .catch(() => { if (!cancelled) setRecords([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, refreshKey])

  if (!patientId || (records.length === 0 && !loading)) return null

  return (
    <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">Demonstrativos Faturados</h2>
        {loading && <span className="text-xs text-gray-400">Carregando...</span>}
      </div>
      {!loading && records.length === 0 ? null : (
        <div className="divide-y divide-gray-50">
          {records.map(r => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900">{r.mes_label}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {r.nf_number && <span className="text-xs text-gray-500">NF {r.nf_number}</span>}
                  {r.nf_date && <span className="text-xs text-gray-500">Emitida {fmtDate(r.nf_date)}</span>}
                  {r.form_data?.totalAmount > 0 && (
                    <span className="text-xs font-semibold text-green-700">{fmtCurrency(r.form_data.totalAmount)}</span>
                  )}
                  <span className="text-xs text-gray-400">{fmtDate(r.created_at?.slice(0, 10))}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailRecord(r)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                title="Ver detalhes"
              >
                <FiChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
      {detailRecord && (
        <Modal title="Detalhes do Demonstrativo" onClose={() => setDetailRecord(null)} size="sm">
          <div className="space-y-3 text-sm p-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Período</span>
              <span className="font-medium text-right">{detailRecord.mes_label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Atendimentos</span>
              <span className="font-medium">{detailRecord.consultation_ids?.length || 0}</span>
            </div>
            {detailRecord.form_data?.totalAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Total</span>
                <span className="font-semibold text-green-700 font-mono">{fmtCurrency(detailRecord.form_data.totalAmount)}</span>
              </div>
            )}
            {detailRecord.nf_number && (
              <div className="flex justify-between">
                <span className="text-gray-400">Número NF</span>
                <span className="font-medium">{detailRecord.nf_number}</span>
              </div>
            )}
            {detailRecord.nf_date && (
              <div className="flex justify-between">
                <span className="text-gray-400">Data emissão</span>
                <span className="font-medium">{fmtDate(detailRecord.nf_date)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Gerado em</span>
              <span className="font-medium">{fmtDate(detailRecord.created_at?.slice(0, 10))}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7) // YYYY-MM

export default function ReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    patients,
    therapists,
    consultations,
    consultationStatuses,
    appointmentTypes,
    specialtiesData,
    getGuardiansForPatient,
    companySettings,
    batchFaturarConsultations,
    addPaymentDemonstrativo,
    getPaymentDemonstrativos,
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
  const [unconfiguredWarning, setUnconfiguredWarning] = useState(null)
  // Preview mode — Demonstrativo de Pagamento (admin only)
  const [previewBlobData, setPreviewBlobData] = useState(null) // { blob, filename, totalAmount }
  const [pendingConsultations, setPendingConsultations] = useState([])
  const [previewTotalAmount, setPreviewTotalAmount] = useState(0)
  const [showNfModal, setShowNfModal] = useState(false)
  const [nfNumber, setNfNumber] = useState('')
  const [nfDate, setNfDate] = useState(new Date().toISOString().slice(0, 10))
  const [faturandoLoading, setFaturandoLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

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

  function buildUnconfiguredItems(consults, patientsArr, specialtiesArr) {
    const byPatient = new Map()
    for (const c of consults) {
      const patient = patientsArr.find(p => p.id === c.patientId)
      if (!patient) continue
      const spec = findPatientSpecialtyConfig(patient, c.specialty, specialtiesArr)
      if (!spec) {
        if (!byPatient.has(patient.fullName)) byPatient.set(patient.fullName, new Set())
        const label = specialtiesArr.find(s => s.key === c.specialty)?.label || c.specialty
        byPatient.get(patient.fullName).add(label)
      }
    }
    return [...byPatient.entries()].map(([name, sps]) => ({ name, specialties: [...sps] }))
  }

  async function buildPDFArgs(consults, options = {}) {
    const filter = buildFilter()
    const specialtiesArr = specialtiesData || Object.entries(SPECIALTIES).map(([key, v]) => ({ key, label: v.label }))
    const sorted = [...consults].sort((a, b) => (a.date > b.date ? 1 : -1))
    const guardians = await getGuardiansForPatient(selectedPatientId)
    return {
      patient: selectedPatient,
      guardians: guardians || [],
      consultations: sorted,
      therapists: activeTherapists,
      consultationStatuses: consultationStatuses || [],
      appointmentTypes: appointmentTypes || [],
      specialtiesData: specialtiesArr,
      filter,
      companySettings,
      ...options,
    }
  }

  async function openPreview(consults) {
    setLoading(true)
    try {
      const args = await buildPDFArgs(consults, { returnBlob: true })
      const result = await generateConsultasPacientePDF(args)
      setPendingConsultations(consults)
      setPreviewBlobData(result)
      setNfNumber('')
      setNfDate(new Date().toISOString().slice(0, 10))
    } catch (err) {
      setError('Erro ao gerar o PDF. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDraft() {
    setDraftLoading(true)
    try {
      const args = await buildPDFArgs(pendingConsultations, { draftMode: true })
      await generateConsultasPacientePDF(args)
    } catch (err) {
      toast.show('Erro ao gerar DRAFT.', 'error')
      console.error(err)
    } finally {
      setDraftLoading(false)
    }
  }

  async function generateTherapistPDF(consults) {
    setLoading(true)
    try {
      const filter = buildFilter()
      const specialtiesArr = specialtiesData || Object.entries(SPECIALTIES).map(([key, v]) => ({ key, label: v.label }))
      const sorted = [...consults].sort((a, b) => (a.date > b.date ? 1 : -1))
      await generateConsultasTerapeutaPDF({
        therapist: selectedTherapist,
        consultations: sorted,
        patients: activePatients,
        consultationStatuses: consultationStatuses || [],
        appointmentTypes: appointmentTypes || [],
        specialtiesData: specialtiesArr,
        filter,
        companySettings,
      })
    } catch (err) {
      setError('Erro ao gerar o PDF. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    const validationError = validateForm()
    if (validationError) { setError(validationError); return }
    setError('')
    setUnconfiguredWarning(null)

    const allConsults = consultations || []
    const specialtiesArr = specialtiesData || Object.entries(SPECIALTIES).map(([key, v]) => ({ key, label: v.label }))

    let consults
    if (reportType === 'patient') {
      consults = filterConsultations(allConsults.filter(c => c.patientId === selectedPatientId))
      const items = buildUnconfiguredItems(consults, [selectedPatient], specialtiesArr)
      if (items.length > 0) { setUnconfiguredWarning({ items, pendingConsults: consults }); return }
      await openPreview(consults)
    } else {
      consults = filterConsultations(allConsults.filter(c => c.therapistId === selectedTherapistId))
      const items = buildUnconfiguredItems(consults, activePatients, specialtiesArr)
      if (items.length > 0) { setUnconfiguredWarning({ items, pendingConsults: consults }); return }
      await generateTherapistPDF(consults)
    }
  }

  // Calcula period_start / period_end e mes_label para o demonstrativo
  function buildDemonstrativoPeriod() {
    if (periodType === 'month') {
      const [y, m] = periodMonth.split('-').map(Number)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0)
      const toISO = d => d.toISOString().slice(0, 10)
      return { periodStart: toISO(start), periodEnd: toISO(end), mesLabel: formatMesLabel(periodMonth) }
    }
    return {
      periodStart: periodFrom,
      periodEnd: periodTo,
      mesLabel: `${periodFrom?.split('-').reverse().join('/')} – ${periodTo?.split('-').reverse().join('/')}`,
    }
  }

  async function handleFaturar() {
    const faturadoStatus = (consultationStatuses || []).find(s =>
      s.name?.toLowerCase().includes('faturado')
    )
    if (!faturadoStatus) {
      toast.show('Status "Faturado" não encontrado. Crie-o em Status Atendimento antes de faturar.', 'error')
      return
    }
    setFaturandoLoading(true)
    const ids = pendingConsultations.map(c => c.id)
    try {
      // 1. Salva histórico PRIMEIRO — se falhar, nada mais acontece
      const { periodStart, periodEnd, mesLabel } = buildDemonstrativoPeriod()
      await addPaymentDemonstrativo({
        patientId: selectedPatientId,
        periodStart, periodEnd, mesLabel,
        nfNumber: nfNumber || null,
        nfDate: nfDate || null,
        consultationIds: ids,
        totalAmount: previewTotalAmount,
        formData: { patientName: selectedPatient?.fullName, periodType, periodMonth, periodFrom, periodTo },
      })

      // 2. Altera status das consultas — bypass do ledger pré-pago intencional
      try {
        await batchFaturarConsultations(ids, faturadoStatus.id)
      } catch (statusErr) {
        console.error('[handleFaturar] status update failed', statusErr)
        toast.show(`Histórico salvo, mas erro ao atualizar status: ${statusErr?.message || ''}. Verifique as consultas manualmente.`, 'error')
        setFaturandoLoading(false)
        return
      }

      // 3. Gera e baixa o PDF definitivo
      const finalArgs = await buildPDFArgs(pendingConsultations, {
        nfNumber: nfNumber || null,
        nfDate: nfDate || null,
      })
      await generateConsultasPacientePDF(finalArgs)

      toast.show('Demonstrativo gerado e consultas faturadas com sucesso.', 'success')
      setShowNfModal(false)
      setPendingConsultations([])
      setPreviewTotalAmount(0)
      setHistoryRefreshKey(k => k + 1)
    } catch (err) {
      console.error('[handleFaturar]', err)
      toast.show(`Erro ao salvar demonstrativo: ${err?.message || 'Tente novamente.'}`, 'error')
    } finally {
      setFaturandoLoading(false)
    }
  }

  return (
    <>
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Card de acesso rápido — Relatório de Convênio (apenas equipe) */}
      {(isAdmin || user?.belongsToTeam) && <div
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
      </div>}

      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios em PDF</h1>
          <p className="text-sm text-gray-500 mt-1">Gere relatórios de atendimentos por paciente ou terapeuta.</p>
        </div>
        <HelpButton title="Como gerar Relatórios">
          <p><strong>Tipo de relatório:</strong> escolha entre <em>Demonstrativo de Pagamento</em> (mostra o valor cobrado do paciente por atendimento) ou <em>Consultas por Terapeuta</em> (mostra o valor do repasse ao terapeuta).</p>
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
                onClick={() => { setReportType('patient'); setSelectedPatientId(''); setPatientSearch(''); setPreviewBlobData(null); setPendingConsultations([]) }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  reportType === 'patient'
                    ? 'border-brand-blue bg-blue-50 text-brand-blue'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <FiUser size={18} />
                Demonstrativo de Pagamento
              </button>
            )}
            <button
              type="button"
              onClick={() => { setReportType('therapist'); setSelectedTherapistId(isAdmin ? '' : (user?.id || '')); setTherapistSearch(''); setPreviewBlobData(null); setPendingConsultations([]) }}
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

        {/* Aviso de especialidades não configuradas */}
        {unconfiguredWarning && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-4 text-sm text-amber-900">
            <p className="font-semibold mb-2">Especialidades sem configuração financeira encontradas:</p>
            {unconfiguredWarning.items.map(item => (
              <div key={item.name} className="mb-1.5">
                <span className="font-medium">{item.name}:</span>
                <ul className="ml-3 mt-0.5 space-y-0.5">
                  {item.specialties.map(s => (
                    <li key={s} className="text-amber-800">• {s}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="mt-2 text-amber-700 text-xs">
              Sem essa configuração, os valores serão exibidos como "Não configurado" e não serão considerados no total.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setUnconfiguredWarning(null)}
                className="flex-1 py-2 rounded-xl border border-amber-400 text-amber-900 font-medium text-sm hover:bg-amber-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const consults = unconfiguredWarning.pendingConsults
                  setUnconfiguredWarning(null)
                  if (reportType === 'patient' && isAdmin) {
                    openPreview(consults)
                  } else {
                    generateTherapistPDF(consults)
                  }
                }}
                disabled={loading}
                className="flex-1 py-2 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Gerando...' : 'Continuar mesmo assim'}
              </button>
            </div>
          </div>
        )}

        {/* Botão gerar */}
        {!unconfiguredWarning && !previewBlobData && !showNfModal && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm"
          >
            <FiFileText size={18} />
            {loading ? 'Gerando PDF...' : 'Gerar PDF'}
          </button>
        )}

        {/* Modal inline — dados da NF (exibido após fechar o preview) */}
        {showNfModal && (
          <div className="border border-green-200 bg-green-50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900 text-sm">Informações da Nota Fiscal</span>
              <button type="button" onClick={() => setShowNfModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Preencha os dados da NF (opcional). Ao confirmar, as consultas serão marcadas como Faturado e o histórico será salvo.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número da NF</label>
                <input
                  type="text"
                  value={nfNumber}
                  onChange={e => setNfNumber(e.target.value)}
                  placeholder="Ex: 001234 (opcional)"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data de emissão</label>
                <input
                  type="date"
                  value={nfDate}
                  onChange={e => setNfDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNfModal(false)}
                disabled={faturandoLoading}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFaturar}
                disabled={faturandoLoading}
                className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white font-semibold text-sm hover:bg-brand-blue-dark transition-colors disabled:opacity-60"
              >
                {faturandoLoading ? 'Processando...' : 'Confirmar e Gerar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Histórico de demonstrativos faturados */}
    {reportType === 'patient' && isAdmin && selectedPatientId && (
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <HistoricoSection
          patientId={selectedPatientId}
          refreshKey={historyRefreshKey}
          getPaymentDemonstrativos={getPaymentDemonstrativos}
        />
      </div>
    )}

    {/* Preview modal do Demonstrativo de Pagamento */}
    {previewBlobData && (
      <DemonstrativoPreviewModal
        previewData={previewBlobData}
        patient={selectedPatient}
        onClose={() => setPreviewBlobData(null)}
        onDraft={handleDraft}
        onFaturar={() => {
          setPreviewTotalAmount(previewBlobData.totalAmount || 0)
          setPreviewBlobData(null)
          setShowNfModal(true)
        }}
        draftLoading={draftLoading}
      />
    )}
    </>
  )
}