import { useState } from 'react'
import { FiPlus, FiSearch, FiEdit2, FiToggleLeft, FiToggleRight, FiUserPlus } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import TherapistFormModal from './TherapistFormModal'
import { SPECIALTIES } from '../../../constants/specialties'

export default function TherapistsPage() {
  const { therapists, updateTherapist, patients } = useData()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editTherapist, setEditTherapist] = useState(null)

  function getPatientCount(therapistId) {
    return patients.filter(p =>
      !p.deleted &&
      p.status === 'active' &&
      (p.therapistId === therapistId || (p.secondaryTherapistIds || []).includes(therapistId))
    ).length
  }

  const filtered = therapists.filter(t => {
    const matchActive = showInactive ? t.active === false : t.active !== false
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase())
    return matchActive && matchSearch
  })

  function toggleActive(t) {
    const action = t.active !== false ? 'desativar' : 'ativar'
    if (confirm(`Deseja ${action} o terapeuta "${t.name}"?`)) {
      updateTherapist(t.id, { active: t.active === false ? true : false })
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Terapeutas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} exibido(s)</p>
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
          <Button variant="primary" onClick={() => { setEditTherapist(null); setShowModal(true) }}>
            <FiPlus size={16} /> Novo Terapeuta
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FiUserPlus}
            title="Nenhum terapeuta encontrado"
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Cadastrar Terapeuta</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Terapeuta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Especialidade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contato</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Registro</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pacientes</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => {
                  const isInactive = t.active === false
                  const spec = t.specialty ? SPECIALTIES[t.specialty] : null
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                            isInactive ? 'bg-gray-100 text-gray-400' : 'bg-brand-yellow/20 text-brand-blue'
                          }`}>
                            {t.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{t.name}</div>
                            {isInactive && <div className="text-xs text-red-500">Inativo</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {spec ? <Badge specialty={t.specialty} /> : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          {t.email && <div>{t.email}</div>}
                          {t.phone && <div>{t.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{t.credential || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {getPatientCount(t.id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditTherapist(t); setShowModal(true) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            onClick={() => toggleActive(t)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isInactive
                                ? 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={isInactive ? 'Ativar' : 'Desativar'}
                          >
                            {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TherapistFormModal onClose={() => setShowModal(false)} initial={editTherapist || {}} />
      )}
    </div>
  )
}
