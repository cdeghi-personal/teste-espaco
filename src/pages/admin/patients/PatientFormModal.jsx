import { useState } from 'react'
import { FiPlus, FiTrash2, FiRefreshCw, FiHelpCircle, FiX } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { PAYMENT_TYPE_OPTIONS } from '../../../constants/paymentTypes'
import { hexTextColor } from '../../../utils/colorUtils'

const EMPTY_EXT = { name: '', specialty: '', phone: '' }

const EMPTY = {
  fullName: '', dateOfBirth: '', sex: '', cpf: '', rg: '',
  phone: '', email: '', address: '', neighborhood: '', city: '', state: '', zipCode: '', indication: '',
  schoolName: '', schoolPhone: '', schoolAddress: '', schoolNeighborhood: '',
  schoolCity: '', schoolState: '', schoolZip: '', schoolCoordinator: '',
  doctorInsurance: '', doctorName: '', doctorSpecialty: '', doctorPhone: '',
  diagnosis: '', conditionIds: [], specialties: [], therapistId: '',
  involvedTherapistIds: [],
  paymentMethodId: '', notes: '', statusId: '',
  externalTherapists: [],
  needsConvenioReport: false,
}

// Retorna 'white' ou 'black' dependendo da luminância da cor hex
function textColorForBg(hex) {
  if (!hex) return 'black'
  const c = hex.replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? 'black' : 'white'
}

export default function PatientFormModal({ onClose, initial = {}, readOnly = false }) {
  const { paymentMethods, therapists, diagnoses, patientStatuses, specialtiesData, addPatient, updatePatient, companySettings } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!initial.id

  const activeStatuses = patientStatuses.filter(s => s.active !== false)
  const defaultStatusId = !isEdit
    ? (activeStatuses.find(s => s.name.toLowerCase().includes('ativo'))?.id || activeStatuses[0]?.id || '')
    : ''

  // Para novo paciente criado por terapeuta: pré-seleciona o próprio terapeuta como Gerente do Caso
  const defaultTherapistId = !isEdit && user?.role === 'therapist' ? (user?.id || '') : ''

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    specialties: initial.specialties ?? [],
    conditionIds: initial.conditionIds || [],
    involvedTherapistIds: initial.involvedTherapistIds || [],
    statusId: initial.statusId || initial.status || defaultStatusId,
    therapistId: initial.therapistId || defaultTherapistId,
    externalTherapists: initial.externalTherapists || [],
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function toggleList(field, val) {
    const arr = form[field] || []
    set(field, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function setExtRow(index, field, value) {
    setForm(f => {
      const rows = [...f.externalTherapists]
      rows[index] = { ...rows[index], [field]: value }
      return { ...f, externalTherapists: rows }
    })
  }

  function addExtRow() {
    setForm(f => ({ ...f, externalTherapists: [...f.externalTherapists, { ...EMPTY_EXT }] }))
  }

  function removeExtRow(index) {
    setForm(f => ({ ...f, externalTherapists: f.externalTherapists.filter((_, i) => i !== index) }))
  }

  const [newSpecialtyKey, setNewSpecialtyKey] = useState('')
  const [showPaymentHelp, setShowPaymentHelp] = useState(false)
  const discountPct = parseFloat(companySettings?.therapistDiscountPercent ?? 0)

  function addSpecialtyRow(key) {
    if (!key || form.specialties.some(s => s.key === key)) return
    setForm(f => ({ ...f, specialties: [...f.specialties, { key, patientValue: '', therapistValue: '', paymentType: 'POST_PER_SESSION', monthlyPatientValue: '', monthlyTherapistValue: '', paymentNotes: '' }] }))
    setNewSpecialtyKey('')
  }
  function removeSpecialtyRow(key) {
    setForm(f => ({ ...f, specialties: f.specialties.filter(s => s.key !== key) }))
  }
  function updateSpecialtyValue(key, field, value) {
    setForm(f => ({ ...f, specialties: f.specialties.map(s => s.key === key ? { ...s, [field]: value } : s) }))
  }
  function handlePatientValueChange(key, value) {
    setForm(f => ({ ...f, specialties: f.specialties.map(s => s.key === key ? { ...s, patientValue: value } : s) }))
  }
  function handlePatientValueBlur(key) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.map(s => {
        if (s.key !== key) return s
        if (s.paymentType === 'POST_MONTHLY') return s
        const pv = parseFloat(s.patientValue)
        if (isNaN(pv) || pv <= 0 || !(discountPct > 0)) return s
        const therapistEmpty = s.therapistValue === '' || s.therapistValue == null
        if (!therapistEmpty) return s
        return { ...s, therapistValue: String(+(pv * (1 - discountPct / 100)).toFixed(2)) }
      }),
    }))
  }
  function recalcTherapistValue(key) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.map(s => {
        if (s.key !== key) return s
        const pv = parseFloat(s.patientValue)
        if (isNaN(pv) || pv <= 0) return s
        return { ...s, therapistValue: String(+(pv * (1 - discountPct / 100)).toFixed(2)) }
      }),
    }))
  }
  function recalcMonthlyTherapistValue(key) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.map(s => {
        if (s.key !== key) return s
        const pv = parseFloat(s.monthlyPatientValue)
        if (isNaN(pv) || pv <= 0) return s
        return { ...s, monthlyTherapistValue: String(+(pv * (1 - discountPct / 100)).toFixed(2)) }
      }),
    }))
  }

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nome obrigatório'
    if (!form.dateOfBirth) e.dateOfBirth = 'Data de nascimento obrigatória'
    if (!form.sex) e.sex = 'Selecione'
    if (!form.cpf?.replace(/\D/g, '')) e.cpf = 'CPF obrigatório'
    else if (form.cpf.replace(/\D/g, '').length === 11 && !validateCPF(form.cpf)) e.cpf = 'CPF inválido'
    if (!form.statusId) e.statusId = 'Selecione'
    if (!form.paymentMethodId) e.paymentMethodId = 'Selecione'
    if (!form.therapistId) e.therapistId = 'Selecione'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) {
        await updatePatient(initial.id, form)
      } else {
        await addPatient(form)
      }
      onClose()
    } catch (err) {
      console.error('[PatientFormModal] save error:', err)
      toast.show(err?.message || 'Erro ao salvar paciente', 'error')
    } finally {
      setSaving(false)
    }
  }

  const activeTherapists = therapists.filter(t => t.active !== false)
  const activePaymentMethods = paymentMethods.filter(pm => pm.active !== false)
  const activeDiagnoses = diagnoses
    .filter(d => d.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  // Terapeutas disponíveis para "Envolvidos": exclui o Gerente do Caso selecionado
  const involvedTherapistOptions = activeTherapists.filter(t => t.id !== form.therapistId)

  const title = readOnly ? 'Visualizar Paciente' : isEdit ? 'Editar Paciente' : 'Novo Paciente'

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="xl"
      footer={
        readOnly
          ? <Button variant="ghost" onClick={onClose}>Fechar</Button>
          : <>
              <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}</Button>
            </>
      }
    >
      <div className="space-y-6">

        {/* Dados do Paciente */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados do Paciente
          </h3>
          <div className="space-y-3">
            <Input
              label="Nome Completo *"
              value={form.fullName}
              onChange={e => set('fullName', e.target.value)}
              error={errors.fullName}
              placeholder="Nome da criança"
              disabled={readOnly}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Data de Nascimento *"
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                error={errors.dateOfBirth}
                disabled={readOnly}
              />
              <Select label="Sexo *" value={form.sex} onChange={e => set('sex', e.target.value)} error={errors.sex} disabled={readOnly}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </Select>
              <Input label="CPF *" value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))} error={errors.cpf} placeholder="000.000.000-00" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="RG" value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="00.000.000-0" disabled={readOnly} />
              <Input label="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 9 9999-9999" disabled={readOnly} />
              <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Endereço" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" disabled={readOnly} />
              <Input label="Bairro" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Cidade" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" disabled={readOnly} />
              </div>
              <Input label="Estado" value={form.state} onChange={e => set('state', e.target.value)} placeholder="SP" disabled={readOnly} />
              <Input label="CEP" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="00000-000" disabled={readOnly} />
              <Input label="Indicação" value={form.indication} onChange={e => set('indication', e.target.value)} placeholder="Como nos conheceu?" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Status *" value={form.statusId} onChange={e => set('statusId', e.target.value)} error={errors.statusId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select label="Forma de Pagamento *" value={form.paymentMethodId} onChange={e => set('paymentMethodId', e.target.value)} error={errors.paymentMethodId} disabled={readOnly}>
                <option value="">Selecione</option>
                {activePaymentMethods.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        {/* Terapeutas */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Terapeutas
          </h3>
          <div className="space-y-3">
            <Select label="Gerente do Caso *" value={form.therapistId} onChange={e => set('therapistId', e.target.value)} error={errors.therapistId} disabled={readOnly}>
              <option value="">Selecione</option>
              {activeTherapists.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terapeutas Envolvidos
                {!readOnly && <span className="text-xs text-gray-400 font-normal ml-1">(múltipla seleção)</span>}
              </label>
              {involvedTherapistOptions.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum terapeuta disponível.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {involvedTherapistOptions.map(t => {
                    const isSelected = form.involvedTherapistIds?.includes(t.id)
                    if (readOnly && !isSelected) return null
                    const color = t.color || '#6b7280'
                    const fontColor = isSelected ? textColorForBg(color) : undefined
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => !readOnly && toggleList('involvedTherapistIds', t.id)}
                        style={isSelected ? { backgroundColor: color, borderColor: color, color: fontColor } : {}}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${
                          readOnly ? 'cursor-default' : 'transition-all'
                        } ${isSelected ? '' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'}`}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>


            {/* Especialidades em Atendimento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades em Atendimento</label>

              {/* Admin editando: cards com campos de pagamento */}
              {isAdmin && !readOnly && form.specialties.length > 0 && (
                <div className="space-y-3 mb-3">
                  {showPaymentHelp && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-blue-900">Modalidades de Pagamento</span>
                        <button type="button" onClick={() => setShowPaymentHelp(false)} className="text-blue-400 hover:text-blue-600 p-0.5"><FiX size={13} /></button>
                      </div>
                      <p><strong>Pós-pago por consulta:</strong> cobrado por sessão realizada. Informe o valor por sessão nos campos Valor Paciente e Valor Terapeuta.</p>
                      <p><strong>Pós-pago mensal fixo:</strong> valor fixo cobrado por mês, independente da quantidade de sessões. Informe o valor mensal para paciente e terapeuta.</p>
                      <p><strong>Pré-pago por pacote:</strong> o responsável compra antecipadamente um pacote com N sessões. O saldo é debitado automaticamente a cada sessão realizada. Pacotes são gerenciados na ficha do paciente.</p>
                      <p><strong>Pré-pago por consulta individual:</strong> pagamento antecipado sessão a sessão, sem pacote. Cada sessão é paga individualmente antes de ser realizada.</p>
                    </div>
                  )}
                  {form.specialties.map(s => {
                    const spec = activeSpecialties.find(sp => sp.key === s.key)
                    const color = spec?.color || '#6b7280'
                    const isMonthly = s.paymentType === 'POST_MONTHLY'
                    const fmtVal = v => (v != null && v !== '') ? `R$ ${Number(v).toFixed(2)}` : '—'
                    const inputCls = 'w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none'
                    return (
                      <div key={s.key} className="border border-gray-200 rounded-xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color, color: hexTextColor(color) }}>
                            {spec?.label || s.key}
                          </span>
                          <button type="button" onClick={() => removeSpecialtyRow(s.key)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs text-gray-500">Modalidade de Pagamento</label>
                            <button type="button" onClick={() => setShowPaymentHelp(v => !v)} className="p-0.5 text-gray-400 hover:text-brand-blue transition-colors" title="O que é cada modalidade?">
                              <FiHelpCircle size={11} />
                            </button>
                          </div>
                          <select value={s.paymentType || 'POST_PER_SESSION'} onChange={e => updateSpecialtyValue(s.key, 'paymentType', e.target.value)}
                            className={inputCls}>
                            {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        {!isMonthly && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Valor Paciente / sessão</label>
                              <input type="number" min="0" step="0.01" value={s.patientValue ?? ''} placeholder="0,00"
                                onChange={e => handlePatientValueChange(s.key, e.target.value)}
                                onBlur={() => handlePatientValueBlur(s.key)}
                                className={inputCls} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-gray-500">Valor Terapeuta / sessão</label>
                                {discountPct > 0 && (
                                  <button type="button" onClick={() => recalcTherapistValue(s.key)}
                                    className="flex items-center gap-0.5 text-[10px] text-brand-blue hover:underline">
                                    <FiRefreshCw size={9} /> {discountPct}%
                                  </button>
                                )}
                              </div>
                              <input type="number" min="0" step="0.01" value={s.therapistValue ?? ''} placeholder="0,00"
                                onChange={e => updateSpecialtyValue(s.key, 'therapistValue', e.target.value)} className={inputCls} />
                            </div>
                          </div>
                        )}
                        {isMonthly && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Valor Mensal Paciente</label>
                              <input type="number" min="0" step="0.01" value={s.monthlyPatientValue ?? ''} placeholder="0,00"
                                onChange={e => updateSpecialtyValue(s.key, 'monthlyPatientValue', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-gray-500">Valor Mensal Terapeuta</label>
                                {discountPct > 0 && (
                                  <button type="button" onClick={() => recalcMonthlyTherapistValue(s.key)}
                                    className="flex items-center gap-0.5 text-[10px] text-brand-blue hover:underline">
                                    <FiRefreshCw size={9} /> {discountPct}%
                                  </button>
                                )}
                              </div>
                              <input type="number" min="0" step="0.01" value={s.monthlyTherapistValue ?? ''} placeholder="0,00"
                                onChange={e => updateSpecialtyValue(s.key, 'monthlyTherapistValue', e.target.value)} className={inputCls} />
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Observações de Pagamento</label>
                          <input type="text" value={s.paymentNotes || ''} placeholder="Notas sobre pagamento..."
                            onChange={e => updateSpecialtyValue(s.key, 'paymentNotes', e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Admin visualizando (readOnly): tabela com valores */}
              {isAdmin && readOnly && form.specialties.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-hidden mb-2">
                  <div className="overflow-x-auto">
                  <table className="w-full text-[10px] sm:text-xs min-w-[340px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Especialidade</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Modalidade</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Vlr Paciente</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Vlr Terapeuta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.specialties.map(s => {
                        const spec = activeSpecialties.find(sp => sp.key === s.key)
                        const color = spec?.color || '#6b7280'
                        const isMonthly = s.paymentType === 'POST_MONTHLY'
                        const fmtVal = v => (v != null && v !== '') ? `R$ ${Number(v).toFixed(2)}` : '—'
                        const ptLabel = PAYMENT_TYPE_OPTIONS.find(o => o.value === (s.paymentType || 'POST_PER_SESSION'))?.label || s.paymentType
                        return (
                          <tr key={s.key} className="border-t border-gray-100">
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color, color: hexTextColor(color) }}>{spec?.label || s.key}</span>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{ptLabel}</td>
                            <td className="px-3 py-2 text-gray-700">{isMonthly ? fmtVal(s.monthlyPatientValue) : fmtVal(s.patientValue)}{isMonthly && <span className="text-gray-400 ml-0.5">/mês</span>}</td>
                            <td className="px-3 py-2 text-gray-700">{isMonthly ? fmtVal(s.monthlyTherapistValue) : fmtVal(s.therapistValue)}{isMonthly && <span className="text-gray-400 ml-0.5">/mês</span>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

              {/* Terapeuta: apenas lista de especialidades */}
              {!isAdmin && form.specialties.length > 0 && (
                <div className="rounded-xl border border-gray-200 overflow-hidden mb-2">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr><th className="text-left px-3 py-2 font-semibold text-gray-500">Especialidade</th></tr>
                    </thead>
                    <tbody>
                      {form.specialties.map(s => {
                        const spec = activeSpecialties.find(sp => sp.key === s.key)
                        const color = spec?.color || '#6b7280'
                        return (
                          <tr key={s.key} className="border-t border-gray-100">
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: color, color: hexTextColor(color) }}>{spec?.label || s.key}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <select value={newSpecialtyKey} onChange={e => setNewSpecialtyKey(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-brand-blue outline-none text-gray-700">
                    <option value="">Selecionar especialidade...</option>
                    {activeSpecialties
                      .filter(sp => !form.specialties.some(s => s.key === sp.key))
                      .map(sp => <option key={sp.key} value={sp.key}>{sp.label}</option>)}
                  </select>
                  <button type="button" onClick={() => addSpecialtyRow(newSpecialtyKey)} disabled={!newSpecialtyKey}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-blue text-white disabled:opacity-40 hover:bg-brand-blue-dark transition-colors">
                    <FiPlus size={13} /> Adicionar
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dados Escolares */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Escolares
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Nome da Escola" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="Nome da instituição" disabled={readOnly} />
            <Input label="Telefone" value={form.schoolPhone} onChange={e => set('schoolPhone', e.target.value)} placeholder="(11) 3333-3333" disabled={readOnly} />
            <Input label="Coordenador(a)" value={form.schoolCoordinator} onChange={e => set('schoolCoordinator', e.target.value)} placeholder="Nome" disabled={readOnly} />
          </div>
        </section>

        {/* Médico Responsável */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Médico Responsável
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Input label="Convênio" value={form.doctorInsurance} onChange={e => set('doctorInsurance', e.target.value)} placeholder="Plano de saúde" disabled={readOnly} />
            </div>
            <Input label="Nome do Médico" value={form.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr(a). Nome" disabled={readOnly} />
            <Input label="Especialidade" value={form.doctorSpecialty} onChange={e => set('doctorSpecialty', e.target.value)} placeholder="Neuropediatra..." disabled={readOnly} />
            <Input label="Telefone" value={form.doctorPhone} onChange={e => set('doctorPhone', e.target.value)} placeholder="(11) 9 9999-9999" disabled={readOnly} />
          </div>
        </section>

        {/* Terapeutas Externos */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Terapeutas / Médicos Externos
          </h3>
          <div className="space-y-2">
            {form.externalTherapists.length > 0 && (
              <div className={`hidden sm:grid gap-2 px-1 ${readOnly ? 'grid-cols-3' : 'grid-cols-[1fr_1fr_1fr_32px]'}`}>
                <span className="text-xs text-gray-400 font-medium">Nome</span>
                <span className="text-xs text-gray-400 font-medium">Especialidade</span>
                <span className="text-xs text-gray-400 font-medium">Telefone</span>
                {!readOnly && <span />}
              </div>
            )}
            {form.externalTherapists.map((row, i) => (
              <div key={i} className={`grid gap-2 items-start ${readOnly ? 'grid-cols-3' : 'grid-cols-[1fr_1fr_1fr_32px]'}`}>
                <Input value={row.name} onChange={e => setExtRow(i, 'name', e.target.value)} placeholder="Nome" disabled={readOnly} />
                <Input value={row.specialty} onChange={e => setExtRow(i, 'specialty', e.target.value)} placeholder="Especialidade" disabled={readOnly} />
                <Input value={row.phone} onChange={e => setExtRow(i, 'phone', e.target.value)} placeholder="(11) 9 9999-9999" disabled={readOnly} />
                {!readOnly && (
                  <button type="button" onClick={() => removeExtRow(i)} className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button type="button" onClick={addExtRow} className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
                <FiPlus size={14} /> Adicionar terapeuta externo
              </button>
            )}
          </div>
        </section>

        {/* Informações Clínicas */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Informações Clínicas
          </h3>
          <div className="space-y-3">
            <Select
              label="Diagnóstico Principal"
              value={form.diagnosis}
              onChange={e => set('diagnosis', e.target.value)}
              disabled={readOnly}
            >
              <option value="">Selecione</option>
              {activeDiagnoses.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comorbidades</label>
              {activeDiagnoses.length === 0 ? (
                <p className="text-xs text-gray-400">Cadastre diagnósticos em Administração → Diagnósticos.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeDiagnoses.filter(d => d.name !== form.diagnosis).map(d => {
                    const isSelected = form.conditionIds?.includes(d.id)
                    if (readOnly && !isSelected) return null
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => !readOnly && toggleList('conditionIds', d.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${readOnly ? 'cursor-default' : 'transition-all'} ${
                          isSelected ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {d.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 p-3 mt-3 bg-gray-50 rounded-xl">
              <input
                id="pat-needs-convenio"
                type="checkbox"
                checked={form.needsConvenioReport}
                onChange={e => set('needsConvenioReport', e.target.checked)}
                className="w-4 h-4 rounded accent-brand-blue"
                disabled={readOnly}
              />
              <div>
                <label htmlFor="pat-needs-convenio" className="text-sm font-medium text-gray-700">Precisa de relatório do convênio</label>
                <p className="text-xs text-gray-400 mt-0.5">Paciente aparecerá na lista do Relatório de Convênio</p>
              </div>
            </div>
          )}
        </section>

        {/* Observações */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Observações Gerais
          </h3>
          <Textarea
            label="Notas e observações"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Preferências, restrições, informações importantes para os terapeutas..."
            rows={4}
            disabled={readOnly}
          />
        </section>
      </div>
    </Modal>
  )
}
