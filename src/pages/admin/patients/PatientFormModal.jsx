import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useData } from '../../../context/DataContext'
import { SPECIALTY_LIST, SPECIALTIES } from '../../../constants/specialties'

const EMPTY = {
  fullName: '', dateOfBirth: '', sex: '', cpf: '', diagnosis: '',
  conditionIds: [], specialties: [], therapistId: '',
  secondaryTherapistIds: [], paymentMethodId: '', notes: '', statusId: '',
}

export default function PatientFormModal({ onClose, initial = {} }) {
  const { paymentMethods, therapists, diagnoses, patientStatuses, addPatient, updatePatient } = useData()
  const isEdit = !!initial.id

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    conditionIds: initial.conditionIds || [],
    secondaryTherapistIds: initial.secondaryTherapistIds || [],
    statusId: initial.statusId || initial.status || '',
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

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nome obrigatório'
    if (!form.dateOfBirth) e.dateOfBirth = 'Data de nascimento obrigatória'
    if (!form.sex) e.sex = 'Selecione'
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

  // Secondary therapists excludes the primary one
  const secondaryOptions = activeTherapists.filter(t => t.id !== form.therapistId)

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
        {/* Dados Pessoais */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Dados Pessoais
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
              <Input label="CPF" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>
        </section>

        {/* Informações Clínicas */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Informações Clínicas
          </h3>
          <div className="space-y-3">
            <Input
              label="Diagnóstico Principal"
              value={form.diagnosis}
              onChange={e => set('diagnosis', e.target.value)}
              placeholder="Ex: TEA Nível 2, TDAH Tipo Combinado..."
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condições / Diagnósticos Associados</label>
              {activeDiagnoses.length === 0 ? (
                <p className="text-xs text-gray-400">Cadastre diagnósticos em Administração → Diagnósticos.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeDiagnoses.map(d => (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Especialidades em Atendimento</label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTY_LIST.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleList('specialties', k)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
                      form.specialties?.includes(k)
                        ? `${SPECIALTIES[k].color} border-current`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                    }`}
                  >
                    {SPECIALTIES[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Status" value={form.statusId} onChange={e => set('statusId', e.target.value)}>
                <option value="">Selecione</option>
                {activeStatuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Select
                label="Forma de Pagamento"
                value={form.paymentMethodId}
                onChange={e => set('paymentMethodId', e.target.value)}
              >
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
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
            Terapeutas
          </h3>
          <div className="space-y-3">
            <Select
              label="Terapeuta Principal"
              value={form.therapistId}
              onChange={e => {
                set('therapistId', e.target.value)
                // Remove from secondary if it was there
                set('secondaryTherapistIds', (form.secondaryTherapistIds || []).filter(id => id !== e.target.value))
              }}
            >
              <option value="">Selecione o terapeuta principal</option>
              {activeTherapists.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {SPECIALTIES[t.specialty]?.label || t.specialty}</option>
              ))}
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terapeutas Secundários
                <span className="text-xs text-gray-400 font-normal ml-1">(selecione um ou mais)</span>
              </label>
              {secondaryOptions.length === 0 ? (
                <p className="text-xs text-gray-400">Selecione um terapeuta principal primeiro.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {secondaryOptions.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleList('secondaryTherapistIds', t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        form.secondaryTherapistIds?.includes(t.id)
                          ? 'bg-brand-blue text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Observações */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">
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
