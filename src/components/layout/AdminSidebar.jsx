import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiGrid, FiCalendar, FiUsers, FiUserCheck, FiClipboard, FiLogOut, FiUserPlus, FiLayers, FiCreditCard, FiActivity, FiFlag, FiHome, FiChevronDown, FiChevronUp, FiBookOpen, FiTag, FiShield, FiMessageSquare, FiBarChart2, FiLifeBuoy, FiUserX, FiBriefcase } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../context/AuthContext'
import { SPECIALTIES } from '../../constants/specialties'
import { supabase } from '../../lib/supabase'

const mainNavItems = [
  { to: ROUTES.DASHBOARD, icon: FiGrid, label: 'Dashboard', end: true },
  { to: ROUTES.AGENDA, icon: FiCalendar, label: 'Agenda' },
  { to: ROUTES.PATIENTS, icon: FiUsers, label: 'Pacientes' },
  { to: ROUTES.GUARDIANS, icon: FiUserCheck, label: 'Responsáveis' },
  { to: ROUTES.CONSULTATIONS, icon: FiClipboard, label: 'Atendimentos' },
  { to: ROUTES.MEDICAL_RECORDS, icon: FiBookOpen, label: 'Prontuário' },
]

// Visíveis a todos os usuários autenticados (read-only para terapeutas)
const configNavItems = [
  { to: ROUTES.THERAPISTS, icon: FiUserPlus, label: 'Terapeutas' },
  { to: ROUTES.SPECIALTIES_ADMIN, icon: FiLayers, label: 'Especialidades' },
  { to: ROUTES.PAYMENT_METHODS, icon: FiCreditCard, label: 'Formas de Pagamento' },
  { to: ROUTES.DIAGNOSES, icon: FiActivity, label: 'Diagnósticos' },
  { to: ROUTES.PATIENT_STATUS, icon: FiFlag, label: 'Status do Paciente' },
  { to: ROUTES.CONSULTATION_STATUS, icon: FiFlag, label: 'Status Atendimento' },
  { to: ROUTES.APPOINTMENT_TYPES, icon: FiTag, label: 'Tipos de Atendimento' },
  { to: ROUTES.ROOMS, icon: FiHome, label: 'Salas' },
  { to: ROUTES.AGE_RANGES, icon: FiUserX, label: 'Faixas Etárias' },
]

function NavItem({ to, icon: Icon, label, end, onClick, badge, badgeColor = 'bg-red-500' }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-blue text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className={`px-1.5 py-0.5 ${badgeColor} text-white text-xs font-bold rounded-full leading-none`}>{badge}</span>
      )}
    </NavLink>
  )
}

export default function AdminSidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [adminExpanded, setAdminExpanded] = useState(false)
  const [newLeadsCount, setNewLeadsCount] = useState(0)
  const [reprovadoCount, setReprovadoCount] = useState(0)

  useEffect(() => {
    if (user?.role !== 'admin') return
    supabase
      .from('contact_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'novo')
      .then(({ count }) => setNewLeadsCount(count || 0))
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'reprovado_usuario')
      .then(({ count }) => setReprovadoCount(count || 0))
  }, [user?.role])

  function handleLogout() {
    logout()
    navigate(ROUTES.LOGIN)
  }

  const specialtyLabel = user?.specialty ? SPECIALTIES[user.specialty]?.label : null
  const isAdmin = user?.role === 'admin'

  return (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-30
      w-64 bg-white border-r border-gray-200 flex flex-col h-screen shrink-0
      transform transition-transform duration-200 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <NavLink to="/" className="flex items-center" onClick={onClose}>
          <img src="/logo.jpg" alt="Casa Amarela" className="h-10 w-auto" />
        </NavLink>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto md:overflow-y-auto">
        {mainNavItems.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}

        {isAdmin && (
          <NavItem
            to={ROUTES.CONTACT_LEADS}
            icon={FiMessageSquare}
            label="Contatos"
            onClick={onClose}
            badge={newLeadsCount}
          />
        )}

        <NavItem
          to={ROUTES.REPORTS}
          icon={FiBarChart2}
          label="Relatórios"
          onClick={onClose}
        />

        <NavItem
          to={ROUTES.SUPPORT}
          icon={FiLifeBuoy}
          label="Suporte"
          onClick={onClose}
          badge={isAdmin ? reprovadoCount : 0}
          badgeColor="bg-orange-500"
        />

        {/* Seção Administração — visível a todos, colapsável */}
        <div className="px-3 pt-4 pb-1">
          <button
            onClick={() => setAdminExpanded(v => !v)}
            className="w-full flex items-center justify-between group"
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">
              Administração
            </span>
            {adminExpanded
              ? <FiChevronUp size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
              : <FiChevronDown size={13} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
            }
          </button>
        </div>

        {adminExpanded && (
          <div className="space-y-1">
            {configNavItems.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}
            {isAdmin && (
              <NavItem to={ROUTES.AUDIT} icon={FiShield} label="Log de Auditoria" onClick={onClose} />
            )}
            {isAdmin && (
              <NavItem to={ROUTES.COMPANY_SETTINGS} icon={FiBriefcase} label="Dados da Empresa" onClick={onClose} />
            )}
          </div>
        )}
      </nav>

      {/* User Info + Logout */}
      <div className="px-3 py-3 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-brand-yellow flex items-center justify-center text-brand-blue font-bold text-sm shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {isAdmin ? 'Administrador' : specialtyLabel || 'Terapeuta'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <FiLogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}