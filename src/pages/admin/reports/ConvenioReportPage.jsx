import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { FiArrowLeft, FiPlus, FiTrash2, FiFileText, FiDownload, FiEye, FiClock, FiRotateCcw, FiX, FiZap } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import Button from '../../../components/ui/Button'
import HelpButton from '../../../components/ui/HelpButton'
import Modal from '../../../components/ui/Modal'
import { generateRelatórioConvenioPDF, generateListaPresencaPDF, formatMesLabel } from '../../../utils/generateConvenioPDF'
import { generateId } from '../../../utils/storageUtils'
import { supabase } from '../../../lib/supabase'

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
function HistorySection({ patientId, onRestore, refreshKey }) {
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
      {records.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
          <div>
            <div className="text-sm font-medium text-gray-800">{r.version_label}</div>
            <div className="text-xs text-gray-400">{r.mes_label} · {r.specialty}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onRestore(r.form_data)}
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
      ))}
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

  // Guard: terapeutas fora da equipe não acessam
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

  // ── Sessões ──────────────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [sessionValue, setSessionValue] = useState('')
  const [horario, setHorario] = useState('')

  // ── Histórico refresh ─────────────────────────────────────────
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // ── Texto ────────────────────────────────────────────────────
  const [responsavel, setResponsavel] = useState('')
  const [diagnosticoText, setDiagnosticoText] = useState('')
  const [encaminhamento, setEncaminhamento] = useState('')
  const [objetivos, setObjetivos] = useState('')
  const [desempenho, setDesempenho] = useState('')

  // ── Preview / versão ─────────────────────────────────────────
  const [versionLabel, setVersionLabel] = useState('')
  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')
  const [loadingPDF, setLoadingPDF] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError] = useState('')
  const [error, setError] = useState('')

  // ── Dados derivados ──────────────────────────────────────────
  const activeTherapists = useMemo(() => therapists.filter(t => t.active !== false), [therapists])
  const selectedTherapist = useMemo(() => therapists.find(t => t.id === therapistId), [therapists, therapistId])

  const accessiblePatients = useMemo(() => {
    const base = patients.filter(p => !p.deleted)
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
  function handleSearch() {
    setError('')
    if (!patientId) { setError('Selecione o paciente.'); return }
    if (!specialty) { setError('Selecione a especialidade.'); return }
    if (periodType === 'range' && (!periodFrom || !periodTo)) { setError('Informe o período completo.'); return }

    const { from, to } = getDateRange()
    const found = consultations
      .filter(c => c.patientId === patientId && c.specialty === specialty && c.date >= from && c.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date))

    const patient = patients.find(p => p.id === patientId)
    const specEntry = (patient?.specialties || []).find(s => s.key === specialty)
    const defValue = specEntry?.therapistValue ? parseFloat(specEntry.therapistValue) : 0

    setSessions(found.map(c => ({ id: c.id, date: c.date, value: defValue, time: c.time ? c.time.slice(0, 5) : '' })))
    setSessionValue(String(defValue || ''))
    // Set default horario from first session (for apply-all convenience)
    if (found.length > 0 && found[0].time) setHorario(found[0].time.slice(0, 5))

    const mainDiag = patient?.diagnosis || ''
    const comorbNames = (patient?.conditionIds || [])
      .map(id => diagnoses.find(d => d.id === id)?.name).filter(Boolean)
    setDiagnosticoText([mainDiag, ...comorbNames].filter(Boolean).join('; '))

    const patGuardians = guardians.filter(g => (g.patientIds || []).includes(patientId) && g.active !== false)
    setResponsavel(patGuardians[0]?.fullName || '')
    setVersionLabel('')  // reset version on new search
    setSearched(true)
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
  function handleRestore(formData) {
    if (!formData) return
    if (formData.sessions) setSessions(formData.sessions)
    if (formData.sessionValue != null) setSessionValue(String(formData.sessionValue))
    if (formData.horario) setHorario(formData.horario)
    if (formData.responsavel != null) setResponsavel(formData.responsavel)
    if (formData.diagnosticoText != null) setDiagnosticoText(formData.diagnosticoText)
    if (formData.encaminhamento != null) setEncaminhamento(formData.encaminhamento)
    if (formData.objetivos != null) setObjetivos(formData.objetivos)
    if (formData.desempenho != null) setDesempenho(formData.desempenho)
    setSearched(true)
  }

  // ── Sugestão com IA ──────────────────────────────────────────
  async function handleSuggestAI() {
    setAiError('')
    const specialtyLabel = specialtiesData.find(s => s.key === specialty)?.label || specialty
    const hasContent = encaminhamento || objetivos || desempenho
    if (hasContent && !confirm('Os campos de texto já têm conteúdo. Deseja sobrescrever com as sugestões da IA?')) return

    // Coleta conteúdo real dos atendimentos selecionados
    const sessionIds = new Set(validSessions.map(s => s.id))
    const sessionDetails = consultations
      .filter(c => sessionIds.has(c.id) && (c.mainObjective || c.evolutionNotes || c.nextObjectives))
      .map((c, i) => {
        const parts = []
        if (c.mainObjective) parts.push(`Objetivo: ${c.mainObjective}`)
        if (c.evolutionNotes) parts.push(`Evolução: ${c.evolutionNotes}`)
        if (c.nextObjectives) parts.push(`Próximo objetivo: ${c.nextObjectives}`)
        return `Sessão ${i + 1} (${c.date}):\n${parts.join('\n')}`
      })
      .join('\n\n')

    // Conteúdo é considerado substancial se tiver ao menos 100 caracteres no total
    const sessionDetailsSubstantial = sessionDetails.length >= 100 ? sessionDetails : null

    setLoadingAI(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('suggest-convenio', {
        body: {
          especialidade: specialtyLabel,
          diagnostico: diagnosticoText,
          numSessoes: validSessions.length,
          terapeutaNome: selectedTherapist?.name || '',
          sessionDetails: sessionDetailsSubstantial,
        },
      })
      if (fnError) throw new Error(fnError.message)
      if (data?.error) throw new Error(data.error)
      if (data?.encaminhamento) setEncaminhamento(data.encaminhamento)
      if (data?.objetivos) setObjetivos(data.objetivos)
      if (data?.desempenho) setDesempenho(data.desempenho)
      if (!data?.baseadoEmAtendimentos) {
        setAiError('Atenção: os atendimentos deste período não têm relatos registrados. O texto gerado é genérico — revise antes de usar.')
      }
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
    const credential = selectedTherapist?.specialties?.find(s => s.specialty === specialty)?.credential || ''
    return { patient, specialtyLabel, credential, mesLabel: getMesLabel(), ver }
  }

  function getOrMakeVersion() {
    if (versionLabel) return versionLabel
    const v = makeVersionLabel()
    setVersionLabel(v)
    return v
  }

  // ── Salvar no histórico ───────────────────────────────────────
  async function saveHistory(ver) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { error } = await supabase.from('convenio_reports').insert({
      patient_id: patientId,
      therapist_id: therapistId || null,
      specialty,
      mes_label: getMesLabel(),
      version_label: ver,
      form_data: { sessions, sessionValue, horario, responsavel, diagnosticoText, encaminhamento, objetivos, desempenho },
      created_by: authUser?.id,
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
    const ver = versionLabel || getOrMakeVersion()
    const saved = await saveHistory(ver)
    if (saved) setHistoryRefreshKey(k => k + 1)
  }

  // ── Preview Relatório ─────────────────────────────────────────
  async function handlePreviewRelatorio() {
    const { patient, specialtyLabel, credential, mesLabel, ver } = buildParams(getOrMakeVersion())
    if (!patient || !selectedTherapist) return
    setLoadingPDF('relatorio')
    try {
      const blob = await generateRelatórioConvenioPDF({
        patientName: patient.fullName, diagnosticoText, specialtyLabel,
        terapeutaNome: selectedTherapist.name, terapeutaRegistro: credential,
        mesLabel, sessions: sessions.filter(s => s.date),
        sessionValue: parseFloat(sessionValue) || 0, horario,
        encaminhamento, objetivos, desempenho,
        versionLabel: ver, returnBlob: true, companySettings,
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
    const { patient, specialtyLabel, credential, mesLabel, ver } = buildParams(getOrMakeVersion())
    if (!patient || !selectedTherapist) return
    setLoadingPDF('lista')
    try {
      const blob = await generateListaPresencaPDF({
        patientName: patient.fullName, terapeutaNome: selectedTherapist.name,
        terapeutaRegistro: credential, specialtyLabel, mesLabel,
        sessions: sessions.filter(s => s.date),
        responsavel, versionLabel: ver, returnBlob: true, companySettings,
      })
      const safe = patient.fullName.replace(/[^\w]/g, '_')
      const safeSpec = specialtyLabel.replace(/[^\w]/g, '_')
      setPreviewBlob(blob)
      setPreviewTitle('Lista de Presença')
      setPreviewFilename(`lista_presenca_${safe}_${safeSpec}_${mesLabel.replace('/', '_')}.pdf`)
    } finally { setLoadingPDF('') }
  }

  const validSessions = sessions.filter(s => s.date)
  const totalValue = sessions.reduce((sum, s) => sum + (parseFloat(s.value) || 0), 0)
  const canGenerate = searched && patientId && specialty && selectedTherapist && validSessions.length > 0
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
          <p><strong>1. Seleção:</strong> escolha o paciente, a especialidade e o período (mês ou De/Até) e clique em <em>Buscar Atendimentos</em>. O sistema carregará automaticamente as sessões registradas no período.</p>
          <p><strong>2. Sessões:</strong> revise as sessões encontradas. Você pode adicionar, remover ou alterar datas e valores individualmente. Use <em>"aplicar a todas"</em> para padronizar o valor. Preencha o campo <em>Horário</em> (ex: 19h às 20h).</p>
          <p><strong>3. Texto do Relatório:</strong> preencha o campo <em>Diagnóstico</em> incluindo os códigos CID (o sistema pré-preenche com o diagnóstico do cadastro). Escreva o Encaminhamento, os Objetivos (um por linha — cada linha vira um bullet) e o Desempenho e Conclusão.</p>
          <p><strong>4. Pré-visualizar:</strong> clique em <em>Pré-visualizar</em> para ver o documento antes de baixar. Na pré-visualização, clique em <em>Baixar e Registrar</em> para baixar o PDF e gravar no histórico.</p>
          <p><strong>Histórico:</strong> os relatórios gerados ficam registrados abaixo. Clique em <em>Restaurar</em> para recuperar os dados de um relatório anterior e gerar uma nova versão.</p>
        </HelpButton>
      </div>

      {/* Seleção */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">1. Seleção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isAdmin && (
            <div>
              <label className={labelClass}>Terapeuta</label>
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
            <div className="border border-gray-100 rounded-xl overflow-hidden">
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">3. Texto do Relatório</h2>
            <button
              onClick={handleSuggestAI}
              disabled={loadingAI || !specialty || !selectedTherapist}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
            >
              <FiZap size={13} />
              {loadingAI ? 'Gerando...' : 'Sugerir com IA'}
            </button>
          </div>
          {aiError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>
          )}
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
          <div>
            <label className={labelClass}>Encaminhamento</label>
            <textarea value={encaminhamento} onChange={e => setEncaminhamento(e.target.value)} rows={5}
              placeholder="Descreva o histórico e motivo do encaminhamento..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-y" />
          </div>
          <div>
            <label className={labelClass}>Objetivos de Intervenção <span className="text-gray-400 font-normal">(uma linha = um bullet)</span></label>
            <textarea value={objetivos} onChange={e => setObjetivos(e.target.value)} rows={5}
              placeholder={"Melhorar a modulação vestibular;\nAprimorar viso-dispraxia;"}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-y" />
          </div>
          <div>
            <label className={labelClass}>Desempenho e Conclusão</label>
            <textarea value={desempenho} onChange={e => setDesempenho(e.target.value)} rows={6}
              placeholder="Descreva o desempenho do paciente e as recomendações..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none resize-y" />
          </div>
        </div>
      )}

      {/* Gerar */}
      {searched && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">4. Pré-visualizar e Gerar</h2>
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
              {!patientId || !specialty ? 'Selecione paciente e especialidade.' : 'Adicione pelo menos uma sessão com data.'}
            </p>
          )}
        </div>
      )}

      {/* Histórico */}
      <HistorySection patientId={patientId} onRestore={handleRestore} refreshKey={historyRefreshKey} />

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