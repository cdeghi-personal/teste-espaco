import { useState } from 'react'
import { FiMail, FiCheck, FiPlus, FiTrash2 } from 'react-icons/fi'
import { formatCPF, validateCPF } from '../../../utils/validators'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'

const EMPTY_SPEC = { specialty: '', credential: '' }

const EMPTY = {
  name: '', email: '', phone: '', cpf: '',
  therapistSpecialties: [{ ...EMPTY_SPEC }],
  bank: '', agency: '', accountNumber: '', pixKey: '',
  active: true,
}

export default function TherapistFormModal({ onClose, initial = {} }) {
  const { addTherapist, updateTherapist, specialtiesData } = useData()
  const activeSpecialties = specialtiesData.filter(s => s.active !== false)
  const toast = useToast()
  const isEdit = !!initial.id

  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    therapistSpecialties:
      initial.therapistSpecialties?.length
        ? initial.therapistSpecialties
        : [{ ...EMPTY_SPEC }],
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

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
            toast.show(`Terapeuta cadastrado, mas o e-mail de convite falhou: ${result.error.message || 'erro desconhecido'}. Você pode reenviar depois.`, 'error')
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
            <div className="hidden sm:grid grid-cols-[1fr_1fr_32px] gap-2 px-1">
              <span className="text-xs text-gray-400 font-medium">Especialidade</span>
              <span className="text-xs text-gray-400 font-medium">Nº Conselho Regional</span>
              <span />
            </div>

            {form.therapistSpecialties.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start">
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

        {errors.submit && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{errors.submit}</p>
        )}
      </div>
    </Modal>
  )
}
