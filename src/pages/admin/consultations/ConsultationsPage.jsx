import { useState, useMemo } from 'react'
import { FiPlus, FiSearch, FiClipboard, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiEye, FiRepeat, FiVideo, FiMapPin, FiExternalLink } from 'react-icons/fi'

function monthRange(offset) {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + offset
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const pad = n => String(n).padStart(2, '0')
  const fmt = x => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
  return { from: fmt(first), to: fmt(last) }
}

function monthBtnLabel(offset) {
  if (offset === 0) return 'Mês Atual'
  if (offset === 1) return 'Mês+1'
  const d = new Date()
  const t = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return t.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(t.getFullYear()).slice(2)
}
import HelpButton from '../../../components/ui/HelpButton'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import EmptyState from '../../../components/ui/EmptyState'
import ConsultationFormModal from './ConsultationFormModal'
import SeriesFormModal from './SeriesFormModal'
import { formatDateShort } from '../../../utils/dateUtils'
import { detectConflicts, buildConflictTooltip } from '../../../utils/conflictUtils'
import { canViewConsultationDetails, canEditConsultationDetails, canEditConsultation } from '../../../utils/consultationPermissions'

export default function ConsultationsPage() {
  const { consultations, patients, therapists, rooms, specialtiesData, consultationStatuses, appointmentTypes, calendarBlocks, deleteConsultation, deleteConsultationSeries, logAudit, buildConsultationResourceName } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterTherapist, setFilterTherapist] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState(() => monthRange(0).from)
  const [filterDateTo, setFilterDateTo]     = useState(() => monthRange(0).to)
  const [showModal, setShowModal] = useState(false)
  const [editConsultation, setEditConsultation] = useState(null)
  const [viewConsultation, setViewConsultation] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [seriesDeleteConfirm, setSeriesDeleteConfirm] = useState(null) // { id, seriesId, date }
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [myConsultations, setMyConsultations] = useState(false)
  const [filterConflicts, setFilterConflicts] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isAdminOrTeam = isAdmin || user?.belongsToTeam
  const canFilterMine = isAdmin && !!user?.id

  function getPatient(id) { return patients.find(p => p.id === id) }
  function getTherapist(id) { return therapists.find(t => t.id === id) }
  function getStatus(id) { return consultationStatuses.find(s => s.id === id) }

  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  const visibleConsultations = (() => {
    if (!isAdmin) {
      return consultations.filter(c =>
        c.therapistId === user?.id ||
        (c.consultationTherapists || []).some(t => t.therapistId === user?.id)
      )
    }
    if (myConsultations && user?.id) {
      return consultations.filter(c =>
        c.therapistId === user.id ||
        (c.consultationTherapists || []).some(t => t.therapistId === user.id)
      )
    }
    return consultations
  })()

  // Mapa de conflitos calculado sobre visibleConsultations (antes de filtered) para
  // evitar dependência circular quando filterConflicts está ativo.
  const conflictMap = useMemo(() => {
    const activeCBlocks = (calendarBlocks || []).filter(b => !b.cancelled && b.active !== false)
    const map = {}
    for (const c of visibleConsultations) {
      const cfs = detectConflicts(c, consultations, activeCBlocks, rooms)
      if (cfs.length > 0) map[c.id] = cfs
    }
    return map
  }, [visibleConsultations, consultations, calendarBlocks, rooms]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = visibleConsultations
    .filter(c => {
      const patient = getPatient(c.patientId)
      const matchSearch = !search || patient?.fullName.toLowerCase().includes(search.toLowerCase())
      const matchSpecialty = !filterSpecialty || c.specialty === filterSpecialty
      const matchStatus = !filterStatus || c.consultationStatusId === filterStatus
      const matchTherapist = !filterTherapist || c.therapistId === filterTherapist || (c.consultationTherapists || []).some(ct => ct.therapistId === filterTherapist)
      const matchDate = (!filterDateFrom || c.date >= filterDateFrom) && (!filterDateTo || c.date <= filterDateTo)
      const matchEventType = !filterEventType || (c.eventType || 'SESSION') === filterEventType
      const matchConflict = !filterConflicts || !!conflictMap[c.id]
      return matchSearch && matchSpecialty && matchStatus && matchTherapist && matchDate && matchEventType && matchConflict
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  function handleDelete(consultation) {
    if (consultation.seriesId && isAdmin) {
      setSeriesDeleteConfirm({ id: consultation.id, seriesId: consultation.seriesId, date: consultation.date })
      return
    }
    if (confirm('Excluir este registro de atendimento?')) deleteConsultation(consultation.id)
  }

  const outcomeColors = {
    achieved: 'text-green-600 bg-green-50',
    partial: 'text-yellow-600 bg-yellow-50',
    not_achieved: 'text-red-600 bg-red-50',
  }
  const outcomeLabels = { achieved: 'Alcançado', partial: 'Parcial', not_achieved: 'Não alcançado' }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Atendimentos</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpButton title="Como usar Atendimentos">
            <p><strong>Registrar atendimento:</strong> clique em <em>Novo Atendimento</em> e preencha paciente, terapeuta, especialidade, data, horário, status e tipo.</p>
            <p><strong>Criar série (admin):</strong> apenas administradores podem criar, editar e excluir séries recorrentes. Clique em <em>Série</em> para criar atendimentos recorrentes (ex.: toda segunda por 10 semanas). Terapeutas podem editar campos individuais de uma ocorrência, mas sem alterar o escopo da série.</p>
            <p><strong>Entrevistas:</strong> selecione o tipo "Entrevista" para entrevistas com responsáveis ou candidatos. Paciente opcional; campo entrevistado obrigatório. Entrevistas remotas não exigem sala e não conflitam com bloqueios Flex. Entrevistas não aparecem nos relatórios financeiros.</p>
            <p><strong>Chips nos cards:</strong> 🔵 indigo = série regular; 🟡 âmbar + ! = ocorrência alterada individualmente; 👥 N = múltiplos terapeutas (passe o mouse para ver os nomes); 🔴 ⚠ = conflito de agenda (passe o mouse para detalhes); 🔷 "Reposição" = este atendimento é reposição de outro; 🟢 "Reposição agendada" = já existe uma reposição vinculada a este atendimento.</p>
            <p><strong>Reposição:</strong> quando o status de um atendimento (ex.: Falta do Terapeuta, Cancelada) exige, o formulário pergunta se haverá reposição. Se sim, a reposição é agendada como um novo atendimento avulso, sem alterar a data do original — a tela mostra um link para navegar entre os dois.</p>
            <p><strong>Conflitos de agenda:</strong> ao criar ou editar, o sistema detecta sobreposições de terapeuta, sala ou bloqueios. O aviso em âmbar exibe os conflitos — você pode salvar mesmo assim ou cancelar para corrigir.</p>
            <p><strong>Filtros:</strong> use os filtros de especialidade, status, tipo (Atendimento / Entrevista) e terapeuta para localizar registros específicos.</p>
            <p><strong>Editar:</strong> clique no lápis (✏) ou olhinho (👁) na linha para editar ou visualizar. Terapeutas só podem editar ou excluir seus próprios atendimentos.</p>
            <p><strong>Objetivo/Relato obrigatórios:</strong> para status "normais" (sem a flag "Exibe Observação" nem "Atendimento ainda não aconteceu"), Objetivo da Sessão e Relato de Evolução são obrigatórios — Objetivo da Próxima Sessão é sempre opcional. Status marcados como "Atendimento ainda não aconteceu" (ex.: Agendada) dispensam essa exigência, já que o atendimento ainda não ocorreu.</p>
            <p><strong>Status automáticos:</strong> configurados em Administração → Status Atendimento; aparecem nos filtros e no prontuário. No formulário de registro, só o administrador consegue selecioná-los ou editar um atendimento que já esteja com um deles — terapeutas não veem essa opção.</p>
          </HelpButton>
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowSeriesModal(true)}>
              <FiRepeat size={15} />
              <span className="hidden sm:inline">Nova Série</span>
            </Button>
          )}
          <Button variant="primary" onClick={() => { setEditConsultation(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Novo Atendimento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Linha 1: botões de mês + datas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[-2, -1, 0, 1].map(offset => {
            const { from, to } = monthRange(offset)
            const isActive = filterDateFrom === from && filterDateTo === to
            return (
              <button
                key={offset}
                onClick={() => { setFilterDateFrom(from); setFilterDateTo(to) }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {monthBtnLabel(offset)}
              </button>
            )
          })}
          <div className="flex gap-1.5 ml-auto">
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            />
          </div>
        </div>
        {/* Linha 2: busca + filtros + toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por paciente..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Status</option>
            {consultationStatuses.filter(s => s.active !== false).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {isAdminOrTeam && (
            <select
              value={filterTherapist}
              onChange={e => setFilterTherapist(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Terapeuta</option>
              {therapists.filter(t => t.active !== false).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <select
            value={filterSpecialty}
            onChange={e => setFilterSpecialty(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Especialidade</option>
            {activeSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select
            value={filterEventType}
            onChange={e => setFilterEventType(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-brand-blue outline-none"
          >
            <option value="">Tipo</option>
            <option value="SESSION">Atendimento</option>
            <option value="INTERVIEW">Entrevista</option>
          </select>
          {canFilterMine && (
            <button
              type="button"
              onClick={() => setMyConsultations(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
                myConsultations
                  ? 'border-brand-blue bg-brand-blue text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <FiRepeat size={13} />
              <span className="hidden sm:inline">Meus</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterConflicts(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-all shrink-0 ${
              filterConflicts
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            ⚠ <span className="hidden sm:inline">Conflitos</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState
              icon={FiClipboard}
              title="Nenhum registro encontrado"
              description="Registre o primeiro atendimento clicando em 'Novo Atendimento'."
              action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo Atendimento</Button>}
            />
          </div>
        ) : filtered.map(c => {
          const patient = getPatient(c.patientId)
          const therapist = getTherapist(c.therapistId)
          const status = getStatus(c.consultationStatusId)
          const apptType = appointmentTypes.find(t => t.id === c.appointmentTypeId)
          const room = rooms.find(r => r.id === c.roomId)
          const isExpanded = expanded === c.id
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {c.eventType === 'INTERVIEW' && c.intervieweeName ? c.intervieweeName : (patient?.fullName || '—')}
                    </span>
                    <Badge specialty={c.specialty} />
                    {status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>
                    )}
                    {apptType && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{apptType.name}</span>
                    )}
                    {c.eventType === 'INTERVIEW' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                        {c.interviewFormat === 'REMOTE' ? <FiVideo size={10} /> : <FiMapPin size={10} />}
                        Entrevista
                      </span>
                    )}
                    {c.eventType === 'INTERVIEW' && c.interviewFormat === 'REMOTE' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">Remota</span>
                    )}
                    {c.eventType === 'INTERVIEW' && c.interviewFormat === 'REMOTE' && c.meetingLink && (
                      <a
                        href={c.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-600 text-white hover:bg-orange-700"
                      >
                        <FiExternalLink size={10} /> Entrar
                      </a>
                    )}
                    {c.seriesId && !c.isSeriesException && (
                      <span title="Recorrente" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-500">
                        <FiRepeat size={10} />
                      </span>
                    )}
                    {c.seriesId && c.isSeriesException && (
                      <span title="Ocorrência alterada individualmente" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600">
                        <FiRepeat size={10} /><span>!</span>
                      </span>
                    )}
                    {(c.consultationTherapists || []).length > 1 && (
                      <span
                        title={(c.consultationTherapists || []).map(ct => therapists.find(t => t.id === ct.therapistId)?.name || '?').join(', ')}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-500"
                      >
                        👥 {(c.consultationTherapists || []).length}
                      </span>
                    )}
                    {(conflictMap[c.id] || []).length > 0 && (
                      <span
                        title={buildConflictTooltip(conflictMap[c.id], { therapists, rooms, patients, consultations, calendarBlocks })}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600"
                      >
                        ⚠ Conflito
                      </span>
                    )}
                    {c.replacementForConsultationId && (
                      <span title="Reposição de outro atendimento" className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700">
                        Reposição
                      </span>
                    )}
                    {c.willHaveReplacement === true && consultations.some(r => r.replacementForConsultationId === c.id) && (
                      <span title="Já existe reposição agendada para este atendimento" className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                        Reposição agendada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>{formatDateShort(c.date)}{c.time && <span className="text-gray-400"> {c.time}</span>}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {therapist?.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: therapist.color }} />}
                      {therapist?.name || '—'}
                    </span>
                    {room && (
                      <><span>•</span>
                      <span className="flex items-center gap-1">
                        {room.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: room.color }} />}
                        {room.name}
                      </span></>
                    )}
                    <span>•</span>
                    <span>{c.activities?.length || 0} atividade(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Olho: apenas participantes (principal ou adicional) */}
                  {canViewConsultationDetails(user, c) && (
                    <button
                      onClick={() => { setViewConsultation(c); logAudit('VIEW', 'consultations', c.id, buildConsultationResourceName(c)) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                    >
                      <FiEye size={15} />
                    </button>
                  )}
                  {/* Lápis: terapeuta principal OU admin (se status não for realizada) */}
                  {canEditConsultation(user, c, consultationStatuses) && (
                    <button
                      onClick={() => { setEditConsultation(c); setShowModal(true); logAudit('VIEW', 'consultations', c.id, buildConsultationResourceName(c)) }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                    >
                      <FiEdit2 size={15} />
                    </button>
                  )}
                  {/* Lixeira: admin ou terapeuta principal */}
                  {(isAdmin || user?.id === c.therapistId) && (
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  )}
                  {/* Expandir: apenas participantes podem ver detalhe clínico */}
                  {canViewConsultationDetails(user, c) && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
                  {c.mainObjective && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objetivo Principal</h4>
                      <p className="text-sm text-gray-700">{c.mainObjective}</p>
                    </div>
                  )}

                  {c.activities?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Atividades Realizadas</h4>
                      <div className="space-y-2">
                        {c.activities.map(act => (
                          <div key={act.id} className="bg-white rounded-xl p-3 border border-gray-100 flex items-start gap-3">
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${outcomeColors[act.outcome]}`}>
                              {outcomeLabels[act.outcome]}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900">{act.name}</div>
                              {act.description && <div className="text-xs text-gray-500 mt-0.5">{act.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.evolutionNotes && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notas de Evolução</h4>
                      <p className="text-sm text-gray-700">{c.evolutionNotes}</p>
                    </div>
                  )}

                  {c.guardianFeedback && (
                    <div className="bg-brand-yellow/10 rounded-xl p-3 border border-brand-yellow/20">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Orientação ao Responsável</h4>
                      <p className="text-sm text-gray-700">{c.guardianFeedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <ConsultationFormModal
          onClose={() => setShowModal(false)}
          initial={editConsultation || {}}
          onNavigate={c => { setShowModal(false); setViewConsultation(c) }}
        />
      )}
      {viewConsultation && (
        <ConsultationFormModal
          onClose={() => setViewConsultation(null)}
          initial={viewConsultation}
          readOnly
          onNavigate={c => setViewConsultation(c)}
        />
      )}
      {showSeriesModal && (
        <SeriesFormModal onClose={() => setShowSeriesModal(false)} />
      )}
      {seriesDeleteConfirm && (
        <Modal
          title="Excluir da Série"
          onClose={() => setSeriesDeleteConfirm(null)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSeriesDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="outline" onClick={() => { deleteConsultation(seriesDeleteConfirm.id); setSeriesDeleteConfirm(null) }}>Apenas este</Button>
              <Button variant="danger" onClick={() => { deleteConsultationSeries(seriesDeleteConfirm.seriesId, seriesDeleteConfirm.date); setSeriesDeleteConfirm(null) }}>Este e os próximos</Button>
            </>
          }
        >
          <p className="text-sm text-gray-700">Esta consulta faz parte de uma série recorrente. Deseja excluir apenas este atendimento ou este e todos os atendimentos futuros não faturados da série?</p>
        </Modal>
      )}
    </div>
  )
}
