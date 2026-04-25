import { useState } from 'react'
import { FiClock, FiBell, FiCheckCircle, FiXCircle } from 'react-icons/fi'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Textarea from '../../../components/ui/Textarea'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { supabase } from '../../../lib/supabase'

export const TICKET_TYPES = {
  erro:      { label: 'Erro',     color: 'bg-red-100 text-red-700' },
  duvida:    { label: 'Dúvida',   color: 'bg-purple-100 text-purple-700' },
  melhoria:  { label: 'Melhoria', color: 'bg-teal-100 text-teal-700' },
}

export const TICKET_STATUS = {
  novo:               { label: 'Novo',                   color: 'bg-red-100 text-red-700' },
  em_analise:         { label: 'Em Análise',             color: 'bg-amber-100 text-amber-700' },
  em_desenvolvimento: { label: 'Em Desenvolvimento',     color: 'bg-blue-100 text-blue-700' },
  resolvido:          { label: 'Resolvido',              color: 'bg-green-100 text-green-700' },
  fechado:            { label: 'Fechado',                color: 'bg-gray-100 text-gray-600' },
  reprovado_usuario:  { label: 'Reprovado pelo Usuário', color: 'bg-orange-100 text-orange-700' },
  resposta_admin:     { label: 'Solução registrada',      color: 'bg-indigo-100 text-indigo-700', historyOnly: true },
  visualizado:        { label: 'Resposta visualizada',   color: 'bg-teal-100 text-teal-700', historyOnly: true },
}

const NOTE_MAX = 80

function NoteCell({ note }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = note.length > NOTE_MAX
  return (
    <span className="text-gray-500 italic">
      {expanded || !isLong ? note : note.slice(0, NOTE_MAX) + '…'}
      {isLong && (
        <button
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          className="ml-1 text-brand-blue not-italic underline text-xs"
        >
          {expanded ? 'ver menos' : 'ver mais'}
        </button>
      )}
    </span>
  )
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const EMPTY = { subject: '', type: '', author: '', description: '', solution: '', status: 'novo', nova_resposta: false }

export default function SupportFormModal({ onClose, initial = null, onSaved }) {
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const isAdmin = user?.role === 'admin'
  // Admin que também é terapeuta tem acesso de terapeuta no suporte
  const isSupportAdmin = isAdmin && !user?.id
  const isEdit = !!initial?.id
  const readOnly = isEdit && !isSupportAdmin

  // Usuário sem acesso de admin-suporte com resposta pendente
  const pendingResponse = isEdit && !isSupportAdmin && !!initial?.nova_resposta

  const [form, setForm] = useState(isEdit ? { ...initial, nova_resposta: initial.nova_resposta || false } : { ...EMPTY })
  const [history, setHistory] = useState(initial?.history || [])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Reject flow state
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [acting, setActing] = useState(false)

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

        await supabase.from('support_ticket_history').insert({
          ticket_id: data.id,
          status: 'novo',
          changed_by: user?.name || user?.email || 'Sistema',
        })

        onSaved?.()
        onClose()
      } else {
        const statusChanged = form.status !== initial.status
        const solutionChanged = (form.solution?.trim() || '') !== (initial.solution?.trim() || '')

        const { error } = await supabase
          .from('support_tickets')
          .update({
            subject: form.subject.trim(),
            type: form.type,
            author: form.author.trim(),
            description: form.description.trim(),
            solution: form.solution?.trim() || null,
            status: form.status,
            nova_resposta: form.nova_resposta,
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

        if (solutionChanged && form.solution?.trim()) {
          await supabase.from('support_ticket_history').insert({
            ticket_id: initial.id,
            status: 'resposta_admin',
            changed_by: user?.name || user?.email || '—',
            note: form.solution.trim(),
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

  async function handleApprove() {
    setActing(true)
    try {
      const { error } = await supabase.rpc('approve_support_ticket', { p_ticket_id: initial.id })
      if (error) throw error
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('approve_support_ticket:', err)
      showToast('Erro ao aprovar: ' + (err?.message || JSON.stringify(err)), 'error')
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    setActing(true)
    try {
      const { error } = await supabase.rpc('reject_support_ticket', {
        p_ticket_id: initial.id,
        p_comment: rejectComment,
      })
      if (error) throw error
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('reject_support_ticket:', err)
      showToast('Erro ao reprovar: ' + (err?.message || JSON.stringify(err)), 'error')
    } finally {
      setActing(false)
    }
  }

  const title = isEdit ? `#${initial.id.slice(0, 8).toUpperCase()} — ${initial.subject}` : 'Novo Suporte'
  const hasNotes = history.some(h => h.note)

  return (
    <Modal title={title} onClose={onClose} size="lg">
      <div className="space-y-4">

        {/* Banner de resposta pendente */}
        {pendingResponse && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <FiBell size={16} className="text-amber-500 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Nova resposta disponível</div>
              <div className="text-xs text-amber-600">Avalie a solução abaixo e confirme se está OK ou não.</div>
            </div>
          </div>
        )}

        <Input
          label="Assunto *"
          value={form.subject}
          onChange={e => set('subject', e.target.value)}
          error={errors.subject}
          placeholder="Descreva brevemente o assunto..."
          readOnly={readOnly}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Tipo *" value={form.type} onChange={e => set('type', e.target.value)} error={errors.type} disabled={readOnly}>
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
            readOnly={readOnly}
          />
        </div>

        <Textarea
          label="Descrição Detalhada *"
          value={form.description}
          onChange={e => set('description', e.target.value)}
          error={errors.description}
          placeholder="Descreva com detalhes o erro, dúvida ou melhoria..."
          rows={4}
          readOnly={readOnly}
        />

        {isEdit && (isSupportAdmin || form.solution) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solução</label>
            {readOnly
              ? <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 whitespace-pre-wrap">{form.solution || '—'}</p>
              : <Textarea value={form.solution || ''} onChange={e => set('solution', e.target.value)} placeholder="Descreva a solução aplicada..." rows={3} />
            }
          </div>
        )}

        {isEdit && isSupportAdmin && (
          <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(TICKET_STATUS).filter(([, v]) => !v.historyOnly).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        )}

        {/* Notificação ao usuário — apenas admin-suporte em edição */}
        {isEdit && isSupportAdmin && (
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={form.nova_resposta}
              onChange={e => set('nova_resposta', e.target.checked)}
              className="w-4 h-4 rounded accent-amber-500"
            />
            <div className="flex items-center gap-2">
              <FiBell size={15} className={form.nova_resposta ? 'text-amber-500' : 'text-gray-400'} />
              <div>
                <div className="text-sm font-medium text-gray-800">Notificar usuário sobre esta resposta</div>
                <div className="text-xs text-gray-500">O usuário verá um aviso no dashboard até abrir este chamado</div>
              </div>
            </div>
          </label>
        )}

        {isEdit && !isSupportAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            {(() => { const st = TICKET_STATUS[form.status]; return (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${st?.color || 'bg-gray-100 text-gray-600'}`}>{st?.label || form.status}</span>
            )})()}
          </div>
        )}

        {isEdit && history.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <FiClock size={14} /> Histórico de Mudanças de Status
            </label>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Evento</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Data / Hora</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-500">Responsável</th>
                    {hasNotes && <th className="text-left px-3 py-2 font-semibold text-gray-500">Observação</th>}
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
                        {hasNotes && (
                      <td className="px-3 py-2 max-w-[200px]">
                        {h.note ? <NoteCell note={h.note} /> : <span className="text-gray-400">—</span>}
                      </td>
                    )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        {pendingResponse ? (
          showRejectInput ? (
            <div className="space-y-3 pt-2">
              <Textarea
                label="O que não foi resolvido? *"
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                placeholder="Descreva o que ainda precisa ser resolvido ou o motivo da reprovação..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectInput(false)} disabled={acting}>Voltar</Button>
                <Button
                  variant="danger"
                  onClick={handleReject}
                  disabled={acting || !rejectComment.trim()}
                >
                  {acting ? 'Enviando...' : 'Confirmar Reprovação'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectInput(true)}
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 focus:ring-red-300"
              >
                <FiXCircle size={15} /> Não OK
              </Button>
              <Button variant="success" onClick={handleApprove} disabled={acting}>
                <FiCheckCircle size={15} /> {acting ? 'Aguarde...' : 'OK com a Resposta'}
              </Button>
            </div>
          )
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>{readOnly ? 'Fechar' : 'Cancelar'}</Button>
            {!readOnly && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Abrir Chamado'}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}