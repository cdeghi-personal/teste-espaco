import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiTrash2, FiFileText, FiDownload, FiEye, FiClock, FiRotateCcw, FiX, FiZap, FiAlertCircle } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import Button from '../../../components/ui/Button'
import HelpButton from '../../../components/ui/HelpButton'
import Modal from '../../../components/ui/Modal'
import { generateRelatórioConvenioPDF, generateListaPresencaPDF, formatMesLabel } from '../../../utils/generateConvenioPDF'
import { generateId } from '../../../utils/storageUtils'
import { supabase } from '../../../lib/supabase'
import { hexTextColor } from '../../../utils/colorUtils'

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)

function makeVersionLabel() {
  const now = new Date()
  const d = now.toLocaleDateString('pt-BR')
  const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `v. ${d} ${t}`
}

function fmtCurrency(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

// ─── Preview Modal ────────────────────────────────────────────────
function PreviewModal({ blob, title, filename, onClose, onDownload }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  return (
    <Modal title={`Pré-visualização — ${title}`} onClose={onClose} size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={() => { onDownload(blob, filename); onClose() }}>
            <FiDownload size={14} /> Baixar e Registrar
          </Button>
        </>
      }
    >
      {url
        ? <iframe src={url} className="w-full border-0 rounded-xl" style={{ height: '70vh' }} title={title} />
        : <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Carregando pré-visualização...</div>
      }
    </Modal>
  )
}

// ─── Histórico ────────────────────────────────────────────────────
function HistorySection({ patientId, onRestore, refreshKey, specialtiesData, therapists }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    const { data } = await supabase
      .from('convenio_reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(20)
    setRecords(data || [])
    setLoading(false)
  }, [patientId])

  useEffect(() => { load() }, [load, refreshKey])

  async function handleDelete(id) {
    if (!confirm('Excluir este registro do histórico?')) return
    await supabase.from('convenio_reports').delete().eq('id', id)
    setRecords(r => r.filter(x => x.id !== id))
  }

  if (!patientId) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Histórico de Relatórios</h2>
      {loading && <p className="text-xs text-gray-400">Carregando...</p>}
      {!loading && records.length === 0 && (
        <p className="text-xs text-gray-400">Nenhum relatório registrado para este paciente.</p>
      )}
      {records.map(r => {
        const specData = specialtiesData?.find(s => s.key === r.specialty)
        const createdByName = r.form_data?.createdByName ||
          therapists?.find(t => t.userId === r.created_by)?.name
        return (
          <div key={r.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="space-y-1 min-w-0">
              <div className="text-sm font-medium text-gray-800">{r.version_label}</div>
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-xs text-gray-400">{r.mes_label}</span>
                {specData && (
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                    style={{ backgroundColor: specData.color || '#6b7280', color: hexTextColor(specData.color || '#6b7280') }}
                  >
                    {specData.label}
                  </span>
                )}
              </div>
              {createdByName && (
                <div className="text-[11px] text-gray-400">Criado por: {createdByName}</div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <button
                onClick={() => onRestore(r)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-brand-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                title="Restaurar formulário"
              >
                <FiRotateCcw size={12} /> Restaurar
              </button>
              <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                <FiX size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────
export default function ConvenioReportPage() {
  const { patients, therapists, consultations, guardians, specialtiesData, diagnoses, companySettings } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const canAccess = isAdmin || user?.belongsToTeam

  if (!canAccess) return <Navigate to={ROUTES.REPORTS} replace />

  // ── Seleção ──────────────────────────────────────────────────
  const [therapistId, setTherapistId] = useState(isAdmin ? '' : (user?.id || ''))
  const [patientId, setPatientId] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [periodType, setPeriodType] = useState('month')
  const [periodMonth, setPeriodMonth] = useState(CURRENT_MONTH)
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [searched, setSearched] = useState(false)

  // ── RT ────────────────────────────────────────────────────────
  const [rtId, setRtId] = useState('')

  // ── Sessões ──────────────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [sessionValue, setSessionValue] = useState('')
  const [horario, setHorario] = useState('')

  // ── Histórico refresh ─────────────────────────────────────────
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // ── Texto ────────────────────────────────────────────────────
  const [responsavel, setResponsavel] = useState('')
  const [diagnosticoText, setDiagnosticoText] = useState('')
  const [referralChallenges, setReferralChallenges] = useState('')
  const [objetivos, setObjetivos] = useState('')

  // ── Preview / versão ─────────────────────────────────────────
  const [versionLabel, setVersionLabel] = useState('')
  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')
  const [loadingPDF, setLoadingPDF] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiWarning, setAiWarning] = useState('')
  const [error, setError] = useState('')

  // ── Dados derivados ──────────────────────────────────────────
  const activeTherapists = useMemo(() => therapists.filter(t => t.active !== false), [therapists])
  const selectedTherapist = useMemo(() => therapists.find(t => t.id === therapistId), [therapists, therapistId])

  const accessiblePatients = useMemo(() => {
    const base = patients.filter(p => !p.deleted && p.needsConvenioReport === true)
    if (isAdmin) return base
    return base.filter(p =>
      p.therapistId === therapistId ||
      (p.involvedTherapistIds || []).includes(therapistId)
    )
  }, [patients, isAdmin, therapistId])

  const patientSpecialties = useMemo(() => {
    const p = patients.find(x => x.id === patientId)
    if (!p) return []
    const keys = (p.specialties || []).map(s => s.key)
    return specialtiesData.filter(s => keys.includes(s.key) && s.active !== false)
  }, [patients, patientId, specialtiesData])

  // ── Lógica de RT ─────────────────────────────────────────────
  const emitterCanBeRt = useMemo(() => {
    if (!selectedTherapist || !specialty) return false
    const specEntry = (selectedTherapist.therapistSpecialties || []).find(s => s.specialty === specialty)
    return specEntry?.canBeRt === true
  }, [selectedTherapist, specialty])

  const eligibleRTs = useMemo(() => {
    if (!specialty) return []
    return activeTherapists.filter(t =>
      (t.therapistSpecialties || []).some(s => s.specialty === specialty && s.canBeRt === true)
    )
  }, [activeTherapists, specialty])

  // RT efetivo para o PDF: emissor (se pode ser RT) ou o RT selecionado
  const selectedRT = useMemo(() => {
    if (emitterCanBeRt) return selectedTherapist
    return therapists.find(t => t.id === rtId) || null
  }, [emitterCanBeRt, selectedTherapist, rtId, therapists])

  // Reset rtId quando a especialidade muda
  useEffect(() => { setRtId('') }, [specialty])

  function getDateRange() {
    if (periodType === 'month') {
      const [y, m] = periodMonth.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      return { from: `${periodMonth}-01`, to: `${periodMonth}-${String(lastDay).padStart(2, '0')}` }
    }
    return { from: periodFrom, to: periodTo }
  }

  function getMesLabel() {
    if (periodType === 'month') return formatMesLabel(periodMonth)
    return `${fmtDate(periodFrom)} a ${fmtDate(periodTo)}`
  }

  // ── Buscar atendimentos ───────────────────────────────────────
  async function handleSearch() {
    setError('')
    if (isAdmin && !therapistId) { setError('Selecione o terapeuta emissor.'); return }
    if (!patientId) { setError('Selecione o paciente.'); return }
    if (!specialty) { setError('Selecione a especialidade.'); return }
    if (periodType === 'range' && (!periodFrom || !periodTo)) { setError('Informe o período completo.'); return }

    const { from, to } = getDateRange()
    const found = consultations
      .filter(c => c.patientId === patientId && c.therapistId === therapistId && c.specialty === specialty && c.date >= from && c.date <= to && c.eventType !== 'INTERVIEW')
      .sort((a, b) => a.date.localeCompare(b.date))

    const patient = patients.find(p => p.id === patientId)
    const specEntry = (patient?.specialties || []).find(s => s.key === specialty)
    const defValue = specEntry?.therapistValue ? parseFloat(specEntry.therapistValue) : 0

    setSessions(found.map(c => ({ id: c.id, date: c.date, value: defValue, time: c.time ? c.time.slice(0, 5) : '' })))
    setSessionValue(String(defValue || ''))
    if (found.length > 0 && found[0].time) setHorario(found[0].time.slice(0, 5))

    const mainDiag = patient?.diagnosis || ''
    const comorbNames = (patient?.conditionIds || [])
      .map(id => diagnoses.find(d => d.id === id)?.name).filter(Boolean)
    setDiagnosticoText([mainDiag, ...comorbNames].filter(Boolean).join('; '))

    const patGuardians = guardians.filter(g => (g.patientIds || []).includes(patientId) && g.active !== false)
    setResponsavel(patGuardians[0]?.fullName || '')
    setVersionLabel('')

    // Carrega desafios persistidos para este paciente + especialidade
    const { data: rsData } = await supabase
      .from('patient_specialty_report_settings')
      .select('referral_challenges')
      .eq('patient_id', patientId)
      .eq('specialty', specialty)
      .maybeSingle()
    setReferralChallenges(rsData?.referral_challenges || '')

    // Pré-carrega objetivos do último relatório gerado para este paciente + especialidade
    const { data: lastReport } = await supabase
      .from('convenio_reports')
      .select('intervention_goals')
      .eq('patient_id', patientId)
      .eq('specialty', specialty)
      .not('intervention_goals', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setObjetivos(lastReport?.intervention_goals || '')

    setSearched(true)
    logConvenioAudit('CONSULTA')
  }

  // ── Sessões ───────────────────────────────────────────────────
  function addSession() {
    setSessions(s => [...s, { id: generateId(), date: '', value: parseFloat(sessionValue) || 0, time: horario }])
  }
  function updateSession(id, field, val) {
    setSessions(s => s.map(r => r.id === id ? { ...r, [field]: val } : r))
  }
  function removeSession(id) { setSessions(s => s.filter(r => r.id !== id)) }
  function applyValueToAll(val) {
    setSessionValue(val)
    setSessions(s => s.map(r => ({ ...r, value: parseFloat(val) || 0 })))
  }
  function applyTimeToAll(val) {
    setHorario(val)
    setSessions(s => s.map(r => ({ ...r, time: val })))
  }

  // ── Restaurar do histórico ────────────────────────────────────
  function handleRestore(record) {
    if (!record) return
    const fd = record.form_data || {}
    if (record.therapist_id) setTherapistId(record.therapist_id)
    if (record.patient_id) setPatientId(record.patient_id)
    if (record.specialty) setSpecialty(record.specialty)
    if (fd.periodType) setPeriodType(fd.periodType)
    if (fd.periodMonth) setPeriodMonth(fd.periodMonth)
    if (fd.periodFrom) setPeriodFrom(fd.periodFrom)
    if (fd.periodTo) setPeriodTo(fd.periodTo)
    if (fd.sessions) setSessions(fd.sessions)
    if (fd.sessionValue != null) setSessionValue(String(fd.sessionValue))
    if (fd.horario) setHorario(fd.horario)
    if (fd.responsavel != null) setResponsavel(fd.responsavel)
    if (fd.diagnosticoText != null) setDiagnosticoText(fd.diagnosticoText)
    // referralChallenges: novo campo (também aceita legado "encaminhamento")
    if (fd.referralChallenges != null) setReferralChallenges(fd.referralChallenges)
    else if (fd.encaminhamento != null) setReferralChallenges(fd.encaminhamento)
    if (fd.objetivos != null) setObjetivos(fd.objetivos)
    if (record.responsible_therapist_id) setRtId(record.responsible_therapist_id)
    else if (fd.rtId) setRtId(fd.rtId)
    setSearched(true)
  }

  // ── Sugestão com IA ──────────────────────────────────────────
  async function handleSuggestAI() {
    setAiError('')
    setAiWarning('')
    const specialtyLabel = specialtiesData.find(s => s.key === specialty)?.label || specialty
    if (objetivos && !confirm('O campo Objetivos já tem conteúdo. Deseja sobrescrever com as sugestões da IA?')) return

    const GENERIC_TERMS = ['n/a', 'na', 'continuidade', 'continuidade no tratamento',
      'continuidade do tratamento', 'sem alterações', 'sem alteracao', 'idem', '-', '—']

    function isSubstantial(text) {
      if (!text) return false
      const normalized = text.trim().toLowerCase()
      if (GENERIC_TERMS.includes(normalized)) return false
      return normalized.length >= 15
    }

    const sessionIds = new Set(validSessions.map(s => s.id))
    const sessionDetails = consultations
      .filter(c => sessionIds.has(c.id) &&
        (isSubstantial(c.mainObjective) || isSubstantial(c.evolutionNotes) || isSubstantial(c.nextObjectives)))
      .map((c, i) => {
        const parts = []
        if (isSubstantial(c.mainObjective)) parts.push(`Objetivo: ${c.mainObjective}`)
        if (isSubstantial(c.evolutionNotes)) parts.push(`Evolução: ${c.evolutionNotes}`)
        if (isSubstantial(c.nextObjectives)) parts.push(`Próximo objetivo: ${c.nextObjectives}`)
        return `Sessão ${i + 1} (${c.date}):\n${parts.join('\n')}`
      })
      .join('\n\n')

    const sessionsWithContent = consultations.filter(c => sessionIds.has(c.id) &&
      (isSubstantial(c.mainObjective) || isSubstantial(c.evolutionNotes) || isSubstantial(c.nextObjectives)))
    const hasRichContent = sessionsWithContent.length >= 2 ||
      sessionsWithContent.some(c => (c.evolutionNotes || '').length > 80)

    if (!hasRichContent) {
      setAiWarning('Os atendimentos deste período não têm relatos detalhados suficientes. Preencha o Objetivo da Sessão, Relato de Evolução e Objetivo da Próxima Sessão nos atendimentos para que a IA possa gerar sugestões úteis.')
      return
    }

    setLoadingAI(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-convenio', {
        body: {
          especialidade: specialtyLabel,
          diagnostico: diagnosticoText,
          numSessoes: validSessions.length,
          terapeutaNome: selectedTherapist?.name || '',
          sessionDetails,
          aiSystemPrompt: companySettings.aiSystemPrompt || '',
        },
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (data?.objetivos) setObjetivos(data.objetivos)
    } catch (err) {
      setAiError(err.message || 'Erro ao gerar sugestões.')
    } finally {
      setLoadingAI(false)
    }
  }

  // ── Parâmetros comuns ─────────────────────────────────────────
  function buildParams(ver) {
    const patient = patients.find(p => p.id === patientId)
    const specialtyLabel = specialtiesData.find(s => s.key === specialty)?.label || specialty
    const rtTherapist = selectedRT || selectedTherapist
    const credential = (rtTherapist?.therapistSpecialties || []).find(s => s.specialty === specialty)?.credential || ''
    return { patient, specialtyLabel, credential, mesLabel: getMesLabel(), ver, rtTherapist }
  }

  function getOrMakeVersion() {
    if (versionLabel) return versionLabel
    const v = makeVersionLabel()
    setVersionLabel(v)
    return v
  }

  // ── Salvar desafios persistentes ──────────────────────────────
  async function saveReferralChallenges() {
    if (!patientId || !specialty) return
    await supabase
      .from('patient_specialty_report_settings')
      .upsert(
        { patient_id: patientId, specialty, referral_challenges: referralChallenges || null, updated_at: new Date().toISOString() },
        { onConflict: 'patient_id,specialty' }
      )
  }

  // ── Salvar no histórico ───────────────────────────────────────
  async function logConvenioAudit(action, extraLabel) {
    const patient = patients.find(p => p.id === patientId)
    const specialtyLabel = specialtiesData.find(s => s.key === specialty)?.label || specialty
    const parts = [patient?.fullName, selectedTherapist?.name, specialtyLabel, getMesLabel()]
    if (extraLabel) parts.push(extraLabel)
    await supabase.from('audit_logs').insert({
      user_id: user.authId,
      user_email: user.email,
      user_name: user.name || '',
      action,
      resource_type: 'convenio_report',
      resource_id: patientId || null,
      resource_name: parts.filter(Boolean).join(' | '),
    })
  }

  async function saveHistory(ver) {
    const rtTherapist = selectedRT
    const { error } = await supabase.from('convenio_reports').insert({
      patient_id: patientId,
      therapist_id: therapistId || null,
      responsible_therapist_id: selectedRT?.id || null,
      specialty,
      mes_label: getMesLabel(),
      version_label: ver,
      intervention_goals: objetivos || null,
      form_data: {
        sessions, sessionValue, horario, responsavel, diagnosticoText,
        referralChallenges, objetivos,
        periodType, periodMonth, periodFrom, periodTo,
        rtId: !emitterCanBeRt ? rtId : null,
        createdByName: user.name,
      },
      created_by: user.authId,
    })
    if (error) console.error('Erro ao salvar histórico de convênio:', error)
    return !error
  }

  // ── Download blob ─────────────────────────────────────────────
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadAndLog(blob, filename) {
    downloadBlob(blob, filename)
    await saveReferralChallenges()
    const ver = versionLabel || getOrMakeVersion()
    const saved = await saveHistory(ver)
    if (saved) {
      setHistoryRefreshKey(k => k + 1)
      logConvenioAudit('GERAR', ver)
    }
  }

  // ── Preview Relatório ─────────────────────────────────────────
  async function handlePreviewRelatorio() {
    const { patient, specialtyLabel, credential, mesLabel, ver, rtTherapist } = buildParams(getOrMakeVersion())
    if (!patient || !rtTherapist) return
    setLoadingPDF('relatorio')
    logConvenioAudit('SOLICITAR', 'Rel. Convênio')
    try {
      const blob = await generateRelatórioConvenioPDF({
        patientName: patient.fullName,
        patientFirstName: patient.fullName.split(' ')[0],
        diagnosticoText,
        specialtyLabel,
        terapeutaNome: rtTherapist.name,
        terapeutaRegistro: credential,
        mesLabel,
        sessions: sessions.filter(s => s.date),
        sessionValue: parseFloat(sessionValue) || 0,
        horario,
        referralChallenges,
        objetivos,
        versionLabel: ver,
        returnBlob: true,
        companySettings,
      })
      const safe = patient.fullName.replace(/[^\w]/g, '_')
      const safeSpec = specialtyLabel.replace(/[^\w]/g, '_')
      setPreviewBlob(blob)
      setPreviewTitle('Relatório ao Convênio')
      setPreviewFilename(`relatorio_convenio_${safe}_${safeSpec}_${mesLabel.replace('/', '_')}.pdf`)
    } finally { setLoadingPDF('') }
  }

  // ── Preview Lista ─────────────────────────────────────────────
  async function handlePreviewLista() {
    const { patient, specialtyLabel, credential, mesLabel, ver, rtTherapist } = buildParams(getOrMakeVersion())
    if (!patient || !rtTherapist) return
    setLoadingPDF('lista')
    logConvenioAudit('SOLICITAR', 'Lista de Presença')
    try {
      const blob = await generateListaPresencaPDF({
        patientName: patient.fullName,
        terapeutaNome: rtTherapist.name,
        terapeutaRegistro: credential,
        specialtyLabel,
        mesLabel,
        sessions: sessions.filter(s => s.date),
        responsavel,
        versionLabel: ver,
        returnBlob: true,
        companySettings,
      })
      const safe = patient.fullName.replace(/[^\w]/g, '_')
      const safeSpec = specialtyLabel.replace(/[^\w]/g, '_')
      setPreviewBlob(blob)
      setPreviewTitle('Lista de Presença')
      setPreviewFilename(`lista_presenca_${safe}_${safeSpec}_${mesLabel.replace('/', '_')}.pdf`)
    } finally { setLoadingPDF('') }
  }

  // ── Encaminhamento preview (gerado a partir do template) ──────
  const encaminhamentoPreview = useMemo(() => {
    const patient = patients.find(p => p.id === patientId)
    const firstName = patient?.fullName?.split(' ')[0] || '...'
    const specialtyLabel = specialtiesData.find(s => s.key === specialty)?.label || '...'
    const desafios = referralChallenges?.trim() || '___________'
    return `${firstName} foi encaminhado para atendimento ${specialtyLabel} devido a dificuldades observadas em seu desenvolvimento, incluindo ${desafios}. O objetivo do acompanhamento é realizar avaliação contínua, intervir de forma estruturada conforme as necessidades apresentadas e promover avanços funcionais que favoreçam seu desenvolvimento.`
  }, [patients, patientId, specialtiesData, specialty, referralChallenges])

  const validSessions = sessions.filter(s => s.date)
  const totalValue = sessions.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0)
  const rtIsValid = emitterCanBeRt || !!rtId
  const canGenerate = searched && patientId && specialty && selectedTherapist && validSessions.length > 0 && rtIsValid
  const selectClass = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none w-full'
  const labelClass = 'block text-xs text-gray-500 mb-1 font-medium'

  return (
    <div className="p-3 md:p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(ROUTES.REPORTS)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Relatório de Convênio</h1>
            <p className="text-xs text-gray-500 mt-0.5">Relatório ao Convênio e Lista de Presença em PDF</p>
          </div>
        </div>
        <HelpButton title="Como gerar o Relatório de Convênio">
          <p><strong>1. Seleção:</strong> escolha o terapeuta emissor, o paciente e a especialidade. Se o emissor não puder ser Responsável Técnico (RT) naquela especialidade, um campo adicional será exibido para selecionar o RT.</p>
          <p><strong>2. Sessões:</strong> revise as sessões encontradas. Você pode adicionar, remover ou alterar datas, horários e valores individualmente.</p>
          <p><strong>3. Texto:</strong> preencha o Diagnóstico (com CID), os Desafios Relacionados (usado no Encaminhamento) e os Objetivos de Intervenção. O Encaminhamento é gerado automaticamente a partir do template e os Desafios são salvos automaticamente por paciente/especialidade. O Desempenho e Conclusão é um texto padrão fixo.</p>
          <p><strong>4. Pré-visualizar:</strong> clique em <em>Pré-visualizar</em> para ver o documento. Na pré-visualização, clique em <em>Baixar e Registrar</em> para salvar o PDF e registrar no histórico.</p>
          <p><strong>Histórico:</strong> os relatórios ficam registrados abaixo. Clique em <em>Restaurar</em> para recuperar dados de um relatório anterior.</p>
        </HelpButton>
      </div>

      {/* Seleção */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">1. Seleção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isAdmin && (
            <div>
              <label className={labelClass}>Terapeuta emissor</label>
              <select value={therapistId} onChange={e => { setTherapistId(e.target.value); setPatientId(''); setSpecialty(''); setSearched(false) }} className={selectClass}>
                <option value="">Selecione</option>
                {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelClass}>Paciente</label>
            <select value={patientId} onChange={e => { setPatientId(e.target.value); setSpecialty(''); setSearched(false) }} className={selectClass}>
              <option value="">Selecione o paciente</option>
              {accessiblePatients.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(p => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Especialidade</label>
            <select value={specialty} onChange={e => { setSpecialty(e.target.value); setSearched(false) }} className={selectClass} disabled={!patientId}>
              <option value="">Selecione</option>
              {patientSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* RT — exibido quando emissor não pode ser RT para a especialidade selecionada */}
        {specialty && selectedTherapist && !emitterCanBeRt && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <FiAlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>{selectedTherapist.name}</strong> não está configurado como Responsável Técnico (RT) para <strong>{specialtiesData.find(s => s.key === specialty)?.label || specialty}</strong>. Selecione um RT abaixo para continuar.
              </p>
            </div>
            {eligibleRTs.length === 0 ? (
              <p className="text-xs text-red-600 font-medium pl-5">Nenhum terapeuta ativo cadastrado como RT para esta especialidade. Configure o campo RT no cadastro do terapeuta antes de gerar o relatório.</p>
            ) : (
              <div className="pl-5">
                <label className={labelClass}>Responsável Técnico (RT) *</label>
                <select value={rtId} onChange={e => setRtId(e.target.value)} className={selectClass}>
                  <option value="">Selecione o RT</option>
                  {eligibleRTs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Confirmação visual quando RT = emissor */}
        {specialty && selectedTherapist && emitterCanBeRt && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <strong>{selectedTherapist.name}</strong> é RT para esta especialidade e assinará o relatório.
          </p>
        )}

        <div className="space-y-2">
          <label className={labelClass}>Período</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="month" checked={periodType === 'month'} onChange={() => setPeriodType('month')} /> Mês
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="range" checked={periodType === 'range'} onChange={() => setPeriodType('range')} /> De/Até
            </label>
          </div>
          {periodType === 'month'
            ? <input type="month" value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none" />
            : <div className="flex items-center gap-2">
                <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none" />
                <span className="text-gray-400 text-sm">até</span>
                <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none" />
              </div>
          }
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <Button variant="primary" onClick={handleSearch}><FiFileText size={15} /> Buscar Atendimentos</Button>
      </div>

      {/* Sessões */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">2. Sessões ({validSessions.length})</h2>
            {validSessions.length > 0 && <span className="text-xs font-semibold text-brand-blue">Total: {fmtCurrency(totalValue)}</span>}
          </div>

          {sessions.length === 0 && <p className="text-sm text-gray-500">Nenhum atendimento encontrado no período. Adicione sessões manualmente.</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Horário padrão
                {sessions.length > 0 && <button onClick={() => applyTimeToAll(horario)} className="ml-2 text-brand-blue underline text-xs">aplicar a todas</button>}
              </label>
              <input type="text" value={horario} onChange={e => setHorario(e.target.value)} placeholder="Ex: 17h30 às 18h30"
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none w-full" />
            </div>
            <div>
              <label className={labelClass}>
                Valor por sessão (R$)
                {sessions.length > 0 && <button onClick={() => applyValueToAll(sessionValue)} className="ml-2 text-brand-blue underline text-xs">aplicar a todas</button>}
              </label>
              <input type="number" step="0.01" value={sessionValue} onChange={e => setSessionValue(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none w-full" />
            </div>
          </div>

          {sessions.length > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Data</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Horário</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Valor (R$)</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map(s => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">
                        <input type="date" value={s.date} onChange={e => updateSession(s.id, 'date', e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-brand-blue outline-none w-36" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={s.time || ''} onChange={e => updateSession(s.id, 'time', e.target.value)}
                          placeholder="Ex: 17h30" className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-brand-blue outline-none w-28" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" value={s.value} onChange={e => updateSession(s.id, 'value', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-brand-blue outline-none w-28" />
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeSession(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg"><FiTrash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={addSession} className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
            <FiPlus size={14} /> Adicionar sessão
          </button>
        </div>
      )}

      {/* Texto */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">3. Texto do Relatório</h2>
          {aiWarning && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{aiWarning}</p>
          )}
          {aiError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>
          )}

          {/* Responsável e diagnóstico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Responsável legal (Lista de Presença)</label>
              <input type="text" value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do responsável"
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none w-full" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Diagnóstico (com CID — editável)</label>
            <textarea value={diagnosticoText} onChange={e => setDiagnosticoText(e.target.value)} rows={2}
              placeholder="Ex: TDAH - CID-10: F90.0; TEA - CID-11: 6A02.0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-none" />
          </div>

          {/* Encaminhamento — desafios relacionados */}
          <div className="space-y-2">
            <div>
              <label className={labelClass}>
                Encaminhamento — Desafios relacionados
                <span className="ml-1 text-gray-400 font-normal">(salvo por paciente/especialidade)</span>
              </label>
              <textarea
                value={referralChallenges}
                onChange={e => setReferralChallenges(e.target.value)}
                rows={2}
                placeholder="Ex: déficit de atenção e impulsividade, dificuldades na regulação sensorial e comunicação"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-none"
              />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">Pré-visualização do Encaminhamento</p>
              <p className="text-xs text-gray-600 leading-relaxed">{encaminhamentoPreview}</p>
            </div>
          </div>

          {/* Objetivos de intervenção */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className={labelClass + ' mb-0'}>
                Objetivos de Intervenção
                <span className="text-gray-400 font-normal ml-1">(uma linha = um bullet — pré-carregado do último relatório)</span>
              </label>
              <button
                onClick={handleSuggestAI}
                disabled={loadingAI || !specialty || !selectedTherapist}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
              >
                <FiZap size={13} />
                {loadingAI ? 'Gerando...' : 'Sugerir com IA'}
              </button>
            </div>
            <textarea value={objetivos} onChange={e => setObjetivos(e.target.value)} rows={5}
              placeholder={"Melhorar a modulação vestibular;\nAprimorar viso-dispraxia;"}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-y" />
          </div>

          {/* Desempenho e Conclusão — texto fixo */}
          <div>
            <label className={labelClass}>
              Desempenho e Conclusão
              <span className="ml-1 text-gray-400 font-normal">(texto padrão fixo)</span>
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <p className="text-xs text-gray-500 leading-relaxed">
                O paciente apresentou desempenho compatível com seu plano terapêutico, demonstrando avanços graduais nos objetivos trabalhados e melhora na execução das atividades propostas, mantendo boa responsividade aos procedimentos de ensino. Observou-se engajamento adequado nas sessões, com disposição para participar e concluir as tarefas. Embora alguns objetivos ainda demandem manutenção para consolidação, o desempenho geral indica evolução estável e coerente com seu perfil de desenvolvimento. Recomenda-se a continuidade do acompanhamento, com manutenção dos objetivos em consolidação e inclusão progressiva de novas metas conforme sua prontidão, favorecendo seu desenvolvimento global e atendendo às suas necessidades.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gerar */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">4. Pré-visualizar e Gerar</h2>
          {selectedRT && (
            <p className="text-xs text-gray-500 mb-2">
              Terapeuta no PDF: <strong>{selectedRT.name}</strong>
              {!emitterCanBeRt && selectedTherapist && ` (emissor: ${selectedTherapist.name})`}
            </p>
          )}
          {versionLabel && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
              <FiClock size={12} /> Versão: <span className="font-medium text-gray-600">{versionLabel}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" onClick={handlePreviewRelatorio} disabled={!canGenerate || !!loadingPDF}>
              <FiEye size={15} /> {loadingPDF === 'relatorio' ? 'Gerando...' : 'Pré-visualizar Relatório'}
            </Button>
            <Button variant="secondary" onClick={handlePreviewLista} disabled={!canGenerate || !!loadingPDF}>
              <FiEye size={15} /> {loadingPDF === 'lista' ? 'Gerando...' : 'Pré-visualizar Lista de Presença'}
            </Button>
          </div>
          {!canGenerate && (
            <p className="text-xs text-gray-400 mt-2">
              {!patientId || !specialty
                ? 'Selecione paciente e especialidade.'
                : !rtIsValid
                ? 'Selecione o Responsável Técnico (RT) para a especialidade.'
                : 'Adicione pelo menos uma sessão com data.'}
            </p>
          )}
        </div>
      )}

      {/* Histórico */}
      <HistorySection patientId={patientId} onRestore={handleRestore} refreshKey={historyRefreshKey} specialtiesData={specialtiesData} therapists={therapists} />

      {/* Modal de preview */}
      {previewBlob && (
        <PreviewModal
          blob={previewBlob}
          title={previewTitle}
          filename={previewFilename}
          onClose={() => setPreviewBlob(null)}
          onDownload={handleDownloadAndLog}
        />
      )}
    </div>
  )
}
