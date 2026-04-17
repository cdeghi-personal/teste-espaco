import { useState } from 'react'
import { FiClock } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'

export const TICKET_TYPES = {
  erro:      { label: 'Erro',     color: 'bg-red-100 text-red-700' },
  duvida:    { label: 'Dúvida',   color: 'bg-purple-100 text-purple-700' },
  melhoria:  { label: 'Melhoria', color: 'bg-teal-100 text-teal-700' },
}

export const TICKET_STATUS = {
  novo:             { label: 'Novo',              color: 'bg-red-100 text-red-700' },
  em_analise:       { label: 'Em Análise',        color: 'bg-amber-100 text-amber-700' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', color: 'bg-blue-100 text-blue-700' },
  resolvido:        { label: 'Resolvido',         color: 'bg-green-100 text-green-700' },
  fechado:          { label: 'Fechado',           color: 'bg-gray-100 text-gray-600' },
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const EMPTY = { subject: '', type: '', author: '', description: '', solution: '', status: 'novo' }

export default function SupportFormModal({ onClose, initial = null, onSaved }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isEdit = !!initial?.id
  // Não-admin vê seus tickets em modo somente leitura (sem editar status/solução)
  const readOnly = isEdit && !isAdmin

  const [form, setForm] = useState(isEdit ? { ...initial } : { ...EMPTY })
  const [history, setHistory] = useState(initial?.history || [])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.subject?.trim()) e.subject = 'Obrigatório'
    if (!form.type) e.type = 'Selecione'
    if (!form.author?.trim()) e.author = 'Obrigatório'
    if (!form.description?.trim()) e.description = 'Obrigatório'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)

    try {
      if (!isEdit) {
        // Criação: status sempre "novo"
        const { data, error } = await supabase
          .from('support_tickets')
          .insert({
            subject: form.subject.trim(),
            type: form.type,
            author: form.author.trim(),
            description: form.description.trim(),
            status: 'novo',
            created_by_id: user?.authId || null,
          })
          .select()
          .single()
        if (error) throw error

        // Histórico inicial
        await supabase.from('support_ticket_history').insert({
          ticket_id: data.id,
          status: 'novo',
          changed_by: user?.name || user?.email || 'Sistema',
        })

        onSaved?.()
        onClose()
      } else {
        // Edição
        const statusChanged = form.status !== initial.status

        const { error } = await supabase
          .from('support_tickets')
          .update({
            subject: form.subject.trim(),
            type: form.type,
            author: form.author.trim(),
            description: form.description.trim(),
            solution: form.solution?.trim() || null,
            status: form.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initial.id)
        if (error) throw error

        if (statusChanged) {
          await supabase.from('support_ticket_history').insert({
            ticket_id: initial.id,
            status: form.status,
            changed_by: user?.name || user?.email || '—',
          })
        }

        onSaved?.()
        onClose()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const title = isEdit ? `#${initial.id.slice(0, 8).toUpperCase()} — ${initial.subject}` : 'Novo Suporte'

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="space-y-4">

        {/* Assunto */}
        <Input
          label="Assunto *"
          value={form.subject}
          onChange={e => set('subject', e.target.value)}
          error={errors.subject}
          placeholder="Descreva brevemente o assunto..."
        />

        {/* Tipo + Autor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tipo *" value={form.type} onChange={e => set('type', e.target.value)} error={errors.type}>
            <option value="">Selecione</option>
            {Object.entries(TICKET_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
          <Input
            label="Autor *"
            value={form.author}
            onChange={e => set('author', e.target.value)}
            error={errors.author}
            placeholder="Nome do solicitante"
          />
        </div>

        {/* Descrição */}
        <Textarea
          label="Descrição Detalhada *"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          error={errors.description}
          placeholder="Descreva com detalhes o erro, dúvida ou melhoria..."
          rows={4}
        />

        {/* Solução — admin pode editar; não-admin vê somente leitura se preenchida */}
        {isEdit && (isAdmin || form.solution) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solução</label>
            {readOnly
              ? <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 whitespace-pre-wrap">{form.solution || '—'}</p>
              : <Textarea value={form.solution || ''} onChange={e => set('solution', e.target.value)} placeholder="Descreva a solução aplicada..." rows={3} />
            }
          </div>
        )}

        {/* Status — apenas para admin */}
        {isEdit && isAdmin && (
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(TICKET_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        )}

        {/* Status — não-admin vê badge sem editar */}
        {isEdit && !isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            {(() => { const st = TICKET_STATUS[form.status]; return (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${st?.color || 'bg-gray-100 text-gray-600'}`}>{st?.label || form.status}</span>
            )})()}
          </div>
        )}

        {/* Histórico — apenas na edição */}
        {isEdit && history.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <FiClock size={14} /> Histórico de Mudanças de Status
            </label>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Status</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Data / Hora</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const st = TICKET_STATUS[h.status]
                    return (
                      <tr key={h.id || i} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${st?.color || 'bg-gray-100 text-gray-600'}`}>
                            {st?.label || h.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{formatDateTime(h.changed_at)}</td>
                        <td className="px-3 py-2 text-gray-700 font-medium">{h.changed_by}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Abrir Chamado'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
