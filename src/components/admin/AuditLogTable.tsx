'use client'

import { useState } from 'react'

interface Props {
  logs: any[]
}

function formatDate(dateString: string) {
  const date = new Date(dateString)

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
}

export default function AuditLogTable({ logs }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="bg-white shadow border rounded-xl overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-sky-50">
          <tr>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Module</th>
            <th className="px-4 py-3 text-left">Entity</th>
            <th className="px-4 py-3 text-left">Details</th>
          </tr>
        </thead>

        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-t align-top">
              <td className="px-4 py-3">
              {formatDate(log.created_at)}
              </td>

              <td className="px-4 py-3">
                {log.users?.email || 'System'}
              </td>

              <td className="px-4 py-3 font-medium">
                {log.action}
              </td>

              <td className="px-4 py-3">
                {log.entity_type}
              </td>

              <td className="px-4 py-3">
                {log.entity || log.entity_id}
              </td>

              <td className="px-4 py-3">
                <button
                  onClick={() =>
                    setExpanded(expanded === log.id ? null : log.id)
                  }
                  className="text-sky-600 text-xs"
                >
                  {expanded === log.id ? 'Hide' : 'View'}
                </button>

                {expanded === log.id && (
                  <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          No audit logs found.
        </div>
      )}
    </div>
  )
}