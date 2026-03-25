'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS } from '@/lib/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const { permissions = [] } = useAuth()

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

      {NAV_ITEMS
        .filter(item =>
          !item.permission || permissions.includes(item.permission)
        )
        .map(item => (
          <Link
            key={item.path}
            href={item.path}
            className={linkClass(item.path)}
          >
            {item.label}
          </Link>
        ))}
    </aside>
  )
}