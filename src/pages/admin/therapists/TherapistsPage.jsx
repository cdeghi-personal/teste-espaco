import { useState } from 'react'
import { FiPlus, FiSearch, FiEdit2, FiToggleLeft, FiToggleRight, FiUserPlus } from 'react-icons/fi'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import Badge from '../../../components/ui/Badge'
import Button from '../../../components/ui/Button'
import EmptyState from '../../../components/ui/EmptyState'
import HelpButton from '../../../components/ui/HelpButton'
import TherapistFormModal from './TherapistFormModal'

export default function TherapistsPage() {
  const { therapists, updateTherapist, patients } = useData()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editTherapist, setEditTherapist] = useState(null)
  const isAdmin = user?.role === 'admin'

  function getPatientCount(therapistId) {
    return patients.filter(p =>
      !p.deleted && p.status === 'active' &&
      p.therapistId === therapistId
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
    <div className="p-3 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Terapeutas</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} exibido(s)</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HelpButton title="Como usar Terapeutas">
            <p><strong>Cadastrar:</strong> clique em <em>Novo Terapeuta</em> e preencha nome, especialidades e e-mail. Ao salvar, um convite é enviado por e-mail para o terapeuta definir sua senha.</p>
            <p><strong>Convite:</strong> o terapeuta recebe um e-mail com link para criar a senha. Após o primeiro acesso, ele já aparece como usuário ativo no sistema.</p>
            <p><strong>Editar:</strong> clique no lápis (✏) para editar dados, especialidades e credenciais (nº do conselho regional).</p>
            <p><strong>Ativar/Desativar:</strong> use o botão de toggle para desativar terapeutas que saíram da clínica sem perder o histórico de atendimentos.</p>
            <p><strong>Visibilidade:</strong> terapeutas têm acesso somente leitura a esta seção; alterações são exclusivas de administradores.</p>
          </HelpButton>
          <button
            onClick={() => setShowInactive(v => !v)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showInactive ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {showInactive ? 'Ver Ativos' : 'Inativos'}
          </button>
          {isAdmin && (
            <Button variant="primary" onClick={() => { setEditTherapist(null); setShowModal(true) }}>
              <FiPlus size={16} />
              <span className="hidden sm:inline">Novo Terapeuta</span>
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
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={FiUserPlus}
            title="Nenhum terapeuta encontrado"
            action={isAdmin && <Button variant="primary" onClick={() => setShowModal(true)}><FiPlus size={14} /> Cadastrar Terapeuta</Button>}
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {filtered.map(t => {
                const isInactive = t.active === false
                const count = getPatientCount(t.id)
                const avatarColor = t.color || '#6b7280'
                return (
                  <div key={t.id} className={`px-3 py-3 flex items-center gap-3 ${isInactive ? 'opacity-60' : ''}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 text-white" style={{ backgroundColor: isInactive ? '#9ca3af' : avatarColor }}>
                      {t.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm text-gray-900 truncate">{t.name}</div>
                        {t.belongsToTeam && <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-brand-yellow/30 text-yellow-800">Equipe</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {(t.therapistSpecialties?.length ? t.therapistSpecialties : t.specialty ? [{ specialty: t.specialty }] : []).map((s, i) => (
                          <Badge key={i} specialty={s.specialty} />
                        ))}
                        <span className="text-xs text-gray-500">{count} paciente(s)</span>
                        {isInactive && <span className="text-xs text-red-500">Inativo</span>}
                      </div>
                      {t.email && <div className="text-xs text-gray-400 truncate mt-0.5">{t.email}</div>}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditTherapist(t); setShowModal(true) }} className="p-2 rounded-lg text-gray-400"><FiEdit2 size={15} /></button>
                        <button onClick={() => toggleActive(t)} className={`p-2 rounded-lg ${isInactive ? 'text-gray-400' : 'text-gray-400'}`}>
                          {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
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
                    const avatarColor = t.color || '#6b7280'
                    return (
                      <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 text-white" style={{ backgroundColor: isInactive ? '#9ca3af' : avatarColor }}>
                              {t.name?.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                                {t.belongsToTeam && <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-brand-yellow/30 text-yellow-800">Equipe</span>}
                              </div>
                              {isInactive && <div className="text-xs text-red-500">Inativo</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(t.therapistSpecialties?.length ? t.therapistSpecialties : t.specialty ? [{ specialty: t.specialty }] : []).map((s, i) => (
                              <Badge key={i} specialty={s.specialty} />
                            ))}
                            {!t.therapistSpecialties?.length && !t.specialty && <span className="text-gray-400 text-sm">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-xs text-gray-600 space-y-0.5">
                            {t.email && <div>{t.email}</div>}
                            {t.phone && <div>{t.phone}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">{t.credential || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{getPatientCount(t.id)}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => { setEditTherapist(t); setShowModal(true) }} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"><FiEdit2 size={15} /></button>
                              <button onClick={() => toggleActive(t)} className={`p-1.5 rounded-lg transition-colors ${isInactive ? 'text-gray-400 hover:text-green-600 hover:bg-green-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} title={isInactive ? 'Ativar' : 'Desativar'}>
                                {isInactive ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && isAdmin && <TherapistFormModal onClose={() => setShowModal(false)} initial={editTherapist || {}} />}
    </div>
  )
}
