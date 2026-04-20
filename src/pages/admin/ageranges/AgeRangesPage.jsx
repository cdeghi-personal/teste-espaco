import { useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import AgeRangeFormModal from './AgeRangeFormModal'
import { calculateAgeYears } from '../../../utils/dateUtils'

export default function AgeRangesPage() {
  const { ageRanges, deleteAgeRange, patients } = useData()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const isAdmin = user?.role === 'admin'

  function getPatientCount(range) {
    return patients.filter(p => {
      if (p.deleted) return false
      const age = calculateAgeYears(p.dateOfBirth)
      if (age === null) return false
      return age >= range.minAge && age < range.maxAge
    }).length
  }

  function handleDelete(r) {
    if (confirm(`Excluir a faixa "${r.name}"?`)) deleteAgeRange(r.id)
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Faixas Etárias</h1>
          <p className="text-xs text-gray-500 mt-0.5">{ageRanges.length} cadastrada(s)</p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Nova Faixa</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {ageRanges.length === 0 ? (
          <EmptyState
            icon={FiUsers}
            title="Nenhuma faixa etária cadastrada"
            description="As faixas são usadas para classificar pacientes por idade dinamicamente."
            action={isAdmin && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <FiPlus size={14} /> Nova Faixa
              </Button>
            )}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {ageRanges.map(r => {
              const count = getPatientCount(r)
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <span
                    className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900">{r.name}</span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.minAge} – {r.maxAge - 1} anos
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {r.minAge} ≤ idade &lt; {r.maxAge}
                      {count > 0 && <span className="ml-2 text-brand-blue font-medium">{count} paciente(s)</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditItem(r); setShowModal(true) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <AgeRangeFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />
      )}
    </div>
  )
}