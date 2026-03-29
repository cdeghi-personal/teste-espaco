import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 400))
    const result = login(email, password)
    setLoading(false)
    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue to-brand-blue-dark flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-200 hover:text-white text-sm mb-6 transition-colors">
          <FiArrowLeft size={16} /> Voltar ao site
        </Link>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-brand-yellow rounded-2xl flex items-center justify-center shadow">
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
                <path d="M3 12L12 4L21 12V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V12Z"
                  fill="#1B3FAB" />
                <rect x="9.5" y="7" width="5" height="5" rx="0.5" fill="#F5C300" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-brand-blue tracking-wide uppercase">Espaço Casa Amarela</div>
              <div className="text-xs text-gray-500">Área Restrita — Terapeutas</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Bem-vindo(a) de volta</h1>
          <p className="text-sm text-gray-500 text-center mb-8">Entre com suas credenciais para acessar o sistema</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <FiMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs font-medium text-gray-500 mb-2">Credenciais de demonstração:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>ana@casaamarela.com.br — casaamarela123</p>
              <p>admin@casaamarela.com.br — admin2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
