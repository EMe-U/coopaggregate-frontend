import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentManager } from '../api/auth'
import { clearToken, getToken, setToken } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken)
  const [manager, setManager] = useState(null)

  useEffect(() => {
    if (!token) return

    // Ignore a late response if the token changed (e.g. logout) before it arrived.
    let ignore = false
    getCurrentManager()
      .then((data) => {
        if (!ignore) setManager(data)
      })
      .catch(() => {
        if (!ignore) setManager(null)
      })
    return () => {
      ignore = true
    }
  }, [token])

  function signIn(newToken, remember) {
    setToken(newToken, remember)
    setTokenState(newToken)
  }

  function signOut() {
    clearToken()
    setTokenState(null)
    setManager(null)
  }

  return (
    <AuthContext.Provider value={{ token, manager, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
