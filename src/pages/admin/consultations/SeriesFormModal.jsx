import { useState, useMemo } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { isoToday, generateSeriesDates } from '../../../utils/dateUtils'
import { detectSeriesConflicts, buildConflictTooltip } from '../../../utils/conflictUtils'

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
]

export default function SeriesFormModal({ onClose }) {
  const { patients, therapists, specialtiesData, rooms, consultationStatuses, appointmentTypes, addConsultationSeries, consultations, calendarBlocks } = useData()
  const { user } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({
    patientId: '',
    primaryTherapistId: user?.id || '',
    specialty: '',
    consultationStatusId: '',
    appointmentTypeId: '',
    roomId: '',
    time: '',
    recurrenceType: 'by_count',
    recurrenceDays: [1],
    startDate: isoToday(),
    sessionCount: 10,
    endDate: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [seriesConflicts, setSeriesConflicts] = useState([]) // [{date, conflicts[]}]
  const [showConflictWarning, setShowConflictWarning] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function toggleDay(val) {
    setForm(f => ({
      ...f,
      recurrenceDays: f.recurrenceDays.includes(val)
        ? f.recurrenceDays.filter(d => d !== val)
        : [...f.recurrenceDays, val].sort((a, b) => a - b),
    }))
    setErrors(e => ({ ...e, recurrenceDays: undefined }))
  }

  const activePatients = useMemo(
    () => (patients || []).filter(p => !p.deleted).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [patients]
  )
  const isAdmin = user?.role === 'admin'
  const isAdminOrTeam = isAdmin || user?.belongsToTeam

  const activeTherapists = useMemo(
    () => (therapists || []).filter(t => t.active !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [therapists]
  )
  const activeRooms = useMemo(() => (rooms || []).filter(r => r.active !== false), [rooms])
  const activeStatuses = useMemo(
    () => (consultationStatuses || []).filter(s => s.active !== false && !s.automatic),
    [consultationStatuses]
  )
  const activeAppointmentTypes = useMemo(
    () => (appointmentTypes || []).filter(t => t.active !== false),
    [appointmentTypes]
  )

  // Especialidades do terapeuta selecionado
  const therapistSpecialties = useMemo(() => {
    const t = activeTherapists.find(t => t.id === form.primaryTherapistId)
    if (!t) return (specialtiesData || []).filter(s => s.active !== false)
    const keys = (t.therapistSpecialties || []).map(ts => ts.specialty)
    return (specialtiesData || []).filter(s => s.active !== false && keys.includes(s.key))
  }, [form.primaryTherapistId, activeTherapists, specialtiesData])

  // Quantidade de sessões que serão criadas (preview)
  const previewDates = useMemo(() => {
    if (!form.startDate || form.recurrenceDays.length === 0) return []
    if (form.recurrenceType === 'by_count' && !(Number(form.sessionCount) >= 1)) return []
    if (form.recurrenceType === 'by_date' && !form.endDate) return []
    try {
      return generateSeriesDates({
        recurrenceType: form.recurrenceType,
        recurrenceDays: form.recurrenceDays,
        startDate: form.startDate,
        endDate: form.endDate,
        sessionCount: Number(form.sessionCount),
      })
    } catch { return [] }
  }, [form.recurrenceType, form.recurrenceDays, form.startDate, form.endDate, form.sessionCount])

  const today = isoToday()
  const hasPastDates = previewDates.some(d => d < today)

  function validate() {
    const e = {}
    if (!form.patientId) e.patientId = 'Selecione o paciente'
    if (!form.primaryTherapistId) e.primaryTherapistId = 'Selecione o terapeuta'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!form.time) e.time = 'Informe o horário'
    if (form.recurrenceDays.length === 0) e.recurrenceDays = 'Selecione ao menos um dia da semana'
    if (!form.startDate) e.startDate = 'Informe a data inicial'
    if (form.recurrenceType === 'by_count') {
      if (!Number(form.sessionCount) || Number(form.sessionCount) < 1) e.sessionCount = 'Informe a quantidade de sessões'
      if (Number(form.sessionCount) > 200) e.sessionCount = 'Máximo de 200 sessões por série'
    } else {
      if (!form.endDate) e.endDate = 'Informe a data final'
      if (form.endDate && form.endDate < form.startDate) e.endDate = 'A data final deve ser após a data inicial'
    }
    if (previewDates.length === 0 && Object.keys(e).length === 0) {
      e.recurrenceDays = 'Nenhuma sessão será gerada com estes parâmetros'
    }
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    // Detecta conflitos em todas as datas da série
    if (!showConflictWarning) {
      const detected = detectSeriesConflicts(form, previewDates, consultations, calendarBlocks)
      if (detected.length > 0) {
        setSeriesConflicts(detected)
        setShowConflictWarning(true)
        return
      }
    }

    setSaving(true)
    try {
      const result = await addConsultationSeries({
        patientId:             form.patientId,
        primaryTherapistId:    form.primaryTherapistId,
        specialty:             form.specialty,
        consultationStatusId:  form.consultationStatusId || null,
        appointmentTypeId:     form.appointmentTypeId || null,
        roomId:                form.roomId || null,
        time:                  form.time,
        eventType:             'SESSION',
        interviewFormat:       null,
        meetingPlatform:       null,
        meetingLink:           null,
        intervieweeName:       null,
        recurrenceType:        form.recurrenceType,
        recurrenceDays:        form.recurrenceDays,
        startDate:             form.startDate,
        endDate:               form.endDate || null,
        sessionCount:          Number(form.sessionCount) || null,
        notes:                 form.notes || null,
        conflictsPerDate:      seriesConflicts,
      })
      if (result?.error) {
        toast.show(result.error, 'error')
      } else {
        toast.show(`Série criada com ${result.count} atendimento${result.count !== 1 ? 's' : ''}.`, 'success')
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Criar Série Recorrente"
      onClose={onClose}
      size="xl"
      footer={
        showConflictWarning
          ? <>
              <Button variant="ghost" onClick={() => { setShowConflictWarning(false); setSeriesConflicts([]) }}>Cancelar</Button>
              <Button variant="danger" onClick={handleSave} disabled={saving}>
                {saving ? 'Criando...' : 'Criar mesmo assim'}
              </Button>
            </>
          : <>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Criando...' : `Criar Série${previewDates.length > 0 ? ` (${previewDates.length} atend.)` : ''}`}
              </Button>
            </>
      }
    >
      <div className="space-y-6">

        {/* Aviso de conflitos */}
        {showConflictWarning && seriesConflicts.length > 0 && (
          <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <span>⚠️</span>
              <span>Conflitos encontrados em {seriesConflicts.length} data{seriesConflicts.length !== 1 ? 's' : ''} da série:</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto text-xs text-amber-800">
              {seriesConflicts.map(({ date, conflicts }) => (
                <div key={date}>
                  <div className="font-medium">{date.split('-').reverse().join('/')}</div>
                  <ul className="pl-3 space-y-0.5">
                    {conflicts.map((c, i) => (
                      <li key={i}>• {buildConflictTooltip([c], { therapists, rooms, patients, consultations, calendarBlocks })}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700">Deseja criar a série mesmo assim?</p>
          </div>
        )}

        {/* Aviso de datas passadas */}
        {hasPastDates && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <span className="shrink-0 mt-0.5">⚠️</span>
            Algumas datas geradas estão no passado. Elas serão criadas assim mesmo — edite ou exclua individualmente se necessário.
          </div>
        )}

        {/* Paciente e Terapeuta */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Paciente e Terapeuta
          </h3>
          <div className="space-y-3">
            <Select label="Paciente *" value={form.patientId} onChange={e => set('patientId', e.target.value)} error={errors.patientId}>
              <option value="">Selecione o paciente</option>
              {activePatients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </Select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Terapeuta Principal *"
                value={form.primaryTherapistId}
                onChange={e => { set('primaryTherapistId', e.target.value); set('specialty', '') }}
                error={errors.primaryTherapistId}
                disabled={!isAdminOrTeam}
              >
                <option value="">Selecione</option>
                {activeTherapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              <Select
                label="Especialidade *"
                value={form.specialty}
                onChange={e => set('specialty', e.target.value)}
                error={errors.specialty}
                disabled={!form.primaryTherapistId}
              >
                <option value="">Selecione</option>
                {therapistSpecialties.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </div>
          </div>
        </section>

        {/* Configuração do Atendimento */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Configuração do Atendimento
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Horário *" type="time" value={form.time} onChange={e => set('time', e.target.value)} error={errors.time} />
              <Select label="Sala" value={form.roomId} onChange={e => set('roomId', e.target.value)}>
                <option value="">Sem sala</option>
                {activeRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
              <Select label="Tipo de Atendimento" value={form.appointmentTypeId} onChange={e => set('appointmentTypeId', e.target.value)}>
                <option value="">Selecione</option>
                {activeAppointmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </div>
            <Select label="Status Inicial (opcional)" value={form.consultationStatusId} onChange={e => set('consultationStatusId', e.target.value)}>
              <option value="">Sem status definido</option>
              {activeStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </section>

        {/* Recorrência */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Recorrência
          </h3>
          <div className="space-y-4">

            {/* Dias da semana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias da semana *
              </label>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`w-11 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.recurrenceDays.includes(d.value)
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {errors.recurrenceDays && (
                <p className="text-xs text-red-500 mt-1">{errors.recurrenceDays}</p>
              )}
            </div>

            {/* Data inicial + tipo de término */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Data inicial *"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                error={errors.startDate}
              />
              {/* Tipo de término */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => set('recurrenceType', 'by_count')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      form.recurrenceType === 'by_count'
                        ? 'bg-brand-blue text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Nº de sessões
                  </button>
                  <button
                    type="button"
                    onClick={() => set('recurrenceType', 'by_date')}
                    className={`flex-1 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${
                      form.recurrenceType === 'by_date'
                        ? 'bg-brand-blue text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Data final
                  </button>
                </div>
              </div>
            </div>

            {form.recurrenceType === 'by_count' ? (
              <Input
                label="Número de sessões *"
                type="number"
                min="1"
                max="200"
                value={form.sessionCount}
                onChange={e => set('sessionCount', e.target.value)}
                error={errors.sessionCount}
              />
            ) : (
              <Input
                label="Data final *"
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                error={errors.endDate}
                min={form.startDate}
              />
            )}

            {/* Preview */}
            {previewDates.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <span className="font-semibold">{previewDates.length}</span>
                <span>atendimento{previewDates.length !== 1 ? 's' : ''} serão criados</span>
                <span className="text-blue-400 text-xs ml-auto">
                  {previewDates[0].split('-').reverse().join('/')} → {previewDates[previewDates.length - 1].split('-').reverse().join('/')}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Observações */}
        <section>
          <Textarea
            label="Observações (opcional)"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Anotações sobre a série..."
            rows={2}
          />
        </section>

      </div>
    </Modal>
  )
}
