import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session.user)
      } else {
        setIsLoading(false)
      }
    })

    // Mudanças de auth (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      // Busca o role do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()

      // Se for terapeuta, busca o registro de terapeuta para pegar o ID
      let therapist = null
      if (profile?.role === 'therapist') {
        const { data } = await supabase
          .from('therapists')
          .select('id, name, specialty')
          .eq('user_id', authUser.id)
          .single()
        therapist = data
      }

      setUser({
        authId: authUser.id,
        // id = therapist table ID — usado para filtrar consultas/agendamentos
        id: therapist?.id || null,
        email: authUser.email,
        role: profile?.role || 'therapist',
        name: therapist?.name || authUser.email,
        specialty: therapist?.specialty || null,
      })
    } catch (err) {
      console.error('Erro ao carregar usuário:', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { success: false, error: 'E-mail ou senha incorretos.' }
    return { success: true }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
