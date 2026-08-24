import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import { useData } from '../../../context/DataContext'
import { useToast } from '../../../components/ui/Toast'

const COLOR_OPTIONS = [
  { value: 'bg-green-100 text-green-700',   label: 'Verde' },
  { value: 'bg-yellow-100 text-yellow-700', label: 'Amarelo' },
  { value: 'bg-gray-100 text-gray-600',     label: 'Cinza' },
  { value: 'bg-blue-100 text-blue-700',     label: 'Azul' },
  { value: 'bg-orange-100 text-orange-700', label: 'Laranja' },
  { value: 'bg-red-100 text-red-700',       label: 'Vermelho' },
  { value: 'bg-purple-100 text-purple-700', label: 'Roxo' },
]

const EMPTY = { name: '', color: 'bg-green-100 text-green-700', active: true, automatic: false, consumesPrepaidSession: false, showsObservation: false, requiresObservation: true, adminCanEdit: true, requestsReplacementDecision: false, isSchedulingDefault: false }

export default function ConsultationStatusFormModal({ onClose, initial = {} }) {
  const { addConsultationStatus, updateConsultationStatus } = useData()
  const { show } = useToast()
  const isEdit = !!initial.id
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Descrição obrigatória'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const result = isEdit ? await updateConsultationStatus(initial.id, form) : await addConsultationStatus(form)
    if (result?.error) { show(result.error, 'error'); return }
    onClose()
  }

  return (
    <Modal
      title={isEdit ? 'Editar Status' : 'Novo Status de Consulta'}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Descrição do Status *"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Ex: Realizada, Faltou, Cancelada..."
        />
        <Select label="Cor do Badge" value={form.color} onChange={e => set('color', e.target.value)}>
          {COLOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </Select>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Prévia</label>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${form.color}`}>{form.name || 'Status'}</span>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="cs-automatic"
            type="checkbox"
            checked={form.automatic}
            onChange={e => set('automatic', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-automatic" className="text-sm font-medium text-gray-700">Automático</label>
            <p className="text-xs text-gray-400 mt-0.5">Status atribuído automaticamente pelo sistema (não aparece para seleção manual)</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="cs-consumes"
            type="checkbox"
            checked={form.consumesPrepaidSession}
            onChange={e => set('consumesPrepaidSession', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-consumes" className="text-sm font-medium text-gray-700">Consome sessão pré-paga</label>
            <p className="text-xs text-gray-400 mt-0.5">Ao atribuir este status, debita automaticamente 1 sessão do pacote pré-pago</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="cs-shows-observation"
            type="checkbox"
            checked={form.showsObservation}
            onChange={e => set('showsObservation', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-shows-observation" className="text-sm font-medium text-gray-700">Exibe Observação</label>
            <p className="text-xs text-gray-400 mt-0.5">Ao atribuir este status, exibe apenas o campo "Observação do Atendimento"; os campos clínicos (Objetivo, Relato, Próxima Sessão) ficam ocultos</p>
          </div>
        </div>
        {form.showsObservation && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="cs-requires-observation"
              type="checkbox"
              checked={form.requiresObservation}
              onChange={e => set('requiresObservation', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <div>
              <label htmlFor="cs-requires-observation" className="text-sm font-medium text-gray-700">Obrigatoriedade da Observação</label>
              <p className="text-xs text-gray-400 mt-0.5">Marcado: "Observação do Atendimento" é obrigatória. Desmarcado: fica opcional</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input
            id="cs-requests-replacement"
            type="checkbox"
            checked={form.requestsReplacementDecision}
            onChange={e => set('requestsReplacementDecision', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-requests-replacement" className="text-sm font-medium text-gray-700">Solicita definição de reposição</label>
            <p className="text-xs text-gray-400 mt-0.5">Ao atribuir este status a um atendimento, pergunta se haverá reposição e permite agendá-la imediatamente</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <input
            id="cs-scheduling-default"
            type="checkbox"
            checked={form.isSchedulingDefault}
            onChange={e => set('isSchedulingDefault', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-scheduling-default" className="text-sm font-medium text-gray-700">Padrão de Agendamento</label>
            <p className="text-xs text-gray-400 mt-0.5">Status inicial usado ao criar reposições. No máximo um status ativo pode ter esta opção — marcar aqui exige desmarcar em qualquer outro status ativo antes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
          <input
            id="cs-admin-can-edit"
            type="checkbox"
            checked={form.adminCanEdit}
            onChange={e => set('adminCanEdit', e.target.checked)}
            className="w-4 h-4 rounded accent-brand-blue"
          />
          <div>
            <label htmlFor="cs-admin-can-edit" className="text-sm font-medium text-gray-700">Permite consulta e edição pelo Administrador</label>
            <p className="text-xs text-gray-400 mt-0.5">Desmarcado: admin não pode abrir nem editar atendimentos com este status (sigilo clínico reforçado)</p>
          </div>
        </div>
        {isEdit && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              id="cs-active"
              type="checkbox"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 rounded accent-brand-blue"
            />
            <label htmlFor="cs-active" className="text-sm font-medium text-gray-700">Status ativo</label>
          </div>
        )}
      </div>
    </Modal>
  )
}
