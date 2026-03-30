import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FiGrid, FiCalendar, FiUsers, FiUserCheck, FiClipboard, FiLogOut, FiUserPlus, FiLayers, FiCreditCard, FiActivity, FiFlag, FiHome, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'
import { useAuth } from '../../context/AuthContext'
import { SPECIALTIES } from '../../constants/specialties'

const mainNavItems = [
  { to: ROUTES.DASHBOARD, icon: FiGrid, label: 'Dashboard', end: true },
  { to: ROUTES.AGENDA, icon: FiCalendar, label: 'Agenda' },
  { to: ROUTES.PATIENTS, icon: FiUsers, label: 'Pacientes' },
  { to: ROUTES.GUARDIANS, icon: FiUserCheck, label: 'Responsáveis' },
  { to: ROUTES.CONSULTATIONS, icon: FiClipboard, label: 'Consultas' },
]

const adminNavItems = [
  { to: ROUTES.THERAPISTS, icon: FiUserPlus, label: 'Terapeutas' },
  { to: ROUTES.SPECIALTIES_ADMIN, icon: FiLayers, label: 'Especialidades' },
  { to: ROUTES.PAYMENT_METHODS, icon: FiCreditCard, label: 'Formas de Pagamento' },
  { to: ROUTES.DIAGNOSES, icon: FiActivity, label: 'Diagnósticos' },
  { to: ROUTES.PATIENT_STATUS, icon: FiFlag, label: 'Status do Paciente' },
  { to: ROUTES.ROOMS, icon: FiHome, label: 'Salas' },
]

function NavItem({ to, icon: Icon, label, end, onClick }) {
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
      {label}
    </NavLink>
  )
}

export default function AdminSidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [adminExpanded, setAdminExpanded] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
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

      {/* Nav — scrollável apenas no desktop; no mobile é fixo para caber tudo */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto md:overflow-y-auto">
        {mainNavItems.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}

        {isAdmin && (
          <>
            {/* Header da seção Admin — clicável para expandir/colapsar */}
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
                {adminNavItems.map(item => <NavItem key={item.to} {...item} onClick={onClose} />)}
              </div>
            )}
          </>
        )}
      </nav>

      {/* User Info + Logout — sempre visível */}
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
