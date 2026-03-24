'use client'

import { useEffect, useState } from 'react'

interface AuthData {
  user: {
    id: string
    role_id: string
  } | null
  permissions: string[]
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthData>({
    user: null,
    permissions: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAuth() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data = await res.json()

        setAuth({
          user: data.user,
          permissions: data.permissions || [],
        })

      } catch (error) {
        console.error('Auth load failed', error)
      } finally {
        setLoading(false)
      }
    }

    loadAuth()
  }, [])

  return { ...auth, loading }
}