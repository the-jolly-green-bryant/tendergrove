import { createContext, ReactNode, useContext } from 'react'
import type { AuthUser } from 'aws-amplify/auth'

export const GROVE_SCORE_OWNER_EMAIL = 'bryant@bryantjames.com'

export const isGroveScoreOwner = (
  user?: AuthUser,
  verifiedEmail?: string,
): boolean => {
  const identities = [
    verifiedEmail,
    user?.username,
    user?.signInDetails?.loginId,
  ]
  return identities.some(
    (identity) =>
      identity?.trim().toLowerCase() === GROVE_SCORE_OWNER_EMAIL,
  )
}

interface AuthContextValue {
  user?: AuthUser
  email?: string
  emailResolved?: boolean
  signOut?: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({
  user,
  email,
  emailResolved,
  signOut,
  children,
}: AuthContextValue & { children: ReactNode }) => (
  <AuthContext.Provider value={{ user, email, emailResolved, signOut }}>
    {children}
  </AuthContext.Provider>
)

export const useAppAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAppAuth must be used inside AuthProvider')
  }

  return context
}
