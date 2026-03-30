import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiFlag } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import PatientStatusFormModal from './PatientStatusFormModal'

export default function PatientStatusPage() {
  const { patientStatuses, updatePatientStatus, patients } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = patientStatuses.filter(s =>
    showInactive ? s.active === false : s.active !== false
  )

  function getPatientCount(statusId) {
    return patients.filter(p => !p.deleted && p.statusId === statusId).length
  }

  function toggleActive(s) {
    updatePatientStatus(s.id, { active: s.active === false ? true : false })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Status do Paciente</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} cadastrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {showInactive ? 'Ver Ativos' : 'Ver Inativos'}
          </button>
          <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <FiPlus size={16} /> Novo Status
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiFlag} title="Nenhum status encontrado"
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo</Button>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Badge</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Ativo?</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => {
                const isInactive = s.active === false
                return (
                  <tr key={s.id} className={`hover:bg-gray-50/50 ${isInactive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color || 'bg-gray-100 text-gray-700'}`}>
                        {s.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isInactive ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditItem(s); setShowModal(true) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => toggleActive(s)}
                          className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
                          {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <PatientStatusFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />}
    </div>
  )
}
