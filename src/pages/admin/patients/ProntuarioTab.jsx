import { useState, useEffect } from 'react'
import { FiEdit2, FiSave, FiX, FiUser, FiBookOpen, FiClipboard, FiClock } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { SPECIALTIES, SPECIALTY_LIST } from '../../../constants/specialties'
import { formatDateBR } from '../../../utils/dateUtils'

// ─── Componente de campo editável em bloco ────────────────────────────────────
function EditableSection({ title, icon: Icon, children, onEdit, onSave, onCancel, editing, saving, lastUpdated, updatedByName }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-brand-blue" />}
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
              <FiClock size={11} />
              {updatedByName ? `${updatedByName} · ` : ''}{formatDateBR(lastUpdated?.slice(0, 10))}
            </span>
          )}
          {editing ? (
            <div className="flex gap-1">
              <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <FiX size={15} />
              </button>
              <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-medium hover:bg-brand-blue-dark disabled:opacity-60 transition-colors">
                <FiSave size={13} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          ) : (
            <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
              <FiEdit2 size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FieldRow({ label, value, editing, field, form, onChange, type = 'textarea', rows = 3 }) {
  if (!editing) {
    return (
      <div className="py-2 border-b border-gray-50 last:border-0">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{value || <span className="text-gray-300 italic">Não informado</span>}</div>
      </div>
    )
  }
  return (
    <div className="py-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {type === 'date' ? (
        <input
          type="date"
          value={form[field] || ''}
          onChange={e => onChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
        />
      ) : (
        <textarea
          value={form[field] || ''}
          onChange={e => onChange(field, e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none resize-none"
          placeholder={`Informe ${label.toLowerCase()}...`}
        />
      )}
    </div>
  )
}

// ─── Seção: Contexto Familiar ─────────────────────────────────────────────────
function FamilyContextSection({ patientId }) {
  const { getFamilyContext, saveFamilyContext } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getFamilyContext(patientId).then(d => {
      setData(d)
      setForm(d || {})
    })
  }, [patientId])

  function startEdit() { setForm(data || {}); setEditing(true) }
  function cancelEdit() { setEditing(false) }
  function setField(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    setSaving(true)
    const saved = await saveFamilyContext(patientId, form, user.authId)
    setSaving(false)
    if (!saved?.error) {
      setData(saved)
      setEditing(false)
      toast.show('Contexto familiar salvo!', 'success')
    }
  }

  return (
    <EditableSection
      title="Contexto Familiar e Escolar"
      icon={FiUser}
      editing={editing}
      saving={saving}
      onEdit={startEdit}
      onSave={handleSave}
      onCancel={cancelEdit}
      lastUpdated={data?.updatedAt}
      updatedByName={data?.updatedByName}
    >
      <div className="space-y-0.5">
        <FieldRow label="Composição Familiar" value={data?.familyComposition} field="familyComposition" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Relação com os Responsáveis" value={data?.guardianRelationship} field="guardianRelationship" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Rotina da Criança" value={data?.dailyRoutine} field="dailyRoutine" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Contexto Escolar" value={data?.schoolContext} field="schoolContext" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Ambiente Familiar" value={data?.familyEnvironment} field="familyEnvironment" editing={editing} form={form} onChange={setField} rows={2} />
      </div>
    </EditableSection>
  )
}

// ─── Seção: Histórico Clínico ─────────────────────────────────────────────────
function ClinicalHistorySection({ patientId }) {
  const { getClinicalHistory, saveClinicalHistory } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClinicalHistory(patientId).then(d => {
      setData(d)
      setForm(d || {})
    })
  }, [patientId])

  function startEdit() { setForm(data || {}); setEditing(true) }
  function cancelEdit() { setEditing(false) }
  function setField(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    setSaving(true)
    const saved = await saveClinicalHistory(patientId, form, user.authId)
    setSaving(false)
    if (!saved?.error) {
      setData(saved)
      setEditing(false)
      toast.show('Histórico clínico salvo!', 'success')
    }
  }

  return (
    <EditableSection
      title="Histórico Clínico"
      icon={FiBookOpen}
      editing={editing}
      saving={saving}
      onEdit={startEdit}
      onSave={handleSave}
      onCancel={cancelEdit}
      lastUpdated={data?.updatedAt}
      updatedByName={data?.updatedByName}
    >
      <div className="space-y-0.5">
        <FieldRow label="Queixa Principal" value={data?.mainComplaint} field="mainComplaint" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Hipóteses Diagnósticas" value={data?.diagnosticHypotheses} field="diagnosticHypotheses" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Comorbidades" value={data?.comorbidities} field="comorbidities" editing={editing} form={form} onChange={setField} rows={2} />
        <FieldRow label="Medicamentos em Uso" value={data?.currentMedications} field="currentMedications" editing={editing} form={form} onChange={setField} rows={2} />
        <FieldRow label="Histórico Médico Relevante" value={data?.medicalHistory} field="medicalHistory" editing={editing} form={form} onChange={setField} />
        <FieldRow label="Histórico Terapêutico Anterior" value={data?.previousTherapyHistory} field="previousTherapyHistory" editing={editing} form={form} onChange={setField} />
      </div>
    </EditableSection>
  )
}

// ─── Seção: Avaliações Iniciais ───────────────────────────────────────────────
function AssessmentsSection({ patientId, patientSpecialties }) {
  const { getAssessments, saveAssessment, therapists } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [assessments, setAssessments] = useState([])
  const [editingSpecialty, setEditingSpecialty] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const specialties = patientSpecialties?.length ? patientSpecialties : SPECIALTY_LIST

  useEffect(() => {
    getAssessments(patientId).then(d => {
      if (!d?.error) setAssessments(d || [])
    })
  }, [patientId])

  function getAssessment(specialty) {
    return assessments.find(a => a.specialty === specialty)
  }

  function startEdit(specialty) {
    const existing = getAssessment(specialty)
    setForm(existing || { assessmentDate: new Date().toISOString().slice(0, 10) })
    setEditingSpecialty(specialty)
  }

  function setField(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave(specialty) {
    setSaving(true)
    const therapist = therapists.find(t => t.userId === user.authId)
    const saved = await saveAssessment(patientId, specialty, form, therapist?.id || null)
    setSaving(false)
    if (!saved?.error) {
      setAssessments(prev => {
        const exists = prev.find(a => a.specialty === specialty)
        return exists ? prev.map(a => a.specialty === specialty ? saved : a) : [...prev, saved]
      })
      setEditingSpecialty(null)
      toast.show('Avaliação salva!', 'success')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <FiClipboard size={16} className="text-brand-blue" />
        <h3 className="font-semibold text-gray-900 text-sm">Avaliações Iniciais por Especialidade</h3>
      </div>
      {specialties.map(specialty => {
        const sp = SPECIALTIES[specialty]
        const existing = getAssessment(specialty)
        const isEditing = editingSpecialty === specialty
        return (
          <EditableSection
            key={specialty}
            title={sp?.label || specialty}
            editing={isEditing}
            saving={saving}
            onEdit={() => startEdit(specialty)}
            onSave={() => handleSave(specialty)}
            onCancel={() => setEditingSpecialty(null)}
            lastUpdated={existing?.updatedAt}
            updatedByName={existing?.therapistName}
          >
            <div className="space-y-0.5">
              {isEditing && (
                <FieldRow label="Data da Avaliação" value={form.assessmentDate} field="assessmentDate" editing={true} form={form} onChange={setField} type="date" />
              )}
              {!isEditing && existing?.assessmentDate && (
                <div className="py-1 mb-2">
                  <span className="text-xs text-gray-400">Avaliado em {formatDateBR(existing.assessmentDate)}</span>
                </div>
              )}
              <FieldRow label="Queixa Principal (nesta especialidade)" value={existing?.mainComplaint} field="mainComplaint" editing={isEditing} form={form} onChange={setField} rows={2} />
              <FieldRow label="Objetivos Iniciais" value={existing?.initialObjectives} field="initialObjectives" editing={isEditing} form={form} onChange={setField} />
              <FieldRow label="Escalas / Testes Aplicados" value={existing?.appliedTests} field="appliedTests" editing={isEditing} form={form} onChange={setField} rows={2} />
              <FieldRow label="Observações Clínicas Iniciais" value={existing?.clinicalObservations} field="clinicalObservations" editing={isEditing} form={form} onChange={setField} />
            </div>
          </EditableSection>
        )
      })}
    </div>
  )
}

// ─── Tab Principal ────────────────────────────────────────────────────────────
export default function ProntuarioTab({ patientId, patientSpecialties }) {
  return (
    <div className="space-y-5">
      <FamilyContextSection patientId={patientId} />
      <ClinicalHistorySection patientId={patientId} />
      <AssessmentsSection patientId={patientId} patientSpecialties={patientSpecialties} />
    </div>
  )
}
