import { useState } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'

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

export default function PatientFormModal({ onClose, initial = {} }) {
  const { paymentMethods, therapists, diagnoses, patientStatuses, specialtiesData, addPatient, updatePatient } = useData()
  const isEdit = !!initial.id

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    conditionIds: initial.conditionIds || [],
    involvedTherapistIds: initial.involvedTherapistIds || [],
    statusId: initial.statusId || initial.status || '',
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
    if (form.cpf && form.cpf.replace(/\D/g, '').length === 11 && !validateCPF(form.cpf)) e.cpf = 'CPF inválido'
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
  const activeStatuses = patientStatuses.filter(s => s.active !== false)
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)

  return (
    <Modal
      title={isEdit ? 'Editar Paciente' : 'Novo Paciente'}
      onClose={onClose}
      size="xl"
      footer={
        <>
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
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Data de Nascimento *"
                type="date"
                value={form.dateOfBirth}
                onChange={e => set('dateOfBirth', e.target.value)}
                error={errors.dateOfBirth}
              />
              <Select label="Sexo *" value={form.sex} onChange={e => set('sex', e.target.value)} error={errors.sex}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </Select>
              <Input label="CPF" value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))} error={errors.cpf} placeholder="000.000.000-00" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="RG" value={form.rg} onChange={e => set('rg', e.target.value)} placeholder="00.000.000-0" />
              <Input label="Telefone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 9 9999-9999" />
              <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Endereço" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" />
              <Input label="Bairro" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Cidade" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Cidade" />
              </div>
              <Input label="Estado" value={form.state} onChange={e => set('state', e.target.value)} placeholder="SP" />
              <Input label="CEP" value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="00000-000" />
              <Input label="Indicação" value={form.indication} onChange={e => set('indication', e.target.value)} placeholder="Como nos conheceu?" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Status" value={form.statusId} onChange={e => set('statusId', e.target.value)}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select label="Forma de Pagamento" value={form.paymentMethodId} onChange={e => set('paymentMethodId', e.target.value)}>
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
            <Select label="Gerente de Conta" value={form.therapistId} onChange={e => set('therapistId', e.target.value)}>
              <option value="">Selecione</option>
              {activeTherapists.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terapeutas Envolvidos
                <span className="text-xs text-gray-400 font-normal ml-1">(múltipla seleção)</span>
              </label>
              {activeTherapists.length === 0 ? (
                <p className="text-xs text-gray-400">Nenhum terapeuta cadastrado.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeTherapists.map(t => {
                    const isSelected = form.involvedTherapistIds?.includes(t.id)
                    const color = t.color || '#6b7280'
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleList('involvedTherapistIds', t.id)}
                        style={isSelected ? { backgroundColor: color, borderColor: color, color: 'white' } : {}}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
                          isSelected ? '' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
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
              <Input label="Nome da Escola" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} placeholder="Nome da instituição" />
              <Input label="Telefone" value={form.schoolPhone} onChange={e => set('schoolPhone', e.target.value)} placeholder="(11) 3333-3333" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Endereço" value={form.schoolAddress} onChange={e => set('schoolAddress', e.target.value)} placeholder="Rua, número" />
              <Input label="Bairro" value={form.schoolNeighborhood} onChange={e => set('schoolNeighborhood', e.target.value)} placeholder="Bairro" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <Input label="Cidade" value={form.schoolCity} onChange={e => set('schoolCity', e.target.value)} placeholder="Cidade" />
              </div>
              <Input label="Estado" value={form.schoolState} onChange={e => set('schoolState', e.target.value)} placeholder="SP" />
              <Input label="CEP" value={form.schoolZip} onChange={e => set('schoolZip', e.target.value)} placeholder="00000-000" />
              <Input label="Coordenador(a)" value={form.schoolCoordinator} onChange={e => set('schoolCoordinator', e.target.value)} placeholder="Nome" />
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
              <Input label="Convênio" value={form.doctorInsurance} onChange={e => set('doctorInsurance', e.target.value)} placeholder="Plano de saúde" />
            </div>
            <Input label="Nome do Médico" value={form.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr(a). Nome" />
            <Input label="Especialidade" value={form.doctorSpecialty} onChange={e => set('doctorSpecialty', e.target.value)} placeholder="Neuropediatra..." />
            <Input label="Telefone" value={form.doctorPhone} onChange={e => set('doctorPhone', e.target.value)} placeholder="(11) 9 9999-9999" />
          </div>
        </section>

        {/* Terapeutas Externos */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Terapeutas Externos
          </h3>
          <div className="space-y-2">
            {form.externalTherapists.length > 0 && (
              <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_32px] gap-2 px-1">
                <span className="text-xs text-gray-400 font-medium">Nome</span>
                <span className="text-xs text-gray-400 font-medium">Especialidade</span>
                <span className="text-xs text-gray-400 font-medium">Telefone</span>
                <span />
              </div>
            )}
            {form.externalTherapists.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_32px] gap-2 items-start">
                <Input
                  value={row.name}
                  onChange={e => setExtRow(i, 'name', e.target.value)}
                  placeholder="Nome"
                />
                <Input
                  value={row.specialty}
                  onChange={e => setExtRow(i, 'specialty', e.target.value)}
                  placeholder="Especialidade"
                />
                <Input
                  value={row.phone}
                  onChange={e => setExtRow(i, 'phone', e.target.value)}
                  placeholder="(11) 9 9999-9999"
                />
                <button
                  type="button"
                  onClick={() => removeExtRow(i)}
                  className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addExtRow}
              className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
            >
              <FiPlus size={14} /> Adicionar terapeuta externo
            </button>
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
                  {activeDiagnoses.filter(d => d.name !== form.diagnosis).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleList('conditionIds', d.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        form.conditionIds?.includes(d.id)
                          ? 'bg-brand-blue text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades em Atendimento
                <span className="text-xs text-gray-400 font-normal ml-1">(múltipla seleção)</span>
              </label>
              {activeSpecialties.length === 0 ? (
                <p className="text-xs text-gray-400">Cadastre especialidades em Administração → Especialidades.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeSpecialties.map(s => {
                    const isSelected = form.specialties?.includes(s.key)
                    const color = s.color || '#6b7280'
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleList('specialties', s.key)}
                        style={isSelected ? { backgroundColor: color, borderColor: color, color: 'white' } : {}}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
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
          />
        </section>
      </div>
    </Modal>
  )
}
