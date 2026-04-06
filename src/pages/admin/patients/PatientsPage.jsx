import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUser, FiRotateCcw, FiEyeOff, FiChevronRight } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import PatientFormModal from './PatientFormModal'
import { calculateAge, formatDateShort } from '../../../utils/dateUtils'
import { SPECIALTY_LIST, SPECIALTIES } from '../../../constants/specialties'

export default function PatientsPage() {
  const { patients, deletePatient, restorePatient, patientStatuses } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editPatient, setEditPatient] = useState(null)

  const accessiblePatients = user?.role === 'admin'
    ? patients
    : patients.filter(p => p.therapistId === user?.id)

  const filtered = accessiblePatients.filter(p => {
    const matchDeleted = showDeleted ? p.deleted === true : !p.deleted
    const matchSearch = !search ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf?.includes(search) ||
      p.diagnosis?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || (p.statusId || p.status) === filterStatus
    const matchSpecialty = !filterSpecialty || p.specialties?.includes(filterSpecialty)
    return matchDeleted && matchSearch && matchStatus && matchSpecialty
  })

  function handleDelete(id, name) {
    if (confirm(`Desativar "${name}"?`)) deletePatient(id)
  }

  function handleRestore(id, name) {
    if (confirm(`Restaurar "${name}"?`)) restorePatient(id)
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} exibido(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDeleted(v => !v)}
            className={`p-2 rounded-xl border transition-all ${
              showDeleted ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200'
            }`}
            title={showDeleted ? 'Ver Ativos' : 'Ver Inativos'}
          >
            <FiEyeOff size={16} />
          </button>
          <Button variant="primary" onClick={() => { setEditPatient(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Novo Paciente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou diagnóstico..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
          />
        </div>
        {!showDeleted && (
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Status</option>
              {patientStatuses.filter(s => s.active !== false).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterSpecialty}
              onChange={e => setFilterSpecialty(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-blue outline-none"
            >
              <option value="">Especialidade</option>
              {SPECIALTY_LIST.map(k => <option key={k} value={k}>{SPECIALTIES[k].label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FiUser}
            title={showDeleted ? 'Nenhum paciente inativo' : 'Nenhum paciente encontrado'}
            description={showDeleted ? '' : 'Tente ajustar os filtros ou cadastre um novo paciente.'}
            action={!showDeleted && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <FiPlus size={14} /> Cadastrar Paciente
              </Button>
            )}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map(p => {
                const sid = p.statusId || p.status
                const ps = patientStatuses.find(s => s.id === sid)
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-3 ${!p.deleted ? 'active:bg-gray-50' : 'opacity-60'}`}
                    onClick={() => !p.deleted && navigate(`/admin/pacientes/${p.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                      p.deleted ? 'bg-gray-100 text-gray-400' : 'bg-brand-yellow/20 text-brand-blue'
                    }`}>
                      {p.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{p.fullName}</div>
                      <div className="text-xs text-gray-500">{calculateAge(p.dateOfBirth)}</div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {p.deleted
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Excluído</span>
                          : ps && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.name}</span>
                        }
                        {p.specialties?.slice(0, 1).map(s => <Badge key={s} specialty={s} />)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {p.deleted ? (
                        <button onClick={() => handleRestore(p.id, p.fullName)} className="p-2 rounded-lg text-gray-400">
                          <FiRotateCcw size={15} />
                        </button>
                      ) : (
                        <>
                          <button onClick={() => { setEditPatient(p); setShowModal(true) }} className="p-2 rounded-lg text-gray-400">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(p.id, p.fullName)} className="p-2 rounded-lg text-gray-400">
                            <FiTrash2 size={15} />
                          </button>
                        </>
                      )}
                      {!p.deleted && <FiChevronRight size={14} className="text-gray-300" />}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Idade</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Diagnóstico</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Especialidades</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${p.deleted ? 'opacity-60' : ''}`}
                      onClick={() => !p.deleted && navigate(`/admin/pacientes/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                            p.deleted ? 'bg-gray-100 text-gray-400' : 'bg-brand-yellow/20 text-brand-blue'
                          }`}>
                            {p.fullName?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{p.fullName}</div>
                            <div className="text-xs text-gray-500">{formatDateShort(p.dateOfBirth)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{calculateAge(p.dateOfBirth)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-xs">
                        <span className="truncate block">{p.diagnosis || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {p.specialties?.slice(0, 2).map(s => <Badge key={s} specialty={s} />)}
                          {p.specialties?.length > 2 && <span className="text-xs text-gray-400">+{p.specialties.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.deleted ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Excluído</span>
                        ) : (() => {
                          const sid = p.statusId || p.status
                          const ps = patientStatuses.find(s => s.id === sid)
                          return ps
                            ? <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>{ps.name}</span>
                            : <Badge patientStatus={sid} />
                        })()}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end">
                          {p.deleted ? (
                            <button onClick={() => handleRestore(p.id, p.fullName)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                              <FiRotateCcw size={15} />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { setEditPatient(p); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                                <FiEdit2 size={15} />
                              </button>
                              <button onClick={() => handleDelete(p.id, p.fullName)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <FiTrash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <PatientFormModal onClose={() => setShowModal(false)} initial={editPatient || {}} />
      )}
    </div>
  )
}
