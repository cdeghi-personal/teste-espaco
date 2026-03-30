import { useState } from 'react'
import { FiMail, FiCheck } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'
import { SPECIALTY_LIST, SPECIALTIES } from '../../../constants/specialties'

const EMPTY = { name: '', email: '', phone: '', specialty: '', credential: '', active: true }

export default function TherapistFormModal({ onClose, initial = {} }) {
  const { addTherapist, updateTherapist } = useData()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.specialty) e.specialty = 'Selecione a especialidade'
    if (!isEdit && !form.email.trim()) e.email = 'E-mail obrigatório para enviar o convite'
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
        // 1. Cria o terapeuta no banco
        const therapist = await addTherapist(form)
        if (!therapist) throw new Error('Erro ao criar terapeuta')

        // 2. Chama a Edge Function para enviar o convite por email
        const { supabase } = await import('../../../lib/supabase')
        const { error } = await supabase.functions.invoke('invite-therapist', {
          body: {
            email: form.email,
            therapistId: therapist.id,
            therapistName: form.name,
          },
        })

        if (error) throw error
        setInviteSent(true)
      }
    } catch (err) {
      console.error(err)
      setErrors({ submit: 'Erro ao salvar. Tente novamente.' })
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
      size="md"
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
      <div className="space-y-4">
        <Input
          label="Nome Completo *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Nome do terapeuta"
        />

        <Select
          label="Especialidade *"
          value={form.specialty}
          onChange={e => set('specialty', e.target.value)}
          error={errors.specialty}
        >
          <option value="">Selecione</option>
          {SPECIALTY_LIST.map(k => <option key={k} value={k}>{SPECIALTIES[k].label}</option>)}
        </Select>

        <Input
          label="Registro Profissional"
          value={form.credential}
          onChange={e => set('credential', e.target.value)}
          placeholder="Ex: CRP 06/12345, CRFa 2/12345..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
