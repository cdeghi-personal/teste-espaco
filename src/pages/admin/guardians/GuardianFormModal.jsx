import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'

const EMPTY = {
  fullName: '', relationship: '', cpf: '', rg: '', phone: '', phone2: '',
  email: '', address: '', neighborhood: '', city: '', state: 'SP', cep: '', occupation: '', notes: '',
  patientIds: [],
}

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function GuardianFormModal({ onClose, initial = {}, readOnly = false }) {
  const { addGuardian, updateGuardian, patients } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial, patientIds: initial.patientIds || [] })
  const [errors, setErrors] = useState({})
  const [patientSearch, setPatientSearch] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function togglePatient(patientId) {
    const arr = form.patientIds || []
    set('patientIds', arr.includes(patientId) ? arr.filter(id => id !== patientId) : [...arr, patientId])
  }

  const activePatients = patients.filter(p => !p.deleted)
  const filteredPatients = patientSearch
    ? activePatients.filter(p => p.fullName.toLowerCase().includes(patientSearch.toLowerCase()))
    : activePatients

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nome obrigatório'
    if (!form.relationship) e.relationship = 'Parentesco obrigatório'
    if (!form.phone.trim()) e.phone = 'Telefone obrigatório'
    const cpfDigits = form.cpf?.replace(/\D/g, '') || ''
    if (!cpfDigits) e.cpf = 'CPF obrigatório'
    else if (cpfDigits.length !== 11) e.cpf = 'CPF inválido'
    else if (!validateCPF(form.cpf)) e.cpf = 'CPF inválido'
    if (!form.email?.trim()) e.email = 'E-mail obrigatório'
    if (!form.address?.trim()) e.address = 'Endereço obrigatório'
    if (!form.neighborhood?.trim()) e.neighborhood = 'Bairro obrigatório'
    if (!form.cep?.trim()) e.cep = 'CEP obrigatório'
    if (!form.city?.trim()) e.city = 'Cidade obrigatória'
    if (!form.patientIds?.length) e.patientIds = 'Vincule ao menos um paciente'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) updateGuardian(initial.id, form)
    else addGuardian(form)
    onClose()
  }

  const title = readOnly ? 'Visualizar Responsável' : isEdit ? 'Editar Responsável' : 'Novo Responsável'

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
              <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
            </>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Pessoais
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input label="Nome Completo *" value={form.fullName} onChange={e => set('fullName', e.target.value)} error={errors.fullName} disabled={readOnly} />
              </div>
              <Select label="Parentesco *" value={form.relationship} onChange={e => set('relationship', e.target.value)} error={errors.relationship} disabled={readOnly}>
                <option value="">Selecione</option>
                {['Mãe','Pai','Avó','Avô','Tia','Tio','Outro'].map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="CPF *" value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))} error={errors.cpf} placeholder="000.000.000-00" disabled={readOnly} />
              <Input label="RG" value={form.rg} onChange={e => set('rg', e.target.value)} disabled={readOnly} />
            </div>
            <Input label="Profissão" value={form.occupation} onChange={e => set('occupation', e.target.value)} disabled={readOnly} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Contato
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Telefone / WhatsApp *" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="(11) 9 9999-9999" disabled={readOnly} />
              <Input label="Telefone 2" value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="(11) 3333-4444" disabled={readOnly} />
            </div>
            <Input label="E-mail *" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} disabled={readOnly} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Endereço
          </h3>
          <div className="space-y-3">
            <Input label="Endereço *" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" error={errors.address} disabled={readOnly} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Bairro *" value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Bairro" error={errors.neighborhood} disabled={readOnly} />
              <Input label="CEP *" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" error={errors.cep} disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-2">
                <Input label="Cidade *" value={form.city} onChange={e => set('city', e.target.value)} error={errors.city} disabled={readOnly} />
              </div>
              <Select label="Estado" value={form.state} onChange={e => set('state', e.target.value)} disabled={readOnly}>
                {BR_STATES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Pacientes Vinculados *
            {form.patientIds?.length > 0 && (
              <span className="ml-2 text-xs font-normal text-brand-blue normal-case">
                {form.patientIds.length} selecionado(s)
              </span>
            )}
          </h3>
          {!readOnly && errors.patientIds && <p className="text-xs text-red-600 mb-2">{errors.patientIds}</p>}
          {activePatients.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum paciente cadastrado.</p>
          ) : readOnly ? (
            <div className="flex flex-wrap gap-2">
              {activePatients.filter(p => form.patientIds?.includes(p.id)).map(p => (
                <span key={p.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand-yellow/20 text-brand-blue">
                  {p.fullName}
                </span>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="Buscar paciente..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">Nenhum paciente encontrado</div>
                ) : filteredPatients.map(p => {
                  const checked = form.patientIds?.includes(p.id)
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${checked ? 'bg-brand-yellow/10' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePatient(p.id)}
                        className="w-4 h-4 rounded accent-brand-blue shrink-0"
                      />
                      <span className="text-sm text-gray-800">{p.fullName}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section>
          <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Preferências de contato, informações relevantes..." rows={3} disabled={readOnly} />
        </section>
      </div>
    </Modal>
  )
}
