'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  message: string
  action_url?: string
  is_read: boolean
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []))
  }, [])

  const unreadCount = notifications.filter(n => !n.is_read).length

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      )
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg border rounded-lg z-50">
          <div className="p-3 font-semibold border-b">
            Notifications
          </div>

          {notifications.length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              No notifications
            </div>
          )}

          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-3 border-b text-sm ${
                n.is_read ? 'bg-white' : 'bg-sky-50'
              }`}
            >
              <div className="font-medium">{n.title}</div>
              <div className="text-gray-600">{n.message}</div>

              <div className="mt-2 flex justify-between text-xs">
                {n.action_url && (
                  <Link
                    href={n.action_url}
                    className="text-sky-600"
                  >
                    View
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-gray-500"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}