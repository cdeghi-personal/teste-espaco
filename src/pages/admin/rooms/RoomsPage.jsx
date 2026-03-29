import { useState } from 'react'
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiHome } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import RoomFormModal from './RoomFormModal'

export default function RoomsPage() {
  const { rooms, updateRoom } = useData()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const filtered = rooms.filter(r =>
    showInactive ? r.active === false : r.active !== false
  )

  function toggleActive(r) {
    updateRoom(r.id, { active: r.active === false ? true : false })
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} cadastrada(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {showInactive ? 'Ver Ativas' : 'Ver Inativas'}
          </button>
          <Button variant="primary" onClick={() => { setEditItem(null); setShowModal(true) }}>
            <FiPlus size={16} /> Nova Sala
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FiHome} title="Nenhuma sala encontrada"
            action={<Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Nova</Button>} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sala</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const isInactive = r.active === false
                return (
                  <tr key={r.id} className={`hover:bg-gray-50/50 ${isInactive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 text-sm">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{r.description || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isInactive ? 'Inativa' : 'Ativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditItem(r); setShowModal(true) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => toggleActive(r)}
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

      {showModal && <RoomFormModal onClose={() => setShowModal(false)} initial={editItem || {}} />}
    </div>
  )
}
