import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'

const EMPTY = {
  fullName: '', relationship: '', cpf: '', rg: '', phone: '', phone2: '',
  email: '', address: '', city: '', state: 'SP', cep: '', occupation: '', notes: '',
  patientIds: [],
}

const BR_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export default function GuardianFormModal({ onClose, initial = {} }) {
  const { addGuardian, updateGuardian, patients } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial, patientIds: initial.patientIds || [] })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function togglePatient(patientId) {
    const arr = form.patientIds || []
    set('patientIds', arr.includes(patientId) ? arr.filter(id => id !== patientId) : [...arr, patientId])
  }

  const activePatients = patients.filter(p => !p.deleted)

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nome obrigatório'
    if (!form.phone.trim()) e.phone = 'Telefone obrigatório'
    return e
  }

  function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    if (isEdit) updateGuardian(initial.id, form)
    else addGuardian(form)
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Responsável' : 'Novo Responsável'}
      onClose={onClose}
      size="xl"
      footer={
        <>
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
                <Input label="Nome Completo *" value={form.fullName} onChange={e => set('fullName', e.target.value)} error={errors.fullName} />
              </div>
              <Select label="Parentesco" value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">Selecione</option>
                {['Mãe','Pai','Avó','Avô','Tia','Tio','Outro'].map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="CPF" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              <Input label="RG" value={form.rg} onChange={e => set('rg', e.target.value)} />
            </div>
            <Input label="Profissão" value={form.occupation} onChange={e => set('occupation', e.target.value)} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Contato
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Telefone / WhatsApp *" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} placeholder="(11) 9 9999-9999" />
              <Input label="Telefone 2" value={form.phone2} onChange={e => set('phone2', e.target.value)} placeholder="(11) 3333-4444" />
            </div>
            <Input label="E-mail" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Endereço
          </h3>
          <div className="space-y-3">
            <Input label="Endereço" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número, complemento" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Input label="Cidade" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <Select label="Estado" value={form.state} onChange={e => set('state', e.target.value)}>
                {BR_STATES.map(s => <option key={s}>{s}</option>)}
              </Select>
              <Input label="CEP" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Pacientes Vinculados
          </h3>
          {activePatients.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum paciente cadastrado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activePatients.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePatient(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    form.patientIds?.includes(p.id)
                      ? 'bg-brand-yellow text-brand-blue font-semibold'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.fullName}
                </button>
              ))}
            </div>
          )}
          {form.patientIds?.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{form.patientIds.length} paciente(s) selecionado(s)</p>
          )}
        </section>

        <section>
          <Textarea label="Observações" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Preferências de contato, informações relevantes..." rows={3} />
        </section>
      </div>
    </Modal>
  )
}
