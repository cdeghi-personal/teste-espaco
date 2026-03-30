import { Link } from 'react-router-dom'
import { FiPhone, FiMail, FiMapPin, FiClock, FiInstagram, FiFacebook } from 'react-icons/fi'
import { ROUTES } from '../../constants/routes'

export default function PublicFooter() {
  return (
    <footer className="bg-brand-blue text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <img src="/logo.jpg" alt="Espaço Casa Amarela" className="h-16 w-auto rounded-md" />
            </div>
            <p className="text-blue-200 text-sm leading-relaxed">
              Clínica multidisciplinar especializada no cuidado integral de crianças com necessidades especiais.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-9 h-9 bg-white/10 hover:bg-brand-yellow hover:text-brand-blue rounded-lg flex items-center justify-center transition-all">
                <FiInstagram size={16} />
              </a>
              <a href="#" className="w-9 h-9 bg-white/10 hover:bg-brand-yellow hover:text-brand-blue rounded-lg flex items-center justify-center transition-all">
                <FiFacebook size={16} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-brand-yellow mb-4 text-sm uppercase tracking-wide">Navegação</h4>
            <ul className="space-y-2">
              {[
                { to: ROUTES.HOME, label: 'Início' },
                { to: ROUTES.ABOUT, label: 'Sobre Nós' },
                { to: ROUTES.SERVICES, label: 'Especialidades' },
                { to: ROUTES.TEAM, label: 'Nossa Equipe' },
                { to: ROUTES.CONTACT, label: 'Contato' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-blue-200 hover:text-white text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Especialidades */}
          <div>
            <h4 className="font-semibold text-brand-yellow mb-4 text-sm uppercase tracking-wide">Especialidades</h4>
            <ul className="space-y-2">
              {['Fisioterapia', 'Fonoaudiologia', 'Terapia Ocupacional', 'Psicologia'].map((s) => (
                <li key={s} className="text-blue-200 text-sm">{s}</li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold text-brand-yellow mb-4 text-sm uppercase tracking-wide">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-blue-200">
                <FiMapPin size={15} className="mt-0.5 shrink-0 text-brand-yellow" />
                Rua das Crianças, 123<br />São Paulo - SP
              </li>
              <li className="flex items-center gap-2 text-sm text-blue-200">
                <FiPhone size={15} className="shrink-0 text-brand-yellow" />
                (11) 9 9999-9999
              </li>
              <li className="flex items-center gap-2 text-sm text-blue-200">
                <FiMail size={15} className="shrink-0 text-brand-yellow" />
                contato@casaamarela.com.br
              </li>
              <li className="flex items-start gap-2 text-sm text-blue-200">
                <FiClock size={15} className="mt-0.5 shrink-0 text-brand-yellow" />
                Seg–Sex: 8h às 18h<br />Sáb: 8h às 12h
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-blue-300">
          © {new Date().getFullYear()} Espaço Casa Amarela — Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
