'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function BrandHeader() {
  const router = useRouter()
  const { user } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
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
              {user?.id ? 'Authenticated User' : 'Guest'}
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