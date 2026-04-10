import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLock, FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../constants/routes'

const RULES = [
  { id: 'len',     label: 'Mínimo 8 caracteres',           test: p => p.length >= 8 },
  { id: 'upper',   label: 'Pelo menos 1 letra maiúscula',  test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Pelo menos 1 letra minúscula',  test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'Pelo menos 1 número',           test: p => /[0-9]/.test(p) },
  { id: 'special', label: 'Pelo menos 1 caractere especial (!@#$...)', test: p => /[^A-Za-z0-9]/.test(p) },
]

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const ruleResults = RULES.map(r => ({ ...r, ok: r.test(password) }))
  const allRulesOk = ruleResults.every(r => r.ok)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!allRulesOk) {
      setError('A senha não atende todos os requisitos de segurança.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)

    if (result.success) {
      navigate(ROUTES.DASHBOARD, { replace: true })
    } else {
      setError(result.error || 'Erro ao definir senha. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue to-brand-blue-dark flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-brand-yellow rounded-2xl flex items-center justify-center shadow">
              <FiLock size={22} className="text-brand-blue" />
            </div>
            <div>
              <div className="text-sm font-bold text-brand-blue tracking-wide uppercase">Espaço Casa Amarela</div>
              <div className="text-xs text-gray-500">Definir senha de acesso</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Crie sua senha</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Defina uma senha segura para acessar o sistema.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova Senha</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="Digite sua senha"
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

            {/* Indicador de força da senha */}
            {password.length > 0 && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
                {ruleResults.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    {r.ok
                      ? <FiCheck size={13} className="text-green-500 shrink-0" />
                      : <FiX size={13} className="text-gray-300 shrink-0" />
                    }
                    <span className={r.ok ? 'text-green-700' : 'text-gray-400'}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Senha</label>
              <div className="relative">
                <FiLock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition"
                />
                {confirm && (
                  password === confirm
                    ? <FiCheck size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    : <FiX size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allRulesOk}
              className="w-full bg-brand-blue text-white font-semibold py-3.5 rounded-xl hover:bg-brand-blue-dark transition-all disabled:opacity-60 text-sm mt-2"
            >
              {loading ? 'Salvando...' : 'Definir Senha e Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
