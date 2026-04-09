import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'

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
  const { paymentMethods, therapists, diagnoses, patientStatuses, specialtiesData, addPatient, updatePatient } = useData()
  const { user } = useAuth()
  const isEdit = !!initial.id

  const activeStatuses = patientStatuses.filter(s => s.active !== false)
  const defaultStatusId = !isEdit
    ? (activeStatuses.find(s => s.name.toLowerCase().includes('ativo'))?.id || activeStatuses[0]?.id || '')
    : ''

  // Para novo paciente criado por terapeuta: pré-seleciona o próprio terapeuta como Gerente de Conta
  const defaultTherapistId = !isEdit && user?.role === 'therapist' ? (user?.id || '') : ''

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    conditionIds: initial.conditionIds || [],
    involvedTherapistIds: initial.involvedTherapistIds || [],
    statusId: initial.statusId || initial.status || defaultStatusId,
    therapistId: initial.therapistId || defaultTherapistId,
    externalTherapists: initial.externalTherapists || [],
  })
  const [errors, setErrors] = useState({})

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

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) {
      updatePatient(initial.id, form)
    } else {
      addPatient(form)
    }
    onClose()
  }

  const activeTherapists = therapists.filter(t => t.active !== false)
  const activePaymentMethods = paymentMethods.filter(pm => pm.active !== false)
  const activeDiagnoses = diagnoses.filter(d => d.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  // Terapeutas disponíveis para "Envolvidos": exclui o Gerente de Conta selecionado
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
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}</Button>
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
            <Select label="Gerente de Conta *" value={form.therapistId} onChange={e => set('therapistId', e.target.value)} error={errors.therapistId} disabled={readOnly}>
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
          </div>
        </section>

        {/* Dados Escolares */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Escolares
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Nome da Escola" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="Nome da instituição" disabled={readOnly} />
              <Input label="Telefone" value={form.schoolPhone} onChange={e => set('schoolPhone', e.target.value)} placeholder="(11) 3333-3333" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Endereço" value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} placeholder="Rua, número" disabled={readOnly} />
              <Input label="Bairro" value={form.schoolNeighborhood} onChange={e => set('schoolNeighborhood', e.target.value)} placeholder="Bairro" disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Cidade" value={form.schoolCity} onChange={e => set('schoolCity', e.target.value)} placeholder="Cidade" disabled={readOnly} />
              </div>
              <Input label="Estado" value={form.schoolState} onChange={e => set('schoolState', e.target.value)} placeholder="SP" disabled={readOnly} />
              <Input label="CEP" value={form.schoolZip} onChange={e => set('schoolZip', e.target.value)} placeholder="00000-000" disabled={readOnly} />
              <Input label="Coordenador(a)" value={form.schoolCoordinator} onChange={e => set('schoolCoordinator', e.target.value)} placeholder="Nome" disabled={readOnly} />
            </div>
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
            Terapeutas Externos
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades em Atendimento
                {!readOnly && <span className="text-xs text-gray-400 font-normal ml-1">(múltipla seleção)</span>}
              </label>
              {activeSpecialties.length === 0 ? (
                <p className="text-xs text-gray-400">Cadastre especialidades em Administração → Especialidades.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeSpecialties.map(s => {
                    const isSelected = form.specialties?.includes(s.key)
                    if (readOnly && !isSelected) return null
                    const color = s.color || '#6b7280'
                    const fontColor = isSelected ? textColorForBg(color) : undefined
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => !readOnly && toggleList('specialties', s.key)}
                        style={isSelected ? { backgroundColor: color, borderColor: color, color: fontColor } : {}}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 ${readOnly ? 'cursor-default' : 'transition-all'} ${
                          isSelected ? '' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
