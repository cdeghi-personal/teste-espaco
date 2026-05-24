import {
  FiUsers, FiCalendar, FiClipboard, FiTrendingUp,
  FiMessageSquare, FiArrowRight, FiBell, FiLifeBuoy,
  FiDollarSign, FiCheckCircle, FiAlertTriangle,
  FiArrowUp, FiArrowDown, FiMinus, FiActivity, FiEdit2,
} from 'react-icons/fi'
import { useState, useEffect, useMemo } from 'react'
import { format, subMonths, addDays, subDays } from 'date-fns'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import { formatDateShort } from '../../utils/dateUtils'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants/routes'
import ConsultationFormModal from './consultations/ConsultationFormModal'

// ── helpers ──────────────────────────────────────────────────────────────────

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function textColorForBg(hex) {
  if (!hex) return '#1f2937'
  const c = hex.replace('#', '')
  if (c.length < 6) return '#1f2937'
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? '#1f2937' : '#ffffff'
}

// ── sub-components ────────────────────────────────────────────────────────────

function Trend({ curr, prev, label = 'vs mês anterior' }) {
  if (prev == null) return null
  const diff = curr - prev
  if (prev === 0 && diff === 0) return null
  if (prev === 0) return (
    <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
      <FiArrowUp size={10} /> novo
    </span>
  )
  const pct = Math.round(Math.abs(diff) / prev * 100)
  if (diff > 0) return (
    <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
      <FiArrowUp size={10} /> {pct}% {label}
    </span>
  )
  if (diff < 0) return (
    <span className="text-xs text-red-500 font-medium flex items-center gap-0.5">
      <FiArrowDown size={10} /> {pct}% {label}
    </span>
  )
  return (
    <span className="text-xs text-gray-400 flex items-center gap-0.5">
      <FiMinus size={10} /> igual ao anterior
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color, bg, trend, prevValue, link, suffix = '' }) {
  const content = (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon size={16} className={color} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}{suffix}</div>
      <div className="text-xs text-gray-500 mt-0.5 leading-tight">{label}</div>
      {trend && (
        <div className="mt-2">
          <Trend curr={value} prev={prevValue} />
        </div>
      )}
    </div>
  )
  return link ? <Link to={link} className="block">{content}</Link> : content
}

function SectionHeader({ title, icon, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-semibold text-gray-900 text-sm md:text-base flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  )
}

// ── greeting constants ────────────────────────────────────────────────────────

const GREETING_CATEGORIAS = [
  'motivacional', 'pessoal', 'bemEstar', 'geografia',
  'cinema', 'musica', 'tecnologia', 'historia', 'ciencia', 'gastronomia',
]
const LOADING_MSGS = [
  'Hmm, deixa eu ver o que vou te falar hoje... 🤔',
  'Um segundo, estou consultando o calendário cósmico... 🔭',
  'Aguenta aí, procurando a mensagem certa pra você... ✨',
  'Pensando, pensando... quase lá! 💭',
  'Deixa eu vasculhar minha enciclopédia mental... 📚',
]
const CENTURIES = ['XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']
const DECADES   = ['1800','1810','1820','1830','1840','1850','1860','1870','1880','1890',
                   '1900','1910','1920','1930','1940','1950','1960','1970','1980','1990',
                   '2000','2010','2020']
const HINT_MAP = {
  geografia:    { pool: CENTURIES, fmt: v => `Prefira algo do século ${v}.` },
  historia:     { pool: CENTURIES, fmt: v => `Prefira fatos do século ${v}.` },
  gastronomia:  { pool: CENTURIES, fmt: v => `Prefira algo originado ou popular no século ${v}.` },
  cinema:       { pool: DECADES,   fmt: v => `Prefira um filme da década de ${v}.` },
  musica:       { pool: DECADES,   fmt: v => `Prefira artista ou álbum da década de ${v}.` },
  ciencia:      { pool: DECADES,   fmt: v => `Prefira uma descoberta ou estudo da década de ${v}.` },
  tecnologia:   { pool: DECADES,   fmt: v => `Prefira uma invenção ou inovação da década de ${v}.` },
  motivacional: {
    pool: ['dedicação','comprometimento','aprendizado contínuo','foco','resiliência',
           'paciência','empatia','persistência','trabalho em equipe','propósito'],
    fmt: v => `Tema da mensagem: ${v}.`,
  },
  pessoal: {
    pool: ['hobbies','artes','literatura','hábitos saudáveis','clima','culinária',
           'viagens','animais de estimação','filmes e séries','esportes'],
    fmt: v => `Assunto da pergunta: ${v}.`,
  },
  bemEstar: {
    pool: ['cuidado com o corpo','saúde mental','alimentação saudável','relação com a família',
           'amizades','qualidade do sono','exercício físico','momentos de lazer',
           'respiração e relaxamento','hidratação'],
    fmt: v => `A dica deve ser sobre: ${v}.`,
  },
}
function pickHint(cat) {
  const e = HINT_MAP[cat]
  if (!e) return null
  return e.fmt(e.pool[Math.floor(Math.random() * e.pool.length)])
}

// ── main component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()
  const {
    patients, consultations, therapists, rooms,
    patientStatuses, specialtiesData, consultationStatuses,
  } = useData()

  const now        = new Date()
  const today      = format(now, 'yyyy-MM-dd')
  const nowTime    = format(now, 'HH:mm')
  const thisMonth  = format(now, 'yyyy-MM')
  const lastMonth  = format(subMonths(now, 1), 'yyyy-MM')
  const next7Days  = format(addDays(now, 7), 'yyyy-MM-dd')
  const ago30      = format(subDays(now, 30), 'yyyy-MM-dd')

  const isAdmin       = user?.role === 'admin'
  const isSupportAdmin = isAdmin  // todo admin (inclusive admin+terapeuta) vê todos os chamados
  const isDualRole    = isAdmin && !!user?.id  // admin que também é terapeuta

  const [editingConsultation, setEditingConsultation] = useState(null)
  // Dual-role: toggle entre painéis; padrão = terapeuta
  const [dashView, setDashView] = useState('therapist')
  const effectiveView = isDualRole ? dashView : isAdmin ? 'admin' : 'therapist'

  // ── status IDs ───────────────────────────────────────────────────────────
  const realizadaIds = useMemo(() =>
    consultationStatuses.filter(s =>
      s.consumesPrepaidSession === true && !norm(s.name).includes('agend')
    ).map(s => s.id),
  [consultationStatuses])

  const faltaIds = useMemo(() =>
    consultationStatuses.filter(s =>
      norm(s.name).includes('falt') || norm(s.name).includes('ausen')
    ).map(s => s.id),
  [consultationStatuses])

  const cancelaIds = useMemo(() =>
    consultationStatuses.filter(s => norm(s.name).includes('cancel')).map(s => s.id),
  [consultationStatuses])

  const agendadaIds = useMemo(() =>
    consultationStatuses.filter(s => norm(s.name).includes('agend')).map(s => s.id),
  [consultationStatuses])

  // ── sessões pessoais (primário ou secundário) — painel terapeuta ──────────
  const mySessions = useMemo(() => {
    if (!user?.id) return []
    return consultations.filter(c =>
      c.eventType !== 'INTERVIEW' &&
      (c.therapistId === user?.id ||
       (c.consultationTherapists || []).some(ct => ct.therapistId === user?.id))
    )
  }, [consultations, user])

  // ── sessões da clínica inteira — painel admin ─────────────────────────────
  const clinicSessions = useMemo(() =>
    isAdmin ? consultations.filter(c => c.eventType !== 'INTERVIEW') : [],
  [isAdmin, consultations])

  const clinicThisMonth = useMemo(() =>
    clinicSessions.filter(c => c.date?.startsWith(thisMonth)),
  [clinicSessions, thisMonth])

  const clinicLastMonth = useMemo(() =>
    clinicSessions.filter(c => c.date?.startsWith(lastMonth)),
  [clinicSessions, lastMonth])

  const clinicRealizedMes      = useMemo(() => clinicThisMonth.filter(c => realizadaIds.includes(c.consultationStatusId)), [clinicThisMonth, realizadaIds])
  const clinicRealizedAnterior = useMemo(() => clinicLastMonth.filter(c => realizadaIds.includes(c.consultationStatusId)), [clinicLastMonth, realizadaIds])

  const clinicTaxa = clinicThisMonth.length > 0
    ? Math.round(clinicRealizedMes.length / clinicThisMonth.length * 100) : 0
  const clinicTaxaAnterior = clinicLastMonth.length > 0
    ? Math.round(clinicRealizedAnterior.length / clinicLastMonth.length * 100) : 0

  const clinicUpcoming = useMemo(() =>
    clinicSessions
      .filter(c => {
        if (c.date > today) return true
        if (c.date === today) return !c.time || c.time >= nowTime
        return false
      })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 5),
  [clinicSessions, today, nowTime])

  // ── pacientes pessoais — painel terapeuta ─────────────────────────────────
  const myPatients = useMemo(() => {
    if (!user?.id) return []
    const activeStatusId = patientStatuses.find(s => norm(s.name).includes('ativ'))?.id
    const base = patients.filter(p =>
      !p.deleted &&
      (p.therapistId === user?.id || (p.involvedTherapistIds || []).includes(user?.id))
    )
    return activeStatusId ? base.filter(p => p.statusId === activeStatusId) : base
  }, [patients, patientStatuses, user])

  // ── todos os pacientes ativos — painel admin ──────────────────────────────
  const activePatients = useMemo(() => {
    const activeStatusId = patientStatuses.find(s => norm(s.name).includes('ativ'))?.id
    const base = patients.filter(p => !p.deleted)
    return activeStatusId ? base.filter(p => p.statusId === activeStatusId) : base
  }, [patients, patientStatuses])

  // ── fatias mensais pessoais ───────────────────────────────────────────────
  const thisMonthSessions = useMemo(() =>
    mySessions.filter(c => c.date?.startsWith(thisMonth)),
  [mySessions, thisMonth])

  const lastMonthSessions = useMemo(() =>
    mySessions.filter(c => c.date?.startsWith(lastMonth)),
  [mySessions, lastMonth])

  const realizadasMes      = useMemo(() => thisMonthSessions.filter(c => realizadaIds.includes(c.consultationStatusId)), [thisMonthSessions, realizadaIds])
  const realizadasAnterior = useMemo(() => lastMonthSessions.filter(c => realizadaIds.includes(c.consultationStatusId)), [lastMonthSessions, realizadaIds])
  const faltasMes          = useMemo(() => thisMonthSessions.filter(c => faltaIds.includes(c.consultationStatusId)), [thisMonthSessions, faltaIds])
  const cancelasMes        = useMemo(() => thisMonthSessions.filter(c => cancelaIds.includes(c.consultationStatusId)), [thisMonthSessions, cancelaIds])
  const negativosMes       = faltasMes.length + cancelasMes.length

  const taxaRealizacao = thisMonthSessions.length > 0
    ? Math.round(realizadasMes.length / thisMonthSessions.length * 100) : 0
  const taxaAnterior = lastMonthSessions.length > 0
    ? Math.round(realizadasAnterior.length / lastMonthSessions.length * 100) : 0

  // ── próximos (pessoal) ────────────────────────────────────────────────────
  const next7Sessions = useMemo(() =>
    mySessions.filter(c => c.date > today && c.date <= next7Days),
  [mySessions, today, next7Days])

  const todaySessions = useMemo(() =>
    consultations
      .filter(c => c.date === today && c.eventType !== 'INTERVIEW' &&
        (c.therapistId === user?.id ||
         (c.consultationTherapists || []).some(ct => ct.therapistId === user?.id))
      )
      .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
  [consultations, today, user])

  // ── novos pacientes no mês ────────────────────────────────────────────────
  const newPatientsThisMonth = useMemo(() =>
    patients.filter(p => !p.deleted && (p.createdAt || '').startsWith(thisMonth)).length,
  [patients, thisMonth])

  // ── risco de evasão (pacientes pessoais) ──────────────────────────────────
  const evasionRisk = useMemo(() => {
    return myPatients
      .filter(p => {
        const last = mySessions
          .filter(c => c.patientId === p.id && c.date <= today)
          .sort((a, b) => b.date.localeCompare(a.date))[0]
        if (!last) return false
        return last.date < ago30
      })
      .slice(0, 5)
  }, [myPatients, mySessions, today, ago30])

  // ── conflitos ─────────────────────────────────────────────────────────────
  const withConflicts = useMemo(() =>
    mySessions.filter(c => (c.conflicts || []).length > 0 && c.date >= today).length,
  [mySessions, today])

  // ── pendências: atendimentos passados "agendada" onde o usuário é PRIMÁRIO ─
  const pendingFill = useMemo(() =>
    mySessions
      .filter(c =>
        c.date < today &&
        c.therapistId === user?.id &&
        agendadaIds.includes(c.consultationStatusId)
      )
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')),
  [mySessions, today, user, agendadaIds])

  // ── ranking terapeutas (admin) ────────────────────────────────────────────
  const therapistRanking = useMemo(() => {
    if (!isAdmin) return []
    return therapists
      .map(t => {
        const tSessions = consultations.filter(c =>
          c.therapistId === t.id &&
          c.date?.startsWith(thisMonth) &&
          c.eventType !== 'INTERVIEW'
        )
        const realized = tSessions.filter(c => realizadaIds.includes(c.consultationStatusId))
        const rate = tSessions.length > 0 ? Math.round(realized.length / tSessions.length * 100) : 0
        // Pendências: apenas onde o terapeuta é o responsável principal
        const pending = consultations.filter(c =>
          c.therapistId === t.id &&
          c.date < today &&
          c.eventType !== 'INTERVIEW' &&
          agendadaIds.includes(c.consultationStatusId)
        ).length
        return { therapist: t, total: tSessions.length, realized: realized.length, rate, pending }
      })
      .filter(x => x.total > 0)
      .sort((a, b) => b.realized - a.realized)
      .slice(0, 8)
  }, [isAdmin, therapists, consultations, thisMonth, realizadaIds, today, agendadaIds])

  // ── distribuição por especialidade ────────────────────────────────────────
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  const specialtyDist = useMemo(() => {
    if (effectiveView === 'admin') {
      return activeSpecialties
        .map(spec => ({
          ...spec,
          count: clinicThisMonth.filter(c => c.specialty === spec.key).length,
          realized: clinicThisMonth.filter(c => c.specialty === spec.key && realizadaIds.includes(c.consultationStatusId)).length,
        }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count)
    }
    return activeSpecialties
      .map(spec => ({
        ...spec,
        count: myPatients.filter(p => p.specialties?.some(s => s.key === spec.key)).length,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [effectiveView, activeSpecialties, clinicThisMonth, myPatients, realizadaIds])

  // ── admin: financial data ─────────────────────────────────────────────────
  const [financial, setFinancial] = useState(null)
  useEffect(() => {
    if (!isAdmin) return
    async function load() {
      const { data } = await supabase
        .from('payment_invoices')
        .select('total_amount, status, nf_issue_date')
      const invoices = data || []
      const faturadoMes = invoices
        .filter(i => i.nf_issue_date?.startsWith(thisMonth) && ['ISSUED', 'PAID'].includes(i.status))
        .reduce((s, i) => s + Number(i.total_amount || 0), 0)
      const pendentes = invoices.filter(i => i.status === 'ISSUED').length
      const aFaturarCount = consultations.filter(c =>
        c.date?.startsWith(thisMonth) &&
        !c.nfNumber &&
        realizadaIds.includes(c.consultationStatusId) &&
        c.eventType !== 'INTERVIEW'
      ).length
      setFinancial({ faturadoMes, pendentes, aFaturarCount })
    }
    load()
  }, [isAdmin, thisMonth, consultations, realizadaIds])

  // ── greeting ──────────────────────────────────────────────────────────────
  const [greetingMsg, setGreetingMsg]     = useState('')
  const [greetingLoading, setGreetingLoading] = useState(false)
  const [loadingMsg] = useState(() => LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)])
  useEffect(() => {
    if (!user?.authId) return
    const cacheKey = `greeting_${today}_${user.authId}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setGreetingMsg(cached); return }
    Object.keys(localStorage)
      .filter(k => k.startsWith('greeting_') && k.endsWith(`_${user.authId}`) && k !== cacheKey)
      .forEach(k => localStorage.removeItem(k))
    const firstName = user?.name?.split(' ')[0] || 'você'
    const categoria = GREETING_CATEGORIAS[Math.floor(Math.random() * GREETING_CATEGORIAS.length)]
    const hint = pickHint(categoria)
    setGreetingLoading(true)
    supabase.functions.invoke('dashboard-greeting', {
      body: { date: today, hour: now.getHours(), userName: firstName, categoria, hint },
    }).then(({ data, error }) => {
      setGreetingLoading(false)
      if (!error && data?.message) {
        setGreetingMsg(data.message)
        localStorage.setItem(cacheKey, data.message)
      }
    })
  }, [user?.authId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── alert banner counts ───────────────────────────────────────────────────
  const [newLeadsCount, setNewLeadsCount] = useState(0)
  useEffect(() => {
    if (!isAdmin) return
    supabase.from('contact_leads').select('id', { count: 'exact', head: true }).eq('status', 'novo')
      .then(({ count }) => setNewLeadsCount(count || 0))
  }, [isAdmin])

  const [unreadSupportCount, setUnreadSupportCount] = useState(0)
  useEffect(() => {
    if (isSupportAdmin || !user?.authId) return
    supabase.from('support_tickets').select('id', { count: 'exact', head: true })
      .eq('nova_resposta', true).eq('created_by_id', user.authId)
      .then(({ count }) => setUnreadSupportCount(count || 0))
  }, [isSupportAdmin, user?.authId])

  const [novoSupportCount, setNovoSupportCount]         = useState(0)
  const [reprovadoSupportCount, setReprovadoSupportCount] = useState(0)
  useEffect(() => {
    if (!isSupportAdmin) return
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'novo')
      .then(({ count }) => setNovoSupportCount(count || 0))
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }).eq('status', 'reprovado_usuario')
      .then(({ count }) => setReprovadoSupportCount(count || 0))
  }, [isSupportAdmin])

  // ── helpers ───────────────────────────────────────────────────────────────
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const getPatient   = id => patients.find(p => p.id === id)
  const getTherapist = id => therapists.find(t => t.id === id)
  const getRoom      = id => rooms.find(r => r.id === id)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className={`hidden sm:block text-xl md:text-2xl font-bold transition-colors duration-300 ${greetingLoading ? 'text-gray-400 italic' : 'text-gray-900'}`}>
            {greetingLoading
              ? loadingMsg
              : greetingMsg || `${greeting}, ${user?.name?.split(' ')[0]}! 👋`}
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {isDualRole && (
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setDashView('therapist')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${dashView === 'therapist' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Meu Painel
            </button>
            <button
              onClick={() => setDashView('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${dashView === 'admin' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Painel Admin
            </button>
          </div>
        )}
      </div>

      {/* ── Alert banners ────────────────────────────────────────────────── */}
      {isAdmin && newLeadsCount > 0 && (
        <Link to={ROUTES.CONTACT_LEADS} className="flex items-center gap-3 bg-red-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-red-600 transition-colors">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><FiMessageSquare size={18} /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{newLeadsCount} {newLeadsCount === 1 ? 'nova mensagem de contato' : 'novas mensagens de contato'}</div>
            <div className="text-xs text-red-100">Clique para visualizar e tratar</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}
      {isSupportAdmin && novoSupportCount > 0 && (
        <Link to={ROUTES.SUPPORT} className="flex items-center gap-3 bg-red-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-red-600 transition-colors">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><FiLifeBuoy size={18} /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{novoSupportCount === 1 ? '1 novo chamado de suporte' : `${novoSupportCount} novos chamados de suporte`}</div>
            <div className="text-xs text-red-100">Clique para visualizar e responder</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}
      {isSupportAdmin && reprovadoSupportCount > 0 && (
        <Link to={ROUTES.SUPPORT} className="flex items-center gap-3 bg-orange-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-orange-600 transition-colors">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><FiBell size={18} /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{reprovadoSupportCount === 1 ? '1 chamado reprovado pelo usuário' : `${reprovadoSupportCount} chamados reprovados pelo usuário`}</div>
            <div className="text-xs text-orange-100">Clique para visualizar e responder</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}
      {!isSupportAdmin && unreadSupportCount > 0 && (
        <Link to={ROUTES.SUPPORT} className="flex items-center gap-3 bg-amber-500 text-white px-4 py-3.5 rounded-2xl shadow-sm hover:bg-amber-600 transition-colors">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0"><FiBell size={18} /></div>
          <div className="flex-1">
            <div className="font-bold text-sm">{unreadSupportCount === 1 ? '1 chamado com nova resposta' : `${unreadSupportCount} chamados com novas respostas`}</div>
            <div className="text-xs text-amber-100">Clique para visualizar</div>
          </div>
          <FiArrowRight size={18} className="opacity-70 shrink-0" />
        </Link>
      )}

      {/* ══════════════════════ ADMIN VIEW ══════════════════════════════════ */}
      {effectiveView === 'admin' && (
        <>
          {/* ── Stat cards (admin) ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <StatCard icon={FiClipboard}  label="Sessões no mês"       value={clinicThisMonth.length}   color="text-brand-blue"   bg="bg-blue-50"    trend prevValue={clinicLastMonth.length} />
            <StatCard icon={FiActivity}   label="Taxa de realização"    value={clinicTaxa}               color="text-green-600"    bg="bg-green-50"   suffix="%" trend prevValue={clinicTaxaAnterior} />
            <StatCard icon={FiUsers}      label="Pacientes ativos"      value={activePatients.length}    color="text-purple-600"   bg="bg-purple-50" />
            <StatCard icon={FiTrendingUp} label="Novos pacientes"       value={newPatientsThisMonth}     color="text-orange-600"   bg="bg-orange-50"  suffix=" este mês" />
          </div>

          {/* ── Visão financeira (admin) ───────────────────────────────── */}
          <div>
            <SectionHeader title="Visão Financeira do Mês" icon="💰" action={
              <Link to={ROUTES.PAYMENTS} className="text-xs text-brand-blue hover:underline flex items-center gap-1">
                Ver Pagamentos <FiArrowRight size={11} />
              </Link>
            } />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center">
                    <FiCheckCircle size={15} className="text-green-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Faturado no mês</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {financial ? fmtCurrency(financial.faturadoMes) : '—'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">NFs emitidas ou pagas em {now.toLocaleDateString('pt-BR', { month: 'long' })}</div>
              </div>
              <Link to={ROUTES.REPORTS} className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm hover:border-orange-300 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center">
                    <FiClipboard size={15} className="text-orange-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">A faturar</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {financial != null ? financial.aFaturarCount : '—'}
                  <span className="text-sm font-normal text-gray-500 ml-1">sessões</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">Realizadas sem NF este mês</div>
              </Link>
              <Link to={ROUTES.PAYMENTS} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                    <FiDollarSign size={15} className="text-amber-600" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Pendentes de pagamento</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {financial != null ? financial.pendentes : '—'}
                  <span className="text-sm font-normal text-gray-500 ml-1">fatura(s)</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">NFs emitidas aguardando pagamento</div>
              </Link>
            </div>
          </div>

          {/* ── Ranking terapeutas + distribuição especialidade ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Ranking */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-sm">🏆 Terapeutas — {now.toLocaleDateString('pt-BR', { month: 'long' })}</h2>
              </div>
              {therapistRanking.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma sessão registrada no mês</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left font-semibold">Terapeuta</th>
                        <th className="px-3 py-2 text-center font-semibold">Total</th>
                        <th className="px-3 py-2 text-center font-semibold">Realizadas</th>
                        <th className="px-3 py-2 text-center font-semibold">Taxa</th>
                        <th className="px-4 py-2 text-center font-semibold">Pendências</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {therapistRanking.map(({ therapist: t, total, realized, rate, pending }, i) => (
                        <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {i < 3 && <span className="text-base">{['🥇','🥈','🥉'][i]}</span>}
                              <div className="flex items-center gap-1.5">
                                {t.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />}
                                <span className="font-medium text-gray-900 truncate max-w-[110px]">{t.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{total}</td>
                          <td className="px-3 py-2.5 text-center font-semibold text-green-700">{realized}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              rate >= 80 ? 'bg-green-100 text-green-700' :
                              rate >= 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-600'
                            }`}>{rate}%</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {pending > 0
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">{pending}</span>
                              : <span className="text-gray-300 text-xs">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Distribuição por especialidade */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">📊 Sessões por Especialidade — {now.toLocaleDateString('pt-BR', { month: 'long' })}</h2>
              </div>
              {specialtyDist.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma sessão no mês</div>
              ) : (
                <div className="p-4 grid grid-cols-2 gap-2">
                  {specialtyDist.map(spec => {
                    const bg = spec.color || '#e5e7eb'
                    const tc = textColorForBg(bg)
                    const pct = clinicThisMonth.length > 0 ? Math.round(spec.count / clinicThisMonth.length * 100) : 0
                    return (
                      <div key={spec.key} className="rounded-xl px-3 py-2.5 border border-gray-100" style={{ backgroundColor: bg }}>
                        <div className="text-xl font-bold" style={{ color: tc }}>{spec.count}</div>
                        <div className="text-xs font-medium leading-tight" style={{ color: tc, opacity: .85 }}>{spec.label}</div>
                        <div className="text-xs mt-1 flex items-center gap-1 flex-wrap">
                          <span style={{ color: tc, opacity: .75 }}>{spec.realized} realizadas</span>
                          <span style={{ color: tc, opacity: .4 }}>·</span>
                          <span style={{ color: tc, opacity: .55 }}>{pct}% do mês</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Próximos atendimentos (admin) ─────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base">Próximos Atendimentos</h2>
              <Link to={ROUTES.AGENDA} className="text-xs text-brand-blue hover:underline flex items-center gap-1">Ver agenda <FiArrowRight size={11} /></Link>
            </div>
            {clinicUpcoming.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum atendimento agendado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {clinicUpcoming.map(c => {
                      const patient   = getPatient(c.patientId)
                      const therapist = getTherapist(c.therapistId)
                      const room      = getRoom(c.roomId)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 md:px-6 py-3 text-gray-700 whitespace-nowrap">{formatDateShort(c.date)}</td>
                          <td className="px-3 py-3 text-gray-700 whitespace-nowrap font-medium">{c.time || '—'}</td>
                          <td className="px-3 py-3 text-gray-900 font-medium max-w-[140px] truncate">{patient?.fullName || '—'}</td>
                          <td className="px-3 py-3 text-gray-600 hidden sm:table-cell max-w-[110px] truncate">{therapist?.name || '—'}</td>
                          <td className="px-3 py-3 hidden md:table-cell"><Badge specialty={c.specialty} /></td>
                          <td className="px-3 md:px-6 py-3 text-gray-500 hidden lg:table-cell">{room?.name || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Conflitos não resolvidos (admin) ──────────────────────── */}
          {withConflicts > 0 && (
            <Link to={ROUTES.AGENDA} className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl hover:bg-red-100 transition-colors">
              <FiAlertTriangle size={18} className="shrink-0" />
              <div className="flex-1 text-sm font-medium">
                {withConflicts} {withConflicts === 1 ? 'atendimento com conflito' : 'atendimentos com conflito'} de agenda não resolvido{withConflicts > 1 ? 's' : ''}
              </div>
              <FiArrowRight size={16} className="shrink-0 opacity-60" />
            </Link>
          )}
        </>
      )}

      {/* ══════════════════════ THERAPIST VIEW ══════════════════════════════ */}
      {effectiveView === 'therapist' && (
        <>
          {/* ── Stat cards (therapist) ─────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <StatCard icon={FiCheckCircle} label="Realizadas no mês"  value={realizadasMes.length}  color="text-green-600"  bg="bg-green-50"  trend prevValue={realizadasAnterior.length} />
            <StatCard icon={FiClipboard}   label="Faltas + canceladas" value={negativosMes}           color="text-red-500"    bg="bg-red-50" />
            <StatCard icon={FiCalendar}    label="Próximos 7 dias"     value={next7Sessions.length}   color="text-brand-blue" bg="bg-blue-50" />
            <StatCard icon={FiUsers}       label="Meus pacientes"      value={myPatients.length}      color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* ── Agenda do dia ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base">
                📅 Agenda de hoje
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </h2>
              <Link to={ROUTES.AGENDA} className="text-xs text-brand-blue hover:underline flex items-center gap-1">Ver agenda <FiArrowRight size={11} /></Link>
            </div>
            {todaySessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum atendimento para hoje</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {todaySessions.slice(0, 8).map(c => {
                  const patient = getPatient(c.patientId)
                  const room    = getRoom(c.roomId)
                  const status  = consultationStatuses.find(s => s.id === c.consultationStatusId)
                  const isConflict = (c.conflicts || []).length > 0
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                      <div className="text-sm font-bold text-gray-900 w-12 shrink-0 tabular-nums">
                        {c.time ? c.time.slice(0, 5) : '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">
                          {patient?.fullName || '—'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge specialty={c.specialty} />
                          {room && <span className="text-xs text-gray-400">{room.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isConflict && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">⚠</span>
                        )}
                        {status && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                            style={{ backgroundColor: status.color ? `${status.color}22` : '#f3f4f6', color: status.color || '#374151' }}
                          >
                            {status.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {todaySessions.length > 8 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center">
                    + {todaySessions.length - 8} atendimento(s) — <Link to={ROUTES.AGENDA} className="text-brand-blue hover:underline">ver agenda completa</Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Pendências de preenchimento ────────────────────────────── */}
          {pendingFill.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-200 flex items-center gap-2 flex-wrap">
                <FiAlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span className="font-semibold text-amber-800 text-sm">Pendências de preenchimento</span>
                <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{pendingFill.length}</span>
                <span className="text-xs text-amber-600 ml-auto hidden sm:block">Atendimentos passados com status "Agendada" — atualize o registro</span>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-amber-50 border-b border-amber-100">
                    <tr className="text-amber-700 uppercase tracking-wide">
                      <th className="px-4 py-2 text-left font-semibold">Data</th>
                      <th className="px-3 py-2 text-left font-semibold">Horário</th>
                      <th className="px-3 py-2 text-left font-semibold">Paciente</th>
                      <th className="px-3 py-2 text-left font-semibold hidden sm:table-cell">Especialidade</th>
                      <th className="px-4 py-2 text-center font-semibold">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {pendingFill.map(c => {
                      const patient = getPatient(c.patientId)
                      return (
                        <tr key={c.id} className="hover:bg-amber-100/60 transition-colors">
                          <td className="px-4 py-2 text-amber-900 font-medium whitespace-nowrap">{formatDateShort(c.date)}</td>
                          <td className="px-3 py-2 text-amber-700 tabular-nums">{c.time?.slice(0, 5) || '—'}</td>
                          <td className="px-3 py-2 text-amber-900 font-medium max-w-[140px] truncate">{patient?.fullName || '—'}</td>
                          <td className="px-3 py-2 hidden sm:table-cell"><Badge specialty={c.specialty} /></td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setEditingConsultation(c)}
                              className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-200 rounded-lg transition-colors"
                              title="Editar atendimento"
                            >
                              <FiEdit2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Alertas clínicos ───────────────────────────────────────── */}
          {(evasionRisk.length > 0 || withConflicts > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Risco de evasão */}
              {evasionRisk.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FiAlertTriangle size={15} className="text-amber-600 shrink-0" />
                    <span className="text-sm font-semibold text-amber-800">Pacientes sem atendimento há 30+ dias</span>
                  </div>
                  <div className="space-y-2">
                    {evasionRisk.map(p => {
                      const last = mySessions
                        .filter(c => c.patientId === p.id && c.date <= today)
                        .sort((a, b) => b.date.localeCompare(a.date))[0]
                      const dias = last
                        ? Math.floor((new Date(today) - new Date(last.date)) / 86400000)
                        : null
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-amber-900 truncate">{p.fullName}</span>
                          {dias != null && <span className="text-amber-700 shrink-0 ml-2">{dias} dias</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Conflitos de agenda */}
              {withConflicts > 0 && (
                <Link to={ROUTES.AGENDA} className="bg-red-50 border border-red-200 rounded-2xl p-4 hover:bg-red-100 transition-colors flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <FiAlertTriangle size={15} className="text-red-600 shrink-0" />
                    <span className="text-sm font-semibold text-red-800">Conflitos de agenda</span>
                  </div>
                  <p className="text-xs text-red-700">
                    {withConflicts} {withConflicts === 1 ? 'atendimento futuro com' : 'atendimentos futuros com'} conflito não resolvido
                  </p>
                  <span className="mt-2 text-xs text-red-600 flex items-center gap-1 font-medium">
                    Ver na agenda <FiArrowRight size={11} />
                  </span>
                </Link>
              )}
            </div>
          )}

          {/* ── Distribuição de pacientes por especialidade ─────────────── */}
          {specialtyDist.length > 0 && (
            <div>
              <SectionHeader title="Meus Pacientes por Especialidade" icon="👥" />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {specialtyDist.map(spec => {
                  const bg = spec.color || '#e5e7eb'
                  const tc = textColorForBg(bg)
                  return (
                    <div key={spec.key} className="rounded-xl px-3 py-2.5 text-center border border-gray-100 shadow-sm" style={{ backgroundColor: bg }}>
                      <div className="text-xl font-bold" style={{ color: tc }}>{spec.count}</div>
                      <div className="text-xs font-medium leading-tight mt-0.5" style={{ color: tc, opacity: .85 }}>{spec.label}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Edit modal (pendências de preenchimento) ──────────────────── */}
      {editingConsultation && (
        <ConsultationFormModal
          initial={editingConsultation}
          onClose={() => setEditingConsultation(null)}
        />
      )}

    </div>
  )
}
