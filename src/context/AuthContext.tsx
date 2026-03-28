'use client'

import { createContext, useContext } from 'react'

interface AuthContextType {
  user: any
  permissions: string[]
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: [],
})

export function AuthProvider({
  children,
  user,
  permissions,
}: {
  children: React.ReactNode
  user: any
  permissions: string[]
}) {
  return (
    <AuthContext.Provider value={{ user, permissions }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}