import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)

  // Detecta se é a primeira chamada a loadUser (sessão restaurada do browser vs. login explícito)
  const isInitialSessionRef = useRef(true)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session.user)
      } else {
        isInitialSessionRef.current = false
        setIsLoading(false)
      }
    })

    // Mudanças de auth (login, logout, convite aceito, reset de senha)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Link de reset de senha clicado — redireciona para tela de definição de senha
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
      // Busca o role do usuário — maybeSingle não lança erro se não encontrar
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) console.error('Erro ao buscar profile:', profileError)

      const role = profile?.role || 'admin' // fallback seguro: se não tem profile, trata como admin

      // Busca registro de terapeuta para qualquer role — admins que também são
      // terapeutas precisam do therapist.id para controle de acesso em alguns módulos
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
      console.error('Erro ao carregar usuário:', err)
      // Mesmo com erro, mantém o usuário logado com dados mínimos
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
      // Loga o evento de sessão — fire-and-forget, não bloqueia o carregamento
      const loginType = sessionStorage.getItem('_login_type')
      if (loginType) {
        sessionStorage.removeItem('_login_type')
        supabase.rpc('log_session_audit', { p_type: loginType }).catch(() => {})
      } else if (wasInitial) {
        supabase.rpc('log_session_audit', { p_type: 'sessao_retomada' }).catch(() => {})
      }
      // TOKEN_REFRESHED e outras chamadas silenciosas: wasInitial=false, sem flag → não loga
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('Supabase login error:', error)
      return { success: false, error: error.message }
    }
    // Marca que o próximo loadUser vem de um login explícito via formulário
    sessionStorage.setItem('_login_type', 'login')
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