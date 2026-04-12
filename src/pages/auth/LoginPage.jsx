import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiCheck } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { ROUTES } from '../../constants/routes'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD

  // Redireciona assim que o user for carregado após o login
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    if (!result.success) {
      setLoading(false)
      setError(result.error)
    }
    // sucesso: o useEffect acima redireciona quando isAuthenticated mudar
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Informe seu e-mail.'); return }
    setError('')
    setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-senha`,
    })
    setForgotLoading(false)
    setForgotSent(true)
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
          {/* Logo oficial */}
          <div className="flex justify-center mb-6">
            <img src="/logo.jpg" alt="Espaço Casa Amarela" className="h-20 w-auto rounded-xl shadow-sm" />
          </div>

          {forgotSent ? (
            /* Confirmação de envio */
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <FiCheck size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">E-mail enviado!</h2>
              <p className="text-sm text-gray-500">
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
              </p>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false) }}
                className="text-sm text-brand-blue hover:underline mt-2"
              >
                Voltar ao login
              </button>
            </div>
          ) : forgotMode ? (
            /* Modo esqueci minha senha */
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-1 text-center">Recuperar senha</h1>
              <p className="text-sm text-gray-500 text-center mb-6">
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <div className="relative">
                    <FiMail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>

              <button
                onClick={() => { setForgotMode(false); setError('') }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
              >
                Voltar ao login
              </button>
            </>
          ) : (
            /* Modo login normal */
            <>
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
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Senha</label>
                    <button
                      type="button"
                      onClick={() => { setForgotMode(true); setError('') }}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <FiLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
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
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm mt-2"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
