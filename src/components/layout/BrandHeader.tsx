'use client'

import { useAuth } from '@/hooks/useAuth'

export default function BrandHeader() {
  const { user } = useAuth()

  function handleLogout() {
    // ✅ Hard redirect to server-side logout to clear cookies + remove shell immediately
    window.location.href = '/api/auth/logout'
  }

  return (
    <header className="w-full bg-sky-700 shadow-md">
      <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">

        {/* LEFT */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded shadow flex items-center justify-center">
            <img
              src="/branding/company-logo.png"
              alt="Company Logo"
              className="object-contain w-full h-full"
            />
          </div>

          <div className="text-white">
            <h1 className="text-lg font-bold">
              Digital Registry
            </h1>
            <p className="text-xs text-sky-200">
              Nikosoft Technologies
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {/* USER */}
          <div className="text-right text-white text-sm">
            <p className="font-semibold">
              {user?.id ? `User: ${user.id.slice(0, 8)}…` : 'Guest'}
            </p>
          </div>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>

          {/* CLIENT LOGO */}
          <div className="w-12 h-12 bg-white rounded shadow flex items-center justify-center">
            <img
              src="/branding/client-logo.png"
              alt="Client Logo"
              className="object-contain w-full h-full"
            />
          </div>
        </div>

      </div>
    </header>
  )
}