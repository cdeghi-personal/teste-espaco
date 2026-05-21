import { useState, useEffect } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { generateSeriesDates } from '../../../utils/dateUtils'

const WEEKDAYS_OPTS = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 7, label: 'Dom' },
]

const EMPTY = {
  therapistId: '',
  blockType: 'TOTAL',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  recurrent: false,
  recurrenceDays: [],
  recurrenceType: 'by_date',
  endDate: '',
  sessionCount: '',
}

function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function hasTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB
}

export default function CalendarBlockFormModal({ onClose, initial = {} }) {
  const { therapists, consultations, addCalendarBlock, addCalendarBlockSeries, updateCalendarBlock, updateCalendarBlockSeriesFuture, cancelCalendarBlock, cancelCalendarBlockSeriesFuture } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!initial.id
  const hasSeries = isEdit && !!initial.seriesId

  const activeTherapists = therapists.filter(t => t.active !== false)

  const [form, setForm] = useState({
    ...EMPTY,
    therapistId: !isAdmin && user?.id ? user.id : '',
    ...initial,
    // Map camelCase block fields to form fields
    blockType: initial.blockType || 'TOTAL',
    description: initial.description || '',
    date: initial.date || '',
    startTime: initial.startTime || '',
    endTime: initial.endTime || '',
    recurrent: false,
    recurrenceDays: [],
    recurrenceType: 'by_date',
    endDate: '',
    sessionCount: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [consultationConflicts, setConsultationConflicts] = useState([])
  const [confirmedOverlap, setConfirmedOverlap] = useState(false)
  // Scope dialog for series edits
  const [showScopeDialog, setShowScopeDialog] = useState(false)
  // Cancel confirmation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
    setConsultationConflicts([])
    setConfirmedOverlap(false)
  }

  function toggleWeekday(day) {
    setForm(f => ({
      ...f,
      recurrenceDays: (f.recurrenceDays || []).includes(day)
        ? (f.recurrenceDays || []).filter(d => d !== day)
        : [...(f.recurrenceDays || []), day].sort((a, b) => a - b),
    }))
    setConsultationConflicts([])
    setConfirmedOverlap(false)
  }

  function validate() {
    const e = {}
    if (!form.therapistId) e.therapistId = 'Selecione o terapeuta'
    if (!form.blockType) e.blockType = 'Obrigatório'
    if (!form.date) e.date = 'Data obrigatória'
    if (!form.startTime) e.startTime = 'Horário início obrigatório'
    if (!form.endTime) e.endTime = 'Horário fim obrigatório'
    if (form.startTime && form.endTime && form.startTime >= form.endTime) {
      e.endTime = 'Horário fim deve ser após o início'
    }
    if (!isEdit && form.recurrent) {
      if (!form.recurrenceDays || form.recurrenceDays.length === 0) {
        e.recurrenceDays = 'Selecione ao menos um dia da semana'
      }
      if (form.recurrenceType === 'by_date' && !form.endDate) {
        e.endDate = 'Data de término obrigatória'
      }
      if (form.recurrenceType === 'by_count' && (!form.sessionCount || parseInt(form.sessionCount) < 1)) {
        e.sessionCount = 'Informe o número de ocorrências'
      }
    }
    return e
  }

  function checkConsultationConflicts(datesToCheck) {
    const startMins = timeToMinutes(form.startTime)
    const endMins   = timeToMinutes(form.endTime)
    if (startMins === null || endMins === null) return []

    const overlapping = []
    for (const date of datesToCheck) {
      const dayConsultations = consultations.filter(c =>
        c.date === date &&
        c.therapistId === form.therapistId &&
        c.time
      )
      for (const c of dayConsultations) {
        const cStart = timeToMinutes(c.time)
        if (cStart === null) continue
        const cEnd = cStart + 50 // CONFLICT_DURATION
        if (hasTimeOverlap(startMins, endMins, cStart, cEnd)) {
          overlapping.push({ ...c, checkDate: date })
        }
      }
    }
    return overlapping
  }

  async function handleSave(scopeChoice) {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    // Determine dates to check for consultation conflicts
    let datesToCheck = [form.date]
    if (!isEdit && form.recurrent) {
      datesToCheck = generateSeriesDates({
        recurrenceType: form.recurrenceType,
        recurrenceDays: form.recurrenceDays,
        startDate: form.date,
        endDate: form.recurrenceType === 'by_date' ? form.endDate : undefined,
        sessionCount: form.recurrenceType === 'by_count' ? parseInt(form.sessionCount) : undefined,
      })
    }

    if (!confirmedOverlap) {
      const conflicts = checkConsultationConflicts(datesToCheck)
      if (conflicts.length > 0) {
        setConsultationConflicts(conflicts)
        return // show warning, wait for user confirmation
      }
    }

    setLoading(true)
    try {
      if (isEdit) {
        // Series scope editing
        if (hasSeries && scopeChoice === 'future') {
          await updateCalendarBlockSeriesFuture(initial.seriesId, initial.date, {
            blockType: form.blockType,
            description: form.description,
            startTime: form.startTime,
            endTime: form.endTime,
          })
        } else {
          await updateCalendarBlock(initial.id, {
            blockType: form.blockType,
            description: form.description,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            isSeriesException: hasSeries ? true : undefined,
          })
        }
        toast.show('Bloqueio atualizado com sucesso!', 'success')
        onClose()
      } else if (form.recurrent) {
        const result = await addCalendarBlockSeries({
          therapistId: form.therapistId,
          blockType: form.blockType,
          description: form.description,
          startTime: form.startTime,
          endTime: form.endTime,
          recurrenceType: form.recurrenceType,
          recurrenceDays: form.recurrenceDays,
          startDate: form.date,
          endDate: form.recurrenceType === 'by_date' ? form.endDate : undefined,
          sessionCount: form.recurrenceType === 'by_count' ? parseInt(form.sessionCount) : undefined,
        })
        if (result?.error) { toast.show(result.error); return }
        toast.show(`${result.count} bloqueio(s) criado(s) com sucesso!`, 'success')
        onClose()
      } else {
        const result = await addCalendarBlock({
          therapistId: form.therapistId,
          blockType: form.blockType,
          description: form.description,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
        })
        if (result?.error) { toast.show(result.error); return }
        toast.show('Bloqueio criado com sucesso!', 'success')
        onClose()
      }
    } catch (err) {
      toast.show(err.message || 'Erro ao salvar bloqueio')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(scopeChoice) {
    setLoading(true)
    try {
      if (hasSeries && scopeChoice === 'future') {
        await cancelCalendarBlockSeriesFuture(initial.seriesId, initial.date)
        toast.show('Bloqueios futuros cancelados.', 'success')
      } else {
        await cancelCalendarBlock(initial.id)
        toast.show('Bloqueio cancelado.', 'success')
      }
      onClose()
    } catch (err) {
      toast.show(err.message || 'Erro ao cancelar bloqueio')
    } finally {
      setLoading(false)
    }
  }

  function onSaveClick() {
    if (isEdit && hasSeries) {
      setShowScopeDialog('save')
      return
    }
    handleSave('single')
  }

  function onCancelBlockClick() {
    if (isEdit && hasSeries) {
      setShowScopeDialog('cancel')
      return
    }
    setShowCancelConfirm(true)
  }

  // Scope dialog for series
  if (showScopeDialog) {
    const isCancel = showScopeDialog === 'cancel'
    return (
      <Modal
        title={isCancel ? 'Cancelar bloqueio da série' : 'Editar bloqueio da série'}
        onClose={() => setShowScopeDialog(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowScopeDialog(false)}>Voltar</Button>
            <Button
              variant={isCancel ? 'danger' : 'primary'}
              onClick={() => { setShowScopeDialog(false); isCancel ? handleCancel('single') : handleSave('single') }}
              disabled={loading}
            >
              Apenas este
            </Button>
            <Button
              variant={isCancel ? 'danger' : 'primary'}
              onClick={() => { setShowScopeDialog(false); isCancel ? handleCancel('future') : handleSave('future') }}
              disabled={loading}
            >
              Este e os próximos
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          {isCancel
            ? 'Este bloqueio faz parte de uma série. Deseja cancelar apenas este ou todos os futuros?'
            : 'Este bloqueio faz parte de uma série. Deseja salvar apenas este ou todos os futuros?'}
        </p>
      </Modal>
    )
  }

  // Cancel confirmation for single block
  if (showCancelConfirm) {
    return (
      <Modal
        title="Cancelar bloqueio"
        onClose={() => setShowCancelConfirm(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCancelConfirm(false)}>Voltar</Button>
            <Button variant="danger" onClick={() => handleCancel('single')} disabled={loading}>
              {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">Deseja cancelar este bloqueio? Esta ação não pode ser desfeita.</p>
      </Modal>
    )
  }

  return (
    <Modal
      title={isEdit ? 'Editar Bloqueio de Agenda' : 'Novo Bloqueio de Agenda'}
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {isEdit && isAdmin && (
              <Button variant="danger" onClick={onCancelBlockClick} disabled={loading}>
                Cancelar Bloqueio
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button variant="primary" onClick={onSaveClick} disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : (form.recurrent ? 'Criar Série' : 'Criar Bloqueio')}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Terapeuta */}
        {isAdmin ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Terapeuta *</label>
            <select
              value={form.therapistId}
              onChange={e => set('therapistId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
              disabled={isEdit}
            >
              <option value="">Selecione o terapeuta</option>
              {activeTherapists.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {errors.therapistId && <p className="text-xs text-red-500 mt-1">{errors.therapistId}</p>}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
            <span className="font-medium">Terapeuta: </span>
            {therapists.find(t => t.id === form.therapistId)?.name || '—'}
          </div>
        )}

        {/* Tipo de bloqueio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Bloqueio *</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set('blockType', 'TOTAL')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                form.blockType === 'TOTAL'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              Total (dia inteiro)
            </button>
            <button
              type="button"
              onClick={() => set('blockType', 'PARTIAL')}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                form.blockType === 'PARTIAL'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              Parcial (horário)
            </button>
          </div>
        </div>

        {/* Descrição/Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo / Descrição</label>
          <input
            type="text"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Ex: Férias, Curso, Evento..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {form.recurrent ? 'Data de início *' : 'Data *'}
          </label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
        </div>

        {/* Horários */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário Início *</label>
            <input
              type="time"
              value={form.startTime}
              onChange={e => set('startTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
            />
            {errors.startTime && <p className="text-xs text-red-500 mt-1">{errors.startTime}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário Fim *</label>
            <input
              type="time"
              value={form.endTime}
              onChange={e => set('endTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
            />
            {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
          </div>
        </div>

        {/* Recorrência — somente na criação */}
        {!isEdit && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurrent"
                checked={form.recurrent}
                onChange={e => set('recurrent', e.target.checked)}
                className="w-4 h-4 rounded accent-brand-blue"
              />
              <label htmlFor="recurrent" className="text-sm font-medium text-gray-700">Recorrente (criar série)</label>
            </div>

            {form.recurrent && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Dias da semana *</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAYS_OPTS.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleWeekday(d.value)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          (form.recurrenceDays || []).includes(d.value)
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {errors.recurrenceDays && <p className="text-xs text-red-500 mt-1">{errors.recurrenceDays}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Termina</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => set('recurrenceType', 'by_date')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        form.recurrenceType === 'by_date'
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      Em uma data
                    </button>
                    <button
                      type="button"
                      onClick={() => set('recurrenceType', 'by_count')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all ${
                        form.recurrenceType === 'by_count'
                          ? 'bg-brand-blue text-white border-brand-blue'
                          : 'bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      Por ocorrências
                    </button>
                  </div>
                </div>

                {form.recurrenceType === 'by_date' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data de término *</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => set('endDate', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
                    />
                    {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                  </div>
                )}

                {form.recurrenceType === 'by_count' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Número de ocorrências *</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={form.sessionCount}
                      onChange={e => set('sessionCount', e.target.value)}
                      placeholder="Ex: 12"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
                    />
                    {errors.sessionCount && <p className="text-xs text-red-500 mt-1">{errors.sessionCount}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Consultas conflitantes — aviso inline */}
        {consultationConflicts.length > 0 && !confirmedOverlap && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <FiAlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Atendimentos no mesmo horário</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {consultationConflicts.length} atendimento(s) agendado(s) se sobrepõem a este bloqueio.
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {consultationConflicts.slice(0, 5).map(c => (
                    <li key={`${c.id}-${c.checkDate}`} className="text-xs text-amber-700">
                      • {c.checkDate?.split('-').reverse().join('/')} às {c.time?.slice(0, 5) || '—'}
                    </li>
                  ))}
                  {consultationConflicts.length > 5 && (
                    <li className="text-xs text-amber-600">...e mais {consultationConflicts.length - 5}</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConsultationConflicts([])}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-amber-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setConfirmedOverlap(true); handleSave('single') }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
              >
                Criar mesmo assim
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
