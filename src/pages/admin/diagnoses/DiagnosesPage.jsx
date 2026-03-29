import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiSearch, FiActivity } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import DiagnosisFormModal from './DiagnosisFormModal'

export default function DiagnosesPage() {
  const { diagnoses, updateDiagnosis, patients } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diagnósticos / Condições</h1>
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
            <FiPlus size={16} /> Novo Diagnóstico
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Novo</Button>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnóstico / Condição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Pacientes</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(d => {
                const isInactive = d.active === false
                const count = getPatientCount(d.name)
                return (
                  <tr key={d.id} className={`hover:bg-gray-50/50 ${isInactive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{d.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {count > 0 && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {count} paciente(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isInactive ? 'Inativo' : 'Ativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditItem(d); setShowModal(true) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => toggleActive(d)}
                          className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={isInactive ? 'Ativar' : 'Desativar'}>
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

      {showModal && <DiagnosisFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />}
    </div>
  )
}
