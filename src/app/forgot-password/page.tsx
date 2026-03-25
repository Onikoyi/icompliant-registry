'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password reset link sent. Check your email.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-white to-amber-100 px-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 border border-sky-200">
        <h1 className="text-xl font-bold text-sky-700 mb-4">
          Forgot Password
        </h1>

        {message && (
          <div className="bg-sky-100 text-sky-700 text-sm p-2 rounded mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email address"
            className="w-full border border-sky-300 p-3 rounded-lg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 text-white py-3 rounded-lg"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div className="text-center text-xs">
            <Link href="/login" className="text-sky-700 hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}