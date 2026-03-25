import './globals.css'
import { ReactNode } from 'react'
import BrandHeader from '@/components/layout/BrandHeader'
import AppFooter from '@/components/layout/AppFooter'
import Sidebar from '@/components/layout/Sidebar'
import { createServerClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Digital Registry',
  description: 'Nikosoft Digital Registry System',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = !!user

  return (
    <html lang="en">
      <body className="bg-slate-50 text-gray-900">
        {!isLoggedIn ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <div className="min-h-screen flex flex-col">
            <BrandHeader />

            <div className="flex flex-1 max-w-7xl mx-auto w-full">
              <div className="hidden md:block">
                <Sidebar />
              </div>

              <main className="flex-1 px-4 md:px-6 py-6">{children}</main>
            </div>

            <AppFooter />
          </div>
        )}
      </body>
    </html>
  )
}