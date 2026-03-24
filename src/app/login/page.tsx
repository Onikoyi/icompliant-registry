'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100">

      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-sky-200">

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-sky-700">
            University Registry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Secure Access Portal
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">

          <input
            type="email"
            placeholder="Email address"
            className="w-full border border-sky-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full border border-sky-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 hover:bg-sky-800 text-white py-3 rounded-lg font-semibold transition"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>

        </form>

      </div>

    </div>
  )
}