import { useState, useEffect } from 'react'
import { FiTarget, FiSave, FiX, FiEdit2, FiClock, FiAlertCircle } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { SPECIALTIES } from '../../../constants/specialties'
import { formatDateBR } from '../../../utils/dateUtils'

function PlanField({ label, value, field, editing, form, onChange, rows = 3, hint }) {
  if (!editing) {
    return (
      <div className="py-2.5 border-b border-gray-50 last:border-0">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {value || <span className="text-gray-300 italic">Não definido</span>}
        </div>
      </div>
    )
  }
  return (
    <div className="py-2">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {hint && <span className="text-gray-400 font-normal ml-1">({hint})</span>}
      </label>
      <textarea
        value={form[field] || ''}
        onChange={e => onChange(field, e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none resize-none"
        placeholder={`Informe ${label.toLowerCase()}...`}
      />
    </div>
  )
}

function SpecialtyPlan({ patientId, specialty, canEdit }) {
  const { getTherapeuticPlans, saveTherapeuticPlan } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [plan, setPlan] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTherapeuticPlans(patientId).then(plans => {
      if (!plans?.error) {
        const found = (plans || []).find(p => p.specialty === specialty)
        setPlan(found || null)
      }
      setLoaded(true)
    })
  }, [patientId, specialty])

  function startEdit() { setForm(plan || {}); setEditing(true) }
  function setField(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  async function handleSave() {
    setSaving(true)
    const saved = await saveTherapeuticPlan(patientId, specialty, form, user.authId)
    setSaving(false)
    if (!saved?.error) {
      setPlan(saved)
      setEditing(false)
      toast.show('Plano terapêutico salvo!', 'success')
    }
  }

  const sp = SPECIALTIES[specialty]
  const hasContent = plan && (
    plan.generalObjectives || plan.specificObjectives ||
    plan.attendanceFrequency || plan.interventionStrategy
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header da especialidade */}
      <div className={`px-5 py-3 flex items-center justify-between ${sp?.bgColor || 'bg-gray-50'}`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${sp?.textColor || 'text-gray-700'}`}>
            {sp?.label || specialty}
          </span>
          {!hasContent && loaded && (
            <span className="text-xs bg-white/60 text-gray-500 px-2 py-0.5 rounded-full">Sem plano definido</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {plan?.updatedAt && (
            <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1">
              <FiClock size={11} />
              {plan.updatedByName ? `${plan.updatedByName} · ` : ''}{formatDateBR(plan.updatedAt?.slice(0, 10))}
            </span>
          )}
          {!editing && canEdit && (
            <button onClick={startEdit} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/60 transition-colors">
              <FiEdit2 size={14} />
            </button>
          )}
          {editing && (
            <div className="flex gap-1">
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-white/60 transition-colors">
                <FiX size={14} />
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-brand-blue rounded-lg text-xs font-medium hover:bg-white/80 disabled:opacity-60 transition-colors shadow-sm">
                <FiSave size={12} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-5 py-4">
        {!canEdit && !hasContent && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <FiAlertCircle size={13} />
            Plano ainda não preenchido pelo terapeuta desta especialidade.
          </div>
        )}
        <div className="space-y-0.5">
          <PlanField
            label="Objetivos Gerais"
            value={plan?.generalObjectives}
            field="generalObjectives"
            editing={editing} form={form} onChange={setField}
            rows={3}
          />
          <PlanField
            label="Objetivos Específicos"
            value={plan?.specificObjectives}
            field="specificObjectives"
            editing={editing} form={form} onChange={setField}
            rows={4}
            hint="liste um por linha"
          />
          <PlanField
            label="Frequência de Atendimento"
            value={plan?.attendanceFrequency}
            field="attendanceFrequency"
            editing={editing} form={form} onChange={setField}
            rows={1}
            hint="ex: 2x por semana, 50 min"
          />
          <PlanField
            label="Estratégia de Intervenção"
            value={plan?.interventionStrategy}
            field="interventionStrategy"
            editing={editing} form={form} onChange={setField}
            rows={3}
          />
          <PlanField
            label="Revisões e Mudanças de Estratégia"
            value={plan?.revisionNotes}
            field="revisionNotes"
            editing={editing} form={form} onChange={setField}
            rows={2}
            hint="registre revisões com data"
          />
        </div>
      </div>
    </div>
  )
}

export default function PlanoTerapeuticoTab({ patientId, patientSpecialties }) {
  const { user } = useAuth()
  const { therapists } = useData()

  // Terapeuta pode editar apenas a sua especialidade; admin edita tudo
  const myTherapist = therapists.find(t => t.userId === user?.authId)
  const isAdmin = user?.role === 'admin'

  const specialties = patientSpecialties?.length ? patientSpecialties : []

  if (!specialties.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
        <FiTarget size={32} className="mx-auto mb-3 opacity-40" />
        <p>Nenhuma especialidade vinculada ao paciente.</p>
        <p className="text-xs mt-1">Edite o cadastro do paciente para adicionar especialidades.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <FiTarget size={16} className="text-brand-blue" />
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Plano Terapêutico por Especialidade</h3>
          <p className="text-xs text-gray-400 mt-0.5">Cada terapeuta edita apenas sua especialidade</p>
        </div>
      </div>
      {specialties.map(specialty => (
        <SpecialtyPlan
          key={specialty}
          patientId={patientId}
          specialty={specialty}
          canEdit={isAdmin || myTherapist?.specialty === specialty}
        />
      ))}
    </div>
  )
}
