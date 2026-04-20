import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiFlag } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
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
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{s.name}</span>
                      {s.automatic && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Automático</span>}
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