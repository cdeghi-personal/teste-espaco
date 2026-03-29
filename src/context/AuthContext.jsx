import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_USERS } from '../data/mockUsers'
import { storageGet, storageSet, storageRemove } from '../utils/storageUtils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = storageGet('auth_user')
    if (stored) setUser(stored)
    setIsLoading(false)
  }, [])

  function login(email, password) {
    const found = MOCK_USERS.find(
      (u) => u.email === email.trim().toLowerCase() && u.password === password
    )
    if (!found) return { success: false, error: 'E-mail ou senha incorretos.' }
    const { password: _pw, ...safeUser } = found
    setUser(safeUser)
    storageSet('auth_user', safeUser)
    return { success: true }
  }

  function logout() {
    setUser(null)
    storageRemove('auth_user')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
