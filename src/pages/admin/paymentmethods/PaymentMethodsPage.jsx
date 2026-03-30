import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiCreditCard } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import PaymentMethodFormModal from './PaymentMethodFormModal'

export default function PaymentMethodsPage() {
  const { paymentMethods, updatePaymentMethod, patients } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editPM, setEditPM] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = paymentMethods.filter(pm => showInactive ? pm.active === false : pm.active !== false)

  function toggleActive(pm) {
    updatePaymentMethod(pm.id, { active: pm.active === false ? true : false })
  }

  function getPatientCount(pmId) {
    return patients.filter(p => !p.deleted && p.paymentMethodId === pmId).length
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Formas de Pagamento</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} cadastrada(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {showInactive ? 'Ver Ativas' : 'Inativas'}
          </button>
          <Button variant="primary" onClick={() => { setEditPM(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Nova Forma</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiCreditCard} title="Nenhuma forma de pagamento encontrada"
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Cadastrar</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(pm => {
              const isInactive = pm.active === false
              const count = getPatientCount(pm.id)
              return (
                <div key={pm.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-brand-yellow/20 flex items-center justify-center shrink-0">
                    <FiCreditCard size={14} className="text-brand-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{pm.name}</div>
                    {count > 0 && <div className="text-xs text-gray-400 mt-0.5">{count} paciente(s)</div>}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isInactive ? 'Inativa' : 'Ativa'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditPM(pm); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                      <FiEdit2 size={15} />
                    </button>
                    <button onClick={() => toggleActive(pm)} className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title={isInactive ? 'Ativar' : 'Desativar'}>
                      {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <PaymentMethodFormModal onClose={() => setShowModal(false)} initial={editPM || {}} />}
    </div>
  )
}
