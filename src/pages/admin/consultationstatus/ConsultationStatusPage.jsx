import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiFlag } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import HelpButton from '../../../components/ui/HelpButton'
import ConsultationStatusFormModal from './ConsultationStatusFormModal'

export default function ConsultationStatusPage() {
  const { consultationStatuses, updateConsultationStatus, consultations } = useData()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const isAdmin = user?.role === 'admin'

  const filtered = consultationStatuses.filter(s => showInactive ? s.active === false : s.active !== false)

  function getCount(statusId) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return consultations.filter(c => c.consultationStatusId === statusId && c.date >= cutoffStr).length
  }

  function toggleActive(s) {
    updateConsultationStatus(s.id, { active: s.active === false ? true : false })
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Status da Consulta</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpButton title="Como usar Status Atendimento">
            <p><strong>O que é:</strong> cada status controla como o sistema trata um atendimento — obrigatoriedade de campos, financeiro, pendências e mais. Nenhuma regra depende do nome do status, só das flags abaixo.</p>
            <p><strong>Automático:</strong> status atribuído pelo próprio sistema, não aparece para seleção manual de terapeuta (admin ainda consegue selecionar/editar, para correções pontuais).</p>
            <p><strong>Consome sessão pré-paga:</strong> ao atribuir, debita 1 sessão do pacote pré-pago do paciente (quando a especialidade é pré-paga).</p>
            <p><strong>Exibe Observação / Obrigatoriedade da Observação:</strong> quando "Exibe Observação" está marcado, o formulário do atendimento mostra só o campo "Observação" no lugar dos campos clínicos (Objetivo, Relato etc.); "Obrigatoriedade" decide se esse campo é obrigatório.</p>
            <p><strong>Solicita definição de reposição:</strong> ao editar um atendimento e trocar para esse status, o formulário pergunta "Este atendimento terá reposição?" e permite agendar a reposição na hora.</p>
            <p><strong>Padrão de Agendamento:</strong> status inicial usado <em>só</em> quando o sistema cria uma reposição — não é o status padrão de um atendimento novo comum. No máximo 1 status ativo pode ter essa flag.</p>
            <p><strong>Atendimento ainda não aconteceu:</strong> dispensa Objetivo/Relato de serem obrigatórios (o atendimento ainda não ocorreu) e alimenta as colunas de Pendências do Dashboard quando a data já passou. Pode estar marcada em vários status ao mesmo tempo (ex.: Agendada, Confirmada) — é o status alfabeticamente primeiro entre esses que vira o padrão de um atendimento novo.</p>
            <p><strong>Permite consulta e edição pelo Administrador:</strong> se desmarcado, nem o admin consegue abrir ou editar atendimentos com esse status (sigilo clínico reforçado).</p>
          </HelpButton>
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {showInactive ? 'Ver Ativos' : 'Inativos'}
          </button>
          {isAdmin && (
            <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
              <FiPlus size={16} />
              <span className="hidden sm:inline">Novo Status</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiFlag} title="Nenhum status encontrado"
            action={isAdmin && <Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => {
              const isInactive = s.active === false
              const count = getCount(s.id)
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{s.name}</span>
                      {s.automatic && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Automático</span>}
                      {s.consumesPrepaidSession && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Consome pré-paga</span>}
                      {s.showsObservation && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Exibe observação</span>}
                      {s.showsObservation && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">{s.requiresObservation ? 'Observação obrigatória' : 'Observação opcional'}</span>}
                      {s.adminCanEdit === false && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Admin bloqueado</span>}
                      {s.requestsReplacementDecision && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-700">Define reposição</span>}
                      {s.isSchedulingDefault && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Padrão de agendamento</span>}
                      {s.isAwaitingOutcome && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">Aguarda desfecho</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{count} atendimento(s) (últimos 30 dias)</div>
                  </div>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color || 'bg-gray-100 text-gray-700'}`}>
                    {s.name}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditItem(s); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                        <FiEdit2 size={15} />
                      </button>
                      <button onClick={() => toggleActive(s)} className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                        {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && isAdmin && <ConsultationStatusFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />}
    </div>
  )
}