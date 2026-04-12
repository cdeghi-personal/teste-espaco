import { useState } from 'react'
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUserCheck, FiPhone, FiMail, FiEyeOff, FiEye, FiRotateCcw } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import GuardianFormModal from './GuardianFormModal'

export default function GuardiansPage() {
  const { guardians, patients, deleteGuardian, restoreGuardian, logAudit } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editGuardian, setEditGuardian] = useState(null)
  const [viewGuardian, setViewGuardian] = useState(null)

  // Determina quais IDs de pacientes este usuário tem acesso
  // Admin: todos | Equipe: todos retornados pelo RLS (já filtrado no DataContext) | Fora da equipe: apenas os seus
  const accessiblePatientIds = user?.role === 'admin' || user?.belongsToTeam
    ? patients.map(p => p.id)
    : patients
        .filter(p => p.therapistId === user?.id || (p.involvedTherapistIds || []).includes(user?.id))
        .map(p => p.id)

  // Responsáveis visíveis: admin vê todos; demais veem apenas os vinculados a pacientes acessíveis
  const accessibleGuardians = user?.role === 'admin'
    ? guardians
    : guardians.filter(g => (g.patientIds || []).some(pid => accessiblePatientIds.includes(pid)))

  function getLinkedPatients(guardian) {
    const ids = guardian.patientIds || []
    return patients.filter(p => !p.deleted && ids.includes(p.id))
  }

  const filtered = accessibleGuardians.filter(g => {
    const matchActive = showInactive ? g.active === false : g.active !== false
    const linkedPatients = getLinkedPatients(g)
    const matchSearch = !search ||
      g.fullName.toLowerCase().includes(search.toLowerCase()) ||
      g.cpf?.includes(search) ||
      g.phone?.includes(search) ||
      linkedPatients.some(p => p.fullName.toLowerCase().includes(search.toLowerCase()))
    return matchActive && matchSearch
  })

  function handleDelete(id, name) {
    if (confirm(`Desativar "${name}"?`)) deleteGuardian(id)
  }

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Responsáveis</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} exibido(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`p-2 rounded-xl border transition-all ${showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-500 border-gray-200'}`}
            title={showInactive ? 'Ver Ativos' : 'Ver Inativos'}
          >
            <FiEyeOff size={16} />
          </button>
          <Button variant="primary" onClick={() => { setEditGuardian(null); setShowModal(true) }}>
            <FiPlus size={16} />
            <span className="hidden sm:inline">Novo Responsável</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <div className="relative">
        <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF, telefone ou nome do paciente..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FiUserCheck}
            title={showInactive ? 'Nenhum responsável inativo' : 'Nenhum responsável encontrado'}
            action={!showInactive && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <FiPlus size={14} /> Cadastrar Responsável
              </Button>
            )}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map(g => {
                const linkedPatients = getLinkedPatients(g)
                const isInactive = g.active === false
                return (
                  <div key={g.id} className={`px-3 py-3 flex items-center gap-3 ${isInactive ? 'opacity-60' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-700'}`}>
                      {g.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{g.fullName}</div>
                      <div className="text-xs text-gray-500">{g.relationship}{isInactive ? ' · Inativo' : ''}</div>
                      {g.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <FiPhone size={10} />{g.phone}
                        </div>
                      )}
                      {linkedPatients.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {linkedPatients.map(p => p.fullName).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isInactive ? (
                        <button onClick={() => restoreGuardian(g.id)} className="p-2 rounded-lg text-gray-400"><FiRotateCcw size={15} /></button>
                      ) : (
                        <>
                          <button onClick={() => { setViewGuardian(g); logAudit('VIEW', 'guardians', g.id, g.fullName) }} className="p-2 rounded-lg text-gray-400"><FiEye size={15} /></button>
                          <button onClick={() => { setEditGuardian(g); setShowModal(true); logAudit('VIEW', 'guardians', g.id, g.fullName) }} className="p-2 rounded-lg text-gray-400"><FiEdit2 size={15} /></button>
                          <button onClick={() => handleDelete(g.id, g.fullName)} className="p-2 rounded-lg text-gray-400"><FiTrash2 size={15} /></button>
                        </>
                      )}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contato</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente(s)</th>
                    <th className="px-4 py-3 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(g => {
                    const linkedPatients = getLinkedPatients(g)
                    const isInactive = g.active === false
                    return (
                      <tr key={g.id} className={`hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-700'}`}>
                              {g.fullName?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{g.fullName}</div>
                              <div className="text-xs text-gray-400">{g.relationship}{isInactive && ' • Inativo'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600"><FiPhone size={11} className="text-gray-400 shrink-0" /><span>{g.phone || '—'}</span></div>
                            {g.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><FiMail size={11} className="text-gray-400 shrink-0" /><span className="truncate max-w-[180px]">{g.email}</span></div>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {linkedPatients.length === 0 ? (
                            <span className="text-xs text-gray-400">Nenhum</span>
                          ) : (
                            <div className="space-y-1">
                              {linkedPatients.map(p => (
                                <div key={p.id} className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-brand-yellow shrink-0" />
                                  <span className="text-xs text-gray-700">{p.fullName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {isInactive ? (
                              <button onClick={() => restoreGuardian(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"><FiRotateCcw size={15} /></button>
                            ) : (
                              <>
                                <button onClick={() => { setViewGuardian(g); logAudit('VIEW', 'guardians', g.id, g.fullName) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"><FiEye size={15} /></button>
                                <button onClick={() => { setEditGuardian(g); setShowModal(true); logAudit('VIEW', 'guardians', g.id, g.fullName) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"><FiEdit2 size={15} /></button>
                                <button onClick={() => handleDelete(g.id, g.fullName)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><FiTrash2 size={15} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && <GuardianFormModal onClose={() => setShowModal(false)} initial={editGuardian || {}} />}
      {viewGuardian && <GuardianFormModal onClose={() => setViewGuardian(null)} initial={viewGuardian} readOnly />}
    </div>
  )
}
