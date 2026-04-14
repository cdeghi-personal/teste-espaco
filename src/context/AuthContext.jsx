import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session.user)
      } else {
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
    try {
      // Busca o role do usuário — maybeSingle não lança erro se não encontrar
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) console.error('Erro ao buscar profile:', profileError)

      const role = profile?.role || 'admin' // fallback seguro: se não tem profile, trata como admin

      // Se for terapeuta, busca o registro de terapeuta para pegar o ID
      let therapist = null
      if (role === 'therapist') {
        const { data } = await supabase
          .from('therapists')
          .select('id, name, specialty, belongs_to_team')
          .eq('user_id', authUser.id)
          .maybeSingle()
        therapist = data
      }

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
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
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
