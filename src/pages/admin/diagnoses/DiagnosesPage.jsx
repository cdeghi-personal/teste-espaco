import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiSearch, FiActivity } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import DiagnosisFormModal from './DiagnosisFormModal'

export default function DiagnosesPage() {
  const { diagnoses, updateDiagnosis, patients } = useData()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')
  const isAdmin = user?.role === 'admin'

  const filtered = diagnoses.filter(d => {
    const matchActive = showInactive ? d.active === false : d.active !== false
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase())
    return matchActive && matchSearch
  })

  function getPatientCount(diagName) {
    return patients.filter(p =>
      !p.deleted &&
      ((p.conditions || []).includes(diagName) || (p.conditionIds || []).includes(diagName))
    ).length
  }

  function toggleActive(d) {
    updateDiagnosis(d.id, { active: d.active === false ? true : false })
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Diagnósticos</h1>
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
              <span className="hidden sm:inline">Novo Diagnóstico</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar diagnóstico..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiActivity} title="Nenhum diagnóstico encontrado"
            action={isAdmin && <Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(d => {
              const isInactive = d.active === false
              const count = getPatientCount(d.name)
              return (
                <div key={d.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">{d.name}</div>
                    {count > 0 && <div className="text-xs text-gray-400 mt-0.5">{count} paciente(s)</div>}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isInactive ? 'Inativo' : 'Ativo'}
                  </span>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditItem(d); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                        <FiEdit2 size={15} />
                      </button>
                      <button onClick={() => toggleActive(d)} className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title={isInactive ? 'Ativar' : 'Desativar'}>
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

      {showModal && isAdmin && <DiagnosisFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />}
    </div>
  )
}
