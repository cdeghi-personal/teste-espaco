import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiLayers } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import SpecialtyFormModal from './SpecialtyFormModal'

export default function SpecialtiesPage() {
  const { specialtiesData, updateSpecialtyData } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editSpecialty, setEditSpecialty] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = specialtiesData.filter(s => showInactive ? s.active === false : s.active !== false)

  function toggleActive(s) {
    updateSpecialtyData(s.id, { active: s.active === false ? true : false })
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Especialidades</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} exibida(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {showInactive ? 'Ver Ativas' : 'Inativas'}
          </button>
          <Button variant="primary" onClick={() => { setEditSpecialty(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Nova Especialidade</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiLayers} title="Nenhuma especialidade encontrada"
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Nova Especialidade</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(s => {
              const isInactive = s.active === false
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FiLayers size={14} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-400">{s.key}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isInactive ? 'Inativa' : 'Ativa'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditSpecialty(s); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                      <FiEdit2 size={15} />
                    </button>
                    <button onClick={() => toggleActive(s)} className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title={isInactive ? 'Ativar' : 'Desativar'}>
                      {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && <SpecialtyFormModal onClose={() => setShowModal(false)} initial={editSpecialty || {}} />}
    </div>
  )
}
