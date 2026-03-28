'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  documents: any[]
}

export default function ApprovalPipelineTable({ documents }: Props) {
  const router = useRouter()
  const [permissions, setPermissions] = useState<string[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [comment, setComment] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'reviewer' | 'approver'>('reviewer')
  const [activeDoc, setActiveDoc] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      setPermissions(meData.permissions || [])

      const userRes = await fetch('/api/admin/users') // assumes existing admin users route
      const userData = await userRes.json()
      setUsers(userData.users || [])
    }
    init()
  }, [])

  async function workflowAction(documentId: string, action: 'forward' | 'approve' | 'reject') {
    const res = await fetch('/api/documents/workflow/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        action,
        role: selectedRole,
        comment,
        forward_to: selectedUser,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.error || 'Action failed')
      return
    }

    setComment('')
    setSelectedUser('')
    setActiveDoc(null)
    router.refresh()
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow border">
      <table className="min-w-full text-sm">
        <thead className="bg-sky-50">
          <tr>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-left">Owner</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>

        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-t">
              <td className="px-4 py-3">{doc.title}</td>
              <td className="px-4 py-3">
                {doc.owners?.full_name || doc.owners?.owner_key}
              </td>
              <td className="px-4 py-3">
                {doc.document_types?.name}
              </td>
              <td className="px-4 py-3 capitalize">
                {doc.status}
              </td>

              <td className="px-4 py-3">
                <button
                  onClick={() =>
                    setActiveDoc(activeDoc === doc.id ? null : doc.id)
                  }
                  className="text-sky-600 hover:underline"
                >
                  Manage
                </button>

                {activeDoc === doc.id && (
                  <div className="mt-3 space-y-2 border p-3 rounded bg-gray-50">

                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Enter comment"
                      className="w-full border p-2 rounded text-sm"
                    />

                    <div className="flex gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) =>
                          setSelectedRole(e.target.value as any)
                        }
                        className="border p-2 text-sm"
                      >
                        <option value="reviewer">Reviewer</option>
                        <option value="approver">Approver</option>
                      </select>

                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="border p-2 text-sm"
                      >
                        <option value="">Select User</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          workflowAction(doc.id, 'forward')
                        }
                        className="bg-sky-600 text-white px-3 py-1 text-xs rounded"
                      >
                        Forward
                      </button>

                      <button
                        onClick={() =>
                          workflowAction(doc.id, 'approve')
                        }
                        className="bg-green-600 text-white px-3 py-1 text-xs rounded"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          workflowAction(doc.id, 'reject')
                        }
                        className="bg-red-600 text-white px-3 py-1 text-xs rounded"
                      >
                        Reject
                      </button>
                    </div>

                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}