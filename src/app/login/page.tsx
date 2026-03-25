'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    // ✅ Hard navigation ensures full shell loads immediately after auth
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100 px-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-sky-200">

        {/* LOGOS */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 bg-white rounded-lg shadow flex items-center justify-center border border-gray-200 overflow-hidden">
            <img
              src="/branding/company-logo.png"
              alt="Nikosoft Technologies Limited Logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="text-center flex-1 px-4">
            <h1 className="text-xl font-bold text-sky-700 leading-tight">
              University Digital Registry
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Secure Access Portal
            </p>
          </div>

          <div className="w-14 h-14 bg-white rounded-lg shadow flex items-center justify-center border border-gray-200 overflow-hidden">
            <img
              src="/branding/client-logo.png"
              alt="Client Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. admin@university.edu"
              className="w-full border border-sky-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-sky-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

               <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-sky-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white py-3 rounded-lg font-semibold transition"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>

          <p className="text-[11px] text-gray-500 text-center pt-2">
            Powered by <span className="font-semibold text-sky-700">Nikosoft Technologies Limited</span>
          </p>
        </form>
      </div>
    </div>
  )
}