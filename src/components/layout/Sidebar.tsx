'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Sidebar() {
  const pathname = usePathname()
  const { permissions } = useAuth()

  const linkClass = (path: string) =>
    `block px-4 py-2 rounded-md text-sm font-medium transition ${
      pathname.startsWith(path)
        ? 'bg-sky-700 text-white shadow'
        : 'text-gray-700 hover:bg-sky-100'
    }`

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-full p-4 space-y-2">
      
          <h2 className="text-xs font-semibold text-gray-400 mb-4">
            NAVIGATION
          </h2>
      
          {/* ALWAYS VISIBLE */}
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            Dashboard
          </Link>
      
          <Link href="/students" className={linkClass('/students')}>
            Students
          </Link>
      
          <Link href="/staff" className={linkClass('/staff')}>
            Staff
          </Link>
      
          <Link href="/admin/config" className={linkClass('/admin/config')}>
            System Config
          </Link>
      
        </aside>
      )
}