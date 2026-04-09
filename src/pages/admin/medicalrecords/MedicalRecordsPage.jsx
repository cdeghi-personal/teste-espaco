import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiSearch, FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import Badge from '../../../components/ui/Badge'
import ConsultationFormModal from '../consultations/ConsultationFormModal'
import { formatDateBR, formatDateShort, isoToday } from '../../../utils/dateUtils'

const CONDUCT_STATUS = {
  nao_iniciada: { label: 'Não Iniciada',  color: 'bg-gray-100 text-gray-600' },
  em_andamento: { label: 'Em Andamento',  color: 'bg-blue-100 text-blue-700' },
  encerrada:    { label: 'Encerrada',     color: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',     color: 'bg-red-100 text-red-700' },
}

function currentYearMonth() { return isoToday().slice(0, 7) }

function monthLabel(ym) {
  const [y, m] = ym.split('-')
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[parseInt(m) - 1]} ${y}`
}

function prevMonth(ym) {
  const d = new Date(`${ym}-01`)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

function nextMonth(ym) {
  const d = new Date(`${ym}-01`)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 7)
}

// ─── Exam row ─────────────────────────────────────────────────
function ExamRow({ ex, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(ex)
  return (
    <InlineRow
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setDraft(ex); setEditing(false) }}
      onSave={() => { onSave(ex.id, draft); setEditing(false) }}
      onDelete={() => onDelete(ex.id)}
    >
      {editing ? (
        <div className="space-y-2">
          <Input label="Descrição *" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input label="Data Realização" type="date" value={draft.examDate || ''} onChange={e => setDraft(d => ({ ...d, examDate: e.target.value }))} />
            <Input label="Link / Anexo (URL)" value={draft.attachmentUrl || ''} onChange={e => setDraft(d => ({ ...d, attachmentUrl: e.target.value }))} />
          </div>
          <Textarea label="Observações" value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} rows={2} />
        </div>
      ) : (
        <div>
          <div className="font-medium text-sm text-gray-900">{ex.description}</div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
            {ex.examDate && <span>{formatDateBR(ex.examDate)}</span>}
            {ex.attachmentUrl && <a href={ex.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">Ver anexo</a>}
            {ex.notes && <span className="text-gray-400 truncate max-w-xs">{ex.notes}</span>}
          </div>
        </div>
      )}
    </InlineRow>
  )
}

// ─── Medication row ────────────────────────────────────────────
function MedRow({ med, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(med)
  return (
    <InlineRow
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setDraft(med); setEditing(false) }}
      onSave={() => { onSave(med.id, draft); setEditing(false) }}
      onDelete={() => onDelete(med.id)}
    >
      {editing ? (
        <div className="space-y-2">
          <Input label="Medicação *" value={draft.medication} onChange={e => setDraft(d => ({ ...d, medication: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input label="Data Registro" type="date" value={draft.registrationDate || ''} onChange={e => setDraft(d => ({ ...d, registrationDate: e.target.value }))} />
            <Select label="Status" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
              <option value="ativa">Ativa</option>
              <option value="interrompida">Interrompida</option>
            </Select>
          </div>
          <Textarea label="Observações" value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} rows={2} />
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium text-sm text-gray-900">{med.medication}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${med.status === 'ativa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {med.status === 'ativa' ? 'Ativa' : 'Interrompida'}
          </span>
          <span className="text-xs text-gray-400">{formatDateBR(med.registrationDate)}</span>
          {med.notes && <span className="text-xs text-gray-400 truncate max-w-xs">{med.notes}</span>}
        </div>
      )}
    </InlineRow>
  )
}

// ─── Conduct row ───────────────────────────────────────────────
function ConductRow({ cd, activeTherapists, getTherapistSpecialties, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cd)
  return (
    <InlineRow
      editing={editing}
      onEdit={() => setEditing(true)}
      onCancel={() => { setDraft(cd); setEditing(false) }}
      onSave={() => { onSave(cd.id, draft); setEditing(false) }}
      onDelete={() => onDelete(cd.id)}
    >
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select label="Terapeuta Responsável *" value={draft.therapistId || ''} onChange={e => setDraft(d => ({ ...d, therapistId: e.target.value, specialty: '' }))}>
              <option value="">Selecione</option>
              {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select label="Especialidade" value={draft.specialty || ''} onChange={e => setDraft(d => ({ ...d, specialty: e.target.value }))}>
              <option value="">Selecione</option>
              {getTherapistSpecialties(draft.therapistId).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </div>
          <Textarea label="Conduta" value={draft.conduct || ''} onChange={e => setDraft(d => ({ ...d, conduct: e.target.value }))} rows={2} />
          <Textarea label="Objetivo" value={draft.objective || ''} onChange={e => setDraft(d => ({ ...d, objective: e.target.value }))} rows={2} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Input label="Data Início" type="date" value={draft.startDate || ''} onChange={e => setDraft(d => ({ ...d, startDate: e.target.value }))} />
            <Input label="Data Fim" type="date" value={draft.endDate || ''} onChange={e => setDraft(d => ({ ...d, endDate: e.target.value }))} />
            <Select label="Status" value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
              {Object.entries(CONDUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{cd.therapistName || '—'}</span>
            {cd.specialty && <Badge specialty={cd.specialty} />}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONDUCT_STATUS[cd.status]?.color}`}>
              {CONDUCT_STATUS[cd.status]?.label}
            </span>
          </div>
          {cd.conduct && <p className="text-xs text-gray-600"><strong>Conduta:</strong> {cd.conduct}</p>}
          {cd.objective && <p className="text-xs text-gray-600"><strong>Objetivo:</strong> {cd.objective}</p>}
          {(cd.startDate || cd.endDate) && (
            <p className="text-xs text-gray-400">
              {cd.startDate && `Início: ${formatDateBR(cd.startDate)}`}
              {cd.startDate && cd.endDate && ' · '}
              {cd.endDate && `Fim: ${formatDateBR(cd.endDate)}`}
            </p>
          )}
        </div>
      )}
    </InlineRow>
  )
}

// ─── Linha editável genérica ──────────────────────────────────
function InlineRow({ children, onSave, onCancel, onEdit, onDelete, editing }) {
  return (
    <div className={`rounded-xl border ${editing ? 'border-brand-blue bg-blue-50/30' : 'border-gray-100 bg-white'} p-3`}>
      {children}
      <div className="flex justify-end gap-2 mt-2">
        {editing ? (
          <>
            <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><FiX size={14} /></button>
            <button onClick={onSave} className="p-1.5 rounded-lg text-green-600 hover:bg-green-50"><FiCheck size={14} /></button>
          </>
        ) : (
          <>
            <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50"><FiEdit2 size={14} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><FiTrash2 size={14} /></button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Seção com título colapsável ─────────────────────────────
function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        <div className="flex items-center gap-2">
          {count > 0 && <span className="text-xs bg-brand-blue text-white px-2 py-0.5 rounded-full">{count}</span>}
          <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function MedicalRecordsPage() {
  const {
    patients, therapists, rooms, specialtiesData, consultations, consultationStatuses, appointmentTypes,
    updateConsultation,
    getOrCreateMedicalRecord,
    getExams, addExam, updateExam, deleteExam,
    getMedications, addMedication, updateMedication, deleteMedication,
    getConducts, addConduct, updateConduct, deleteConduct,
  } = useData()
  const { user } = useAuth()

  const [search, setSearch] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [medicalRecordId, setMedicalRecordId] = useState(null)
  const [loading, setLoading] = useState(false)

  const [exams, setExams] = useState([])
  const [medications, setMedications] = useState([])
  const [conducts, setConducts] = useState([])

  // Draft state for new-item forms
  const [examDraft, setExamDraft] = useState(null)
  const [medDraft, setMedDraft] = useState(null)
  const [conductDraft, setConductDraft] = useState(null)

  // Month navigation for history
  const [consultMonth, setConsultMonth] = useState(currentYearMonth())
  const [showConsultationModal, setShowConsultationModal] = useState(false)
  const [editConsultation, setEditConsultation] = useState(null)
  const [selectedConsultIds, setSelectedConsultIds] = useState(new Set())

  const activePatients = patients.filter(p => !p.deleted)
  const filtered = search
    ? activePatients.filter(p => p.fullName.toLowerCase().includes(search.toLowerCase()))
    : activePatients

  const selectedPatient = patients.find(p => p.id === selectedPatientId)
  const activeTherapists = therapists.filter(t => t.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  // Consultations for current patient
  const patientConsultations = consultations
    .filter(c => {
      if (c.patientId !== selectedPatientId) return false
      if (user?.role === 'admin') return true
      if (user?.belongsToTeam) {
        // terapeuta da equipe vê apenas consultas de terapeutas da equipe
        const t = therapists.find(t => t.id === c.therapistId)
        return t?.belongsToTeam === true
      }
      // terapeuta fora da equipe vê apenas as suas
      return c.therapistId === user?.id
    })
    .sort((a, b) => b.date.localeCompare(a.date))

  const monthConsultations = patientConsultations.filter(c => c.date.startsWith(consultMonth))

  const hasPrev = patientConsultations.some(c => c.date < `${consultMonth}-01`)
  const isCurrentMonth = consultMonth === currentYearMonth()

  const loadData = useCallback(async (patientId) => {
    setLoading(true)
    const mrId = await getOrCreateMedicalRecord(patientId, user?.authId)
    if (!mrId) { setLoading(false); return }
    setMedicalRecordId(mrId)
    const [e, m, c] = await Promise.all([getExams(mrId), getMedications(mrId), getConducts(mrId)])
    setExams(e || [])
    setMedications(m || [])
    setConducts(c || [])
    setLoading(false)
  }, [])

  async function handleSelectPatient(id) {
    setSelectedPatientId(id)
    setSearch('')
    setExamDraft(null); setMedDraft(null); setConductDraft(null)
    setConsultMonth(currentYearMonth())
    setSelectedConsultIds(new Set())
    if (id) await loadData(id)
    else setMedicalRecordId(null)
  }

  // ─── Exams ─────────────────────────────────────────────────
  async function saveExam() {
    if (!examDraft?.description?.trim()) return
    const result = await addExam(medicalRecordId, examDraft)
    if (result && !result.error) { setExams(prev => [...prev, result]); setExamDraft(null) }
  }

  async function saveExamEdit(id, data) {
    await updateExam(id, data)
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
  }

  async function removeExam(id) {
    if (!confirm('Remover exame?')) return
    await deleteExam(id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  // ─── Medications ───────────────────────────────────────────
  async function saveMed() {
    if (!medDraft?.medication?.trim()) return
    const result = await addMedication(medicalRecordId, medDraft)
    if (result && !result.error) { setMedications(prev => [...prev, result]); setMedDraft(null) }
  }

  async function saveMedEdit(id, data) {
    await updateMedication(id, data)
    setMedications(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
  }

  async function removeMed(id) {
    if (!confirm('Remover medicamento?')) return
    await deleteMedication(id)
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  // ─── Conducts ──────────────────────────────────────────────
  function getTherapistSpecialties(therapistId) {
    const t = therapists.find(th => th.id === therapistId)
    if (!t) return activeSpecialties
    if (t.therapistSpecialties?.length) {
      return t.therapistSpecialties.map(s => ({
        key: s.specialty,
        label: specialtiesData.find(sp => sp.key === s.specialty)?.label || s.specialty,
      }))
    }
    if (t.specialty) return [{ key: t.specialty, label: specialtiesData.find(sp => sp.key === t.specialty)?.label || t.specialty }]
    return activeSpecialties.map(s => ({ key: s.key, label: s.label }))
  }

  async function saveConduct() {
    if (!conductDraft?.therapistId) return
    // Pre-fill with logged-in therapist if applicable
    const result = await addConduct(medicalRecordId, conductDraft)
    if (result && !result.error) { setConducts(prev => [...prev, result]); setConductDraft(null) }
  }

  async function saveConductEdit(id, data) {
    await updateConduct(id, data)
    setConducts(prev => prev.map(c => c.id === id ? { ...c, ...data, therapistName: therapists.find(t => t.id === data.therapistId)?.name || c.therapistName } : c))
  }

  async function removeConduct(id) {
    if (!confirm('Remover conduta?')) return
    await deleteConduct(id)
    setConducts(prev => prev.filter(c => c.id !== id))
  }

  function toggleConsultSelect(id) {
    setSelectedConsultIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function batchSetStatus(statusName) {
    const status = consultationStatuses.find(s => s.name === statusName)
    if (!status) { alert(`Status "${statusName}" não encontrado. Verifique o cadastro de Status Atendimento.`); return }
    const ids = [...selectedConsultIds]
    const action = statusName === 'Faturado' ? 'Faturar' : 'Registrar Pagamento'
    if (!confirm(`${action} ${ids.length} atendimento(s)?`)) return
    await Promise.all(ids.map(id => updateConsultation(id, { consultationStatusId: status.id })))
    setSelectedConsultIds(new Set())
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Prontuário</h1>
        <p className="text-xs text-gray-500 mt-0.5">Selecione um paciente para acessar o prontuário</p>
      </div>

      {/* Seletor de paciente */}
      {!selectedPatientId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="relative">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente pelo nome..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              autoFocus
            />
          </div>
          {search && (
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">Nenhum paciente encontrado</div>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className="w-full text-left px-4 py-3 hover:bg-brand-yellow/10 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-yellow/20 text-brand-blue flex items-center justify-center font-bold text-sm shrink-0">
                    {p.fullName.charAt(0)}
                  </div>
                  <span className="text-sm text-gray-900 font-medium">{p.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Header do paciente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 text-brand-blue flex items-center justify-center font-bold text-xl">
                  {selectedPatient?.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{selectedPatient?.fullName}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {selectedPatient?.dateOfBirth && <span>Nasc: {formatDateBR(selectedPatient.dateOfBirth)}</span>}
                    {selectedPatient?.cpf && <span>CPF: {selectedPatient.cpf}</span>}
                    {selectedPatient?.phone && <span>Tel: {selectedPatient.phone}</span>}
                    {selectedPatient?.email && <span>{selectedPatient.email}</span>}
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => handleSelectPatient('')}>Trocar paciente</Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>
          ) : (
            <div className="space-y-4">

              {/* ── Exames Complementares ── */}
              <Section title="Exames Complementares" count={exams.length} defaultOpen={false}>
                <div className="space-y-2">
                  {exams.map(ex => (
                    <ExamRow key={ex.id} ex={ex} onSave={saveExamEdit} onDelete={removeExam} />
                  ))}

                  {/* Novo exame */}
                  {examDraft ? (
                    <div className="rounded-xl border-2 border-brand-blue border-dashed p-3 space-y-2">
                      <Input label="Descrição *" value={examDraft.description} onChange={e => setExamDraft(d => ({ ...d, description: e.target.value }))} autoFocus />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input label="Data Realização" type="date" value={examDraft.examDate || ''} onChange={e => setExamDraft(d => ({ ...d, examDate: e.target.value }))} />
                        <Input label="Link / Anexo (URL)" value={examDraft.attachmentUrl || ''} onChange={e => setExamDraft(d => ({ ...d, attachmentUrl: e.target.value }))} />
                      </div>
                      <Textarea label="Observações" value={examDraft.notes || ''} onChange={e => setExamDraft(d => ({ ...d, notes: e.target.value }))} rows={2} />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setExamDraft(null)}>Cancelar</Button>
                        <Button variant="primary" onClick={saveExam}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExamDraft({ description: '', examDate: '', attachmentUrl: '', notes: '' })}
                      className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1"
                    >
                      <FiPlus size={14} /> Adicionar exame
                    </button>
                  )}
                </div>
              </Section>

              {/* ── Medicamentos ── */}
              <Section title="Medicamentos" count={medications.length} defaultOpen={false}>
                <div className="space-y-2">
                  {medications.map(med => (
                    <MedRow key={med.id} med={med} onSave={saveMedEdit} onDelete={removeMed} />
                  ))}

                  {medDraft ? (
                    <div className="rounded-xl border-2 border-brand-blue border-dashed p-3 space-y-2">
                      <Input label="Medicação *" value={medDraft.medication} onChange={e => setMedDraft(d => ({ ...d, medication: e.target.value }))} autoFocus />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input label="Data Registro" type="date" value={medDraft.registrationDate || isoToday()} onChange={e => setMedDraft(d => ({ ...d, registrationDate: e.target.value }))} />
                        <Select label="Status" value={medDraft.status || 'ativa'} onChange={e => setMedDraft(d => ({ ...d, status: e.target.value }))}>
                          <option value="ativa">Ativa</option>
                          <option value="interrompida">Interrompida</option>
                        </Select>
                      </div>
                      <Textarea label="Observações" value={medDraft.notes || ''} onChange={e => setMedDraft(d => ({ ...d, notes: e.target.value }))} rows={2} />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setMedDraft(null)}>Cancelar</Button>
                        <Button variant="primary" onClick={saveMed}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setMedDraft({ medication: '', registrationDate: isoToday(), status: 'ativa', notes: '' })}
                      className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1"
                    >
                      <FiPlus size={14} /> Adicionar medicamento
                    </button>
                  )}
                </div>
              </Section>

              {/* ── Conduta & Objetivo Terapêutico ── */}
              <Section title="Conduta & Objetivo Terapêutico" count={conducts.length} defaultOpen={false}>
                <div className="space-y-2">
                  {conducts.map(cd => (
                    <ConductRow
                      key={cd.id}
                      cd={cd}
                      activeTherapists={activeTherapists}
                      getTherapistSpecialties={getTherapistSpecialties}
                      onSave={saveConductEdit}
                      onDelete={removeConduct}
                    />
                  ))}

                  {conductDraft ? (
                    <div className="rounded-xl border-2 border-brand-blue border-dashed p-3 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select label="Terapeuta Responsável *" value={conductDraft.therapistId || ''} onChange={e => setConductDraft(d => ({ ...d, therapistId: e.target.value, specialty: '' }))}>
                          <option value="">Selecione</option>
                          {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </Select>
                        <Select label="Especialidade" value={conductDraft.specialty || ''} onChange={e => setConductDraft(d => ({ ...d, specialty: e.target.value }))}>
                          <option value="">Selecione</option>
                          {getTherapistSpecialties(conductDraft.therapistId).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </Select>
                      </div>
                      <Textarea label="Conduta" value={conductDraft.conduct || ''} onChange={e => setConductDraft(d => ({ ...d, conduct: e.target.value }))} rows={2} />
                      <Textarea label="Objetivo" value={conductDraft.objective || ''} onChange={e => setConductDraft(d => ({ ...d, objective: e.target.value }))} rows={2} />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <Input label="Data Início" type="date" value={conductDraft.startDate || ''} onChange={e => setConductDraft(d => ({ ...d, startDate: e.target.value }))} />
                        <Input label="Data Fim" type="date" value={conductDraft.endDate || ''} onChange={e => setConductDraft(d => ({ ...d, endDate: e.target.value }))} />
                        <Select label="Status" value={conductDraft.status || 'nao_iniciada'} onChange={e => setConductDraft(d => ({ ...d, status: e.target.value }))}>
                          {Object.entries(CONDUCT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </Select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setConductDraft(null)}>Cancelar</Button>
                        <Button variant="primary" onClick={saveConduct}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConductDraft({
                        therapistId: user?.role === 'therapist' ? user.id : '',
                        specialty: '', conduct: '', objective: '',
                        startDate: '', endDate: '', status: 'nao_iniciada',
                      })}
                      className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1"
                    >
                      <FiPlus size={14} /> Adicionar conduta
                    </button>
                  )}
                </div>
              </Section>

              {/* ── Histórico de Atendimentos ── */}
              <Section title="Histórico de Atendimentos" count={patientConsultations.length}>
                {/* Ações em lote (admin) */}
                {user?.role === 'admin' && selectedConsultIds.size > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-brand-blue/5 rounded-xl border border-brand-blue/20">
                    <span className="text-xs text-gray-600 flex-1">{selectedConsultIds.size} selecionado(s)</span>
                    <button
                      onClick={() => batchSetStatus('Faturado')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    >
                      Faturado
                    </button>
                    <button
                      onClick={() => batchSetStatus('Pago')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    >
                      Pago
                    </button>
                    <button
                      onClick={() => setSelectedConsultIds(new Set())}
                      className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Navegação de meses */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setConsultMonth(currentYearMonth())}
                    disabled={isCurrentMonth}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${isCurrentMonth ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'}`}
                  >
                    <FiCalendar size={11} className="inline mr-1" />Mês Corrente
                  </button>
                  <button
                    onClick={() => setConsultMonth(prevMonth(consultMonth))}
                    disabled={!hasPrev}
                    className={`p-1.5 rounded-xl border transition-all ${!hasPrev ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'}`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 px-1">{monthLabel(consultMonth)}</span>
                  <button
                    onClick={() => setConsultMonth(nextMonth(consultMonth))}
                    disabled={isCurrentMonth}
                    className={`p-1.5 rounded-xl border transition-all ${isCurrentMonth ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'}`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>

                {monthConsultations.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum atendimento em {monthLabel(consultMonth)}.</p>
                ) : (
                  <div className="space-y-3">
                    {monthConsultations.map(c => {
                      const therapist = therapists.find(t => t.id === c.therapistId)
                      const status = consultationStatuses.find(s => s.id === c.consultationStatusId)
                      const apptType = appointmentTypes.find(t => t.id === c.appointmentTypeId)
                      const room = rooms.find(r => r.id === c.roomId)
                      const isSelected = selectedConsultIds.has(c.id)
                      return (
                        <div key={c.id} className={`bg-gray-50 rounded-xl px-4 py-3 border transition-colors ${isSelected ? 'border-brand-blue bg-blue-50/30' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            {user?.role === 'admin' && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleConsultSelect(c.id)}
                                className="w-4 h-4 rounded accent-brand-blue shrink-0"
                              />
                            )}
                            <span className="font-medium text-sm text-gray-900">{formatDateShort(c.date)}{c.time && <span className="font-normal text-gray-500"> {c.time}</span>}</span>
                            <Badge specialty={c.specialty} />
                            {status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>{status.name}</span>}
                            {apptType && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">{apptType.name}</span>}
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              {therapist?.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: therapist.color }} />}
                              {therapist?.name || '—'}
                            </span>
                            {room && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                {room.color && <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: room.color }} />}
                                {room.name}
                              </span>
                            )}
                            <button
                              onClick={() => { setEditConsultation(c); setShowConsultationModal(true) }}
                              className="ml-auto p-1 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                            >
                              <FiEdit2 size={13} />
                            </button>
                          </div>
                          {c.mainObjective && (
                            <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{c.mainObjective}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <button
                  onClick={() => { setEditConsultation(null); setShowConsultationModal(true) }}
                  className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-2"
                >
                  <FiPlus size={14} /> Adicionar atendimento
                </button>
              </Section>

            </div>
          )}
        </>
      )}

      {showConsultationModal && (
        <ConsultationFormModal
          onClose={() => setShowConsultationModal(false)}
          initial={editConsultation || (selectedPatientId ? { patientId: selectedPatientId } : {})}
        />
      )}
    </div>
  )
}
