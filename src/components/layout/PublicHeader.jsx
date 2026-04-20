import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { FiMenu, FiX } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'

const navLinks = [
  { to: ROUTES.HOME, label: 'Início' },
  { to: ROUTES.ABOUT, label: 'Sobre Nós' },
  { to: ROUTES.SERVICES, label: 'Especialidades' },
  { to: ROUTES.TEAM, label: 'Nossa Equipe' },
  { to: ROUTES.CONTACT, label: 'Contato' },
]

export default function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={ROUTES.HOME} className="flex items-center">
            <img src="/logo.jpg" alt="Casa Amarela" className="h-12 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-brand-blue bg-blue-50'
                      : 'text-gray-600 hover:text-brand-blue hover:bg-gray-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://wa.me/5511975799590"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold bg-brand-yellow text-brand-blue rounded-lg hover:bg-brand-yellow-dark transition-all shadow-sm"
            >
              (11) 9 7579-9590
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 pt-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? 'text-brand-blue bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-3 px-4 flex flex-col gap-2">
              <a
                href="https://wa.me/5511975799590"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 text-sm font-semibold text-center bg-brand-yellow text-brand-blue rounded-lg"
              >
                (11) 9 7579-9590
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
