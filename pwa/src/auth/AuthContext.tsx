import { createContext, ReactNode, useContext } from 'react'
import type { AuthUser } from 'aws-amplify/auth'

interface AuthContextValue {
  user?: AuthUser
  signOut?: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({
  user,
  signOut,
  children,
}: AuthContextValue & { children: ReactNode }) => {
  return (
    <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>
  )
}

export const useAppAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAppAuth must be used inside AuthProvider')
  }

  return context
}
