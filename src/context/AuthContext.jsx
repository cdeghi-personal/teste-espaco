import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

async function logSessionEvent(type) {
  try {
    const { error } = await supabase.rpc('log_session_audit', { p_type: type })
    if (error) console.warn('[audit] log_session_audit error:', error)
  } catch (err) {
    console.warn('[audit] log_session_audit catch:', err)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)

  // Detecta se e a primeira chamada a loadUser (sessao restaurada do browser vs. login explicito)
  const isInitialSessionRef = useRef(true)

  useEffect(() => {
    // Sessao inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session.user)
      } else {
        isInitialSessionRef.current = false
        setIsLoading(false)
      }
    })

    // Mudancas de auth (login, logout, convite aceito, reset de senha)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Link de reset de senha clicado — redireciona para tela de definicao de senha
        setNeedsPasswordReset(true)
        setIsLoading(false)
        return
      }
      if (session) {
        loadUser(session.user)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUser(authUser) {
    const wasInitial = isInitialSessionRef.current
    isInitialSessionRef.current = false
    try {
      // Busca o role do usuario — maybeSingle nao lanca erro se nao encontrar
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) console.error('Erro ao buscar profile:', profileError)

      const role = profile?.role || 'admin' // fallback seguro: se nao tem profile, trata como admin

      // Busca registro de terapeuta para qualquer role — admins que tambem sao
      // terapeutas precisam do therapist.id para controle de acesso em alguns modulos
      const { data: therapist } = await supabase
        .from('therapists')
        .select('id, name, specialty, belongs_to_team')
        .eq('user_id', authUser.id)
        .maybeSingle()

      setUser({
        authId: authUser.id,
        // id = therapist table ID — usado para filtrar consultas/agendamentos
        id: therapist?.id || null,
        email: authUser.email,
        role,
        name: therapist?.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
        specialty: therapist?.specialty || null,
        belongsToTeam: therapist?.belongs_to_team || false,
      })
    } catch (err) {
      console.error('Erro ao carregar usuario:', err)
      // Mesmo com erro, mantem o usuario logado com dados minimos
      setUser({
        authId: authUser.id,
        id: null,
        email: authUser.email,
        role: 'admin',
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
        specialty: null,
      })
    } finally {
      setIsLoading(false)
      // Loga o evento de sessao — fire-and-forget via funcao externa (supabase.rpc nao e Promise nativa)
      const loginType = sessionStorage.getItem('_login_type')
      if (loginType) {
        sessionStorage.removeItem('_login_type')
        logSessionEvent(loginType)
      } else if (wasInitial) {
        logSessionEvent('sessao_retomada')
      }
      // TOKEN_REFRESHED e outras chamadas silenciosas: wasInitial=false, sem flag — nao loga
    }
  }

  async function login(email, password) {
    // Flag marcada ANTES do signInWithPassword para garantir que onAuthStateChange
    // ja encontre o tipo correto quando loadUser for chamado
    sessionStorage.setItem('_login_type', 'login')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      sessionStorage.removeItem('_login_type')
      console.error('Supabase login error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: error.message }
    setNeedsPasswordReset(false)
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, needsPasswordReset, login, logout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}