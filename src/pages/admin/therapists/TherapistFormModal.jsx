import { useState, useEffect } from 'react'
import { FiMail, FiCheck, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'

const EMPTY_SPEC = { specialty: '', credential: '', canBeRt: false }

const EMPTY = {
  name: '', email: '', phone: '', cpf: '',
  therapistSpecialties: [{ ...EMPTY_SPEC }],
  bank: '', agency: '', accountNumber: '', pixKey: '',
  color: '#6b7280', active: true, belongsToTeam: false,
}

const WEEKDAYS_OPTS = [
  { value: 1, label: 'Seg' }, { value: 2, label: 'Ter' }, { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' }, { value: 5, label: 'Sex' }, { value: 6, label: 'Sáb' }, { value: 7, label: 'Dom' },
]

function UnavailForm({ value, onSave, onCancel }) {
  const [form, setForm] = useState({ ...value })
  const [errors, setErrors] = useState({})

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function toggleWeekday(day) {
    setForm(f => ({
      ...f,
      weekdays: (f.weekdays || []).includes(day)
        ? (f.weekdays || []).filter(d => d !== day)
        : [...(f.weekdays || []), day].sort((a, b) => a - b),
    }))
  }

  function validate() {
    const e = {}
    if (!form.unavailableType) e.unavailableType = 'Obrigatório'
    if (!form.startDate) e.startDate = 'Obrigatório'
    if (form.endDate && form.endDate < form.startDate) e.endDate = 'Deve ser após a data inicial'
    if (form.unavailableType === 'PARTIAL') {
      if (!form.startTime) e.startTime = 'Obrigatório para parcial'
      if (!form.endTime) e.endTime = 'Obrigatório para parcial'
    }
    return e
  }

  function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  return (
    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
          <select
            value={form.unavailableType}
            onChange={e => set('unavailableType', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          >
            <option value="TOTAL">Total (dia inteiro)</option>
            <option value="PARTIAL">Parcial (horário)</option>
          </select>
          {errors.unavailableType && <p className="text-xs text-red-500">{errors.unavailableType}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
          <input
            type="text"
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            placeholder="Ex: Férias, Aula..."
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Data inicial *</label>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
          {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Data final (opcional)</label>
          <input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
          {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
        </div>
      </div>
      {form.unavailableType === 'PARTIAL' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Horário início *</label>
            <input type="time" value={form.startTime || ''} onChange={e => set('startTime', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
            {errors.startTime && <p className="text-xs text-red-500">{errors.startTime}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Horário fim *</label>
            <input type="time" value={form.endTime || ''} onChange={e => set('endTime', e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none" />
            {errors.endTime && <p className="text-xs text-red-500">{errors.endTime}</p>}
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Dias da semana (deixe em branco para todos)</label>
        <div className="flex gap-1.5 flex-wrap">
          {WEEKDAYS_OPTS.map(d => (
            <button key={d.value} type="button" onClick={() => toggleWeekday(d.value)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
                (form.weekdays || []).includes(d.value) ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >{d.label}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="unavail-active" checked={form.active !== false}
          onChange={e => set('active', e.target.checked)} className="w-4 h-4 rounded accent-brand-blue" />
        <label htmlFor="unavail-active" className="text-sm text-gray-700">Ativo</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
        <button type="button" onClick={handleSubmit} className="px-3 py-1.5 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded-lg transition-colors">
          {form.id ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cor do terapeuta (usada na agenda)</label>
      <div className="flex items-center gap-3">
        <input type="color" value={value || '#6b7280'} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="#6b7280"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-brand-blue outline-none" />
        <span className="w-8 h-8 rounded-lg border border-gray-200 shrink-0" style={{ backgroundColor: value || '#6b7280' }} />
      </div>
    </div>
  )
}

export default function TherapistFormModal({ onClose, initial = {} }) {
  const { addTherapist, updateTherapist, specialtiesData, addUnavailability, updateUnavailability, deleteUnavailability, getUnavailabilitiesForTherapist } = useData()
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const toast = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!initial.id

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    color: initial.color || '#6b7280',
    therapistSpecialties:
      initial.therapistSpecialties?.length
        ? initial.therapistSpecialties
        : [{ ...EMPTY_SPEC }],
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [unavailList, setUnavailList] = useState([])
  const [unavailLoaded, setUnavailLoaded] = useState(false)
  const [unavailExpanded, setUnavailExpanded] = useState(false)
  const [unavailForm, setUnavailForm] = useState(null) // null | {} | {id, ...} (editing)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function setSpecRow(index, field, value) {
    setForm(f => {
      const rows = [...f.therapistSpecialties]
      rows[index] = { ...rows[index], [field]: value }
      return { ...f, therapistSpecialties: rows }
    })
  }

  function addSpecRow() {
    setForm(f => ({ ...f, therapistSpecialties: [...f.therapistSpecialties, { ...EMPTY_SPEC }] }))
  }

  function removeSpecRow(index) {
    setForm(f => {
      const rows = f.therapistSpecialties.filter((_, i) => i !== index)
      return { ...f, therapistSpecialties: rows.length ? rows : [{ ...EMPTY_SPEC }] }
    })
  }

  useEffect(() => {
    if (!isEdit || !unavailExpanded || unavailLoaded) return
    getUnavailabilitiesForTherapist(initial.id).then(data => {
      setUnavailList(data)
      setUnavailLoaded(true)
    })
  }, [isEdit, unavailExpanded, unavailLoaded, initial.id, getUnavailabilitiesForTherapist])

  async function handleSaveUnavail(data) {
    if (data.id) {
      await updateUnavailability(data.id, { ...data, therapistId: initial.id })
      setUnavailList(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u))
    } else {
      const result = await addUnavailability({ ...data, therapistId: initial.id })
      if (!result?.error) setUnavailList(prev => [...prev, result])
    }
    setUnavailForm(null)
  }

  async function handleDeleteUnavail(id) {
    if (!confirm('Excluir esta indisponibilidade?')) return
    await deleteUnavailability(id)
    setUnavailList(prev => prev.filter(u => u.id !== id))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    const hasSpec = form.therapistSpecialties.some(s => s.specialty)
    if (!hasSpec) e.specialties = 'Adicione ao menos uma especialidade'
    if (!isEdit && !form.email.trim()) e.email = 'E-mail obrigatório para enviar o convite'
    if (form.cpf && form.cpf.replace(/\D/g, '').length === 11 && !validateCPF(form.cpf)) e.cpf = 'CPF inválido'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setLoading(true)
    try {
      if (isEdit) {
        await updateTherapist(initial.id, form)
        onClose()
      } else {
        const therapist = await addTherapist(form)
        if (!therapist || therapist.error) throw new Error(therapist?.error || 'Erro ao criar terapeuta')

        // Tenta enviar convite — mesmo se falhar, terapeuta já está criado
        try {
          const { supabase } = await import('../../../lib/supabase')
          const result = await supabase.functions.invoke('invite-therapist', {
            body: { email: form.email, therapistId: therapist.id, therapistName: form.name },
          })
          if (result.error) {
            let detail = result.error.message || 'erro desconhecido'
            try {
              const body = await result.error.context?.json()
              if (body?.error) detail = body.error
            } catch {}
            toast.show(`Convite falhou: ${detail}`, 'error')
          }
        } catch (emailErr) {
          toast.show('Terapeuta cadastrado, mas o e-mail de convite não pôde ser enviado. Verifique a Edge Function.', 'error')
        }
        setInviteSent(true)
      }
    } catch (err) {
      console.error(err)
      setErrors({ submit: err.message || 'Erro ao salvar. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  if (inviteSent) {
    return (
      <Modal title="Convite Enviado" onClose={onClose} size="sm"
        footer={<Button variant="primary" onClick={onClose}>Fechar</Button>}
      >
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <FiCheck size={28} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Terapeuta cadastrado!</h3>
          <p className="text-sm text-gray-500">
            Um e-mail de convite foi enviado para <strong>{form.email}</strong>.
            O terapeuta receberá o link para definir sua senha e acessar o sistema.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title={isEdit ? 'Editar Terapeuta' : 'Novo Terapeuta'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar' : (
              <><FiMail size={14} /> Cadastrar e Convidar</>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Dados Básicos */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Pessoais
          </h3>
          <div className="space-y-3">
            <Input
              label="Nome Completo *"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              error={errors.name}
              placeholder="Nome do terapeuta"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={isEdit ? 'E-mail' : 'E-mail *'}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                error={errors.email}
                placeholder="email@clinica.com.br"
              />
              <Input
                label="Telefone"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(11) 9 9999-9999"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="CPF"
                value={form.cpf}
                onChange={e => set('cpf', formatCPF(e.target.value))}
                error={errors.cpf}
                placeholder="000.000.000-00"
              />
            </div>
            <ColorPicker value={form.color} onChange={v => set('color', v)} />
          </div>
        </section>

        {/* Especialidades */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Especialidades e Registros Profissionais
          </h3>
          {errors.specialties && (
            <p className="text-xs text-red-600 mb-2">{errors.specialties}</p>
          )}
          <div className="space-y-2">
            {/* Cabeçalho da tabela */}
            <div className="hidden sm:grid grid-cols-[1fr_1fr_56px_32px] gap-2 px-1">
              <span className="text-xs text-gray-400 font-medium">Especialidade</span>
              <span className="text-xs text-gray-400 font-medium">Nº Conselho Regional</span>
              <span className="text-xs text-gray-400 font-medium text-center">RT?</span>
              <span />
            </div>

            {form.therapistSpecialties.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_56px_32px] gap-2 items-start">
                <Select
                  value={row.specialty}
                  onChange={e => setSpecRow(i, 'specialty', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {activeSpecialties.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </Select>
                <Input
                  value={row.credential}
                  onChange={e => setSpecRow(i, 'credential', e.target.value)}
                  placeholder="Ex: CRFa 2/12345"
                />
                <div className="flex items-center justify-center mt-1">
                  <input
                    type="checkbox"
                    checked={row.canBeRt || false}
                    onChange={e => setSpecRow(i, 'canBeRt', e.target.checked)}
                    title="Pode ser Responsável Técnico (RT) nesta especialidade"
                    className="w-4 h-4 rounded accent-brand-blue cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSpecRow(i)}
                  className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remover"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addSpecRow}
              className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline mt-1"
            >
              <FiPlus size={14} /> Adicionar especialidade
            </button>
          </div>
        </section>

        {/* Dados Bancários */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Bancários
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Banco"
              value={form.bank}
              onChange={e => set('bank', e.target.value)}
              placeholder="Ex: Bradesco"
            />
            <Input
              label="Agência"
              value={form.agency}
              onChange={e => set('agency', e.target.value)}
              placeholder="0000"
            />
            <Input
              label="Conta Corrente"
              value={form.accountNumber}
              onChange={e => set('accountNumber', e.target.value)}
              placeholder="00000-0"
            />
            <Input
              label="Chave PIX"
              value={form.pixKey}
              onChange={e => set('pixKey', e.target.value)}
              placeholder="CPF, e-mail ou telefone"
            />
          </div>
        </section>

        {!isEdit && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            <FiMail size={14} className="mt-0.5 shrink-0" />
            O terapeuta receberá um e-mail para definir sua senha e acessar o sistema.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="belongsToTeam"
              type="checkbox"
              checked={form.belongsToTeam}
              onChange={e => set('belongsToTeam', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <div>
              <label htmlFor="belongsToTeam" className="text-sm font-medium text-gray-700">Pertence à Equipe</label>
              <p className="text-xs text-gray-400">Acessa todos os pacientes e prontuários da clínica</p>
            </div>
          </div>
          {isEdit && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={e => set('active', e.target.checked)}
                className="w-4 h-4 rounded accent-brand-blue"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Terapeuta ativo</label>
            </div>
          )}
        </div>

        {isEdit && (
          <section>
            <button
              type="button"
              onClick={() => setUnavailExpanded(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide pb-2 border-b border-gray-100"
            >
              <span>Indisponibilidades</span>
              <span className="text-gray-400">{unavailExpanded ? '▲' : '▼'}</span>
            </button>

            {unavailExpanded && (
              <div className="mt-3 space-y-3">
                {!unavailLoaded ? (
                  <p className="text-xs text-gray-400">Carregando...</p>
                ) : unavailList.length === 0 && !unavailForm ? (
                  <p className="text-xs text-gray-400">Nenhuma indisponibilidade cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {unavailList.map(u => (
                      <div key={u.id} className="flex items-start justify-between gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${u.unavailableType === 'TOTAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {u.unavailableType === 'TOTAL' ? 'Total' : 'Parcial'}
                            </span>
                            {!u.active && <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 text-xs">Inativo</span>}
                          </div>
                          <div className="mt-1 text-gray-600">
                            {u.startDate.split('-').reverse().join('/')}{u.endDate ? ` até ${u.endDate.split('-').reverse().join('/')}` : ''}
                            {u.weekdays?.length > 0 && ` — ${u.weekdays.map(d => ['','Seg','Ter','Qua','Qui','Sex','Sáb','Dom'][d]).join(', ')}`}
                            {u.startTime && u.endTime && ` — ${u.startTime}–${u.endTime}`}
                          </div>
                          {u.reason && <div className="text-gray-500 truncate">{u.reason}</div>}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => setUnavailForm({ ...u })} className="p-1 text-gray-400 hover:text-brand-blue transition-colors" title="Editar">
                              <FiEdit2 size={12} />
                            </button>
                            <button type="button" onClick={() => handleDeleteUnavail(u.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {unavailForm !== null && (
                  <UnavailForm
                    value={unavailForm}
                    onSave={handleSaveUnavail}
                    onCancel={() => setUnavailForm(null)}
                  />
                )}

                {isAdmin && !unavailForm && (
                  <button
                    type="button"
                    onClick={() => setUnavailForm({ unavailableType: 'TOTAL', startDate: '', endDate: '', startTime: '', endTime: '', weekdays: [], reason: '', active: true })}
                    className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                  >
                    <FiPlus size={13} /> Adicionar indisponibilidade
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {errors.submit && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{errors.submit}</p>
        )}
      </div>
    </Modal>
  )
}
