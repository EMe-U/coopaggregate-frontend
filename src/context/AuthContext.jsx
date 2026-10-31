import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentManager } from '../api/auth'
import { clearToken, getToken, setToken } from '../utils/auth'
import { clearRegistrationDraft } from '../members/identityVerification'

const AuthContext = createContext(null)

// Shown in the top bar when /api/auth/me cannot be reached, for example while offline.
const LAST_MANAGER_KEY = 'lastManager'

function lastKnownManager() {
  try {
    return JSON.parse(localStorage.getItem(LAST_MANAGER_KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken)
  const [manager, setManager] = useState(null)

  useEffect(() => {
    if (!token) return

    // Ignore a late response if the token changed (e.g. logout) before it arrived.
    let ignore = false
    getCurrentManager()
      .then((data) => {
        if (ignore) return
        setManager(data)
        localStorage.setItem(LAST_MANAGER_KEY, JSON.stringify({ name: data.name }))
      })
      .catch((error) => {
        if (!ignore) setManager(error.response ? null : lastKnownManager())
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
    localStorage.removeItem(LAST_MANAGER_KEY)
    clearRegistrationDraft()
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
