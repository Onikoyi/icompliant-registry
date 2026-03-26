'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
  
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
  
    setLoading(true)
  
    // 1️⃣ Update Supabase Auth password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })
  
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
  
    // 2️⃣ Clear must_reset_password flag
    const res = await fetch('/api/auth/clear-reset-flag', {
      method: 'POST',
    })
  
    if (!res.ok) {
      setError('Failed to finalize reset. Please try again.')
      setLoading(false)
      return
    }
  
    // 3️⃣ Refresh session to sync cookies
    await supabase.auth.refreshSession()
  
    // 4️⃣ Hard redirect
    window.location.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-full max-w-md">

        <h1 className="text-xl font-bold mb-6 text-center">
          Reset Your Password
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              className="w-full border p-3 rounded pr-16"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sky-600"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm Password"
            className="w-full border p-3 rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-700 text-white py-3 rounded"
          >
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}