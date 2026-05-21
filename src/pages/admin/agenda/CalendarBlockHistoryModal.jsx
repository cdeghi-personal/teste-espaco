import { useState, useEffect } from 'react'
import Modal from '../../../components/ui/Modal'
import Button from '../../../components/ui/Button'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Spinner from '../../../components/ui/Spinner'

export default function CalendarBlockHistoryModal({ onClose, therapistId }) {
  const { therapists, getCalendarBlockHistory } = useData()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCalendarBlockHistory(therapistId || null).then(data => {
      if (!cancelled) {
        setBlocks(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [therapistId, getCalendarBlockHistory])

  function getTherapistName(id) {
    return therapists.find(t => t.id === id)?.name || '—'
  }

  function fmtDate(d) {
    if (!d) return '—'
    return d.split('-').reverse().join('/')
  }

  function fmtTime(t) {
    if (!t) return '—'
    return t.slice(0, 5)
  }

  return (
    <Modal
      title="Histórico de Bloqueios de Agenda"
      onClose={onClose}
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">Nenhum bloqueio encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Horário</th>
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                {isAdmin && <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Terapeuta</th>}
                <th className="pb-2 pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blocks.map(b => (
                <tr key={b.id} className={b.cancelled ? 'opacity-50' : ''}>
                  <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                    {fmtDate(b.date)}
                    {b.seriesId && (
                      <span className="ml-1 px-1 py-0.5 rounded text-xs bg-indigo-50 text-indigo-600">Série</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                    {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      b.blockType === 'TOTAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {b.blockType === 'TOTAL' ? 'Total' : 'Parcial'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-2 pr-3 text-gray-700 text-xs">{getTherapistName(b.therapistId)}</td>
                  )}
                  <td className="py-2 pr-3 text-gray-500 text-xs max-w-[200px] truncate">
                    {b.description || '—'}
                  </td>
                  <td className="py-2">
                    {b.cancelled ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Cancelado</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700">Ativo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
