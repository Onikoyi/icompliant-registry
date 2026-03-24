'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  documents: any[]
}

async function handleSecureView(path: string) {
  const res = await fetch(`/api/documents/view?path=${encodeURIComponent(path)}`)
  const data = await res.json()

  if (data.url) {
    window.open(data.url, '_blank')
  } else {
    alert('Unable to open document')
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700'
    case 'rejected':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

export default function DocumentList({ documents }: Props) {
  const [openDoc, setOpenDoc] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const router = useRouter()

  // 🔐 FETCH PERMISSIONS
  useEffect(() => {
    async function fetchPermissions() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (data.permissions) {
          setPermissions(data.permissions)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingPermissions(false)
      }
    }

    fetchPermissions()
  }, [])

  // 🔐 BLOCK RENDER UNTIL READY (CRITICAL FIX)
  if (loadingPermissions) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading permissions...
      </div>
    )
  }

  async function updateStatus(documentId: string, status: 'approved' | 'rejected') {
    try {
      const res = await fetch('/api/documents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          status,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to update status')
        return
      }

      alert(`Document ${status} successfully`)
      router.refresh()

    } catch (error) {
      console.error(error)
      alert('Something went wrong')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-sky-700">Documents</h2>

      {documents.length === 0 && (
        <p className="text-sm text-gray-500">
          No documents uploaded yet.
        </p>
      )}

      {documents.map((doc) => {
        const versions = doc.document_versions || []
        const latestVersion = versions[0]

        if (!latestVersion) return null

        return (
          <div
            key={doc.id}
            className="border border-sky-200 bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition"
          >
            {/* INFO + STATUS */}
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">
                  {doc.title}
                </p>

                <p className="text-sm text-gray-500">
                  {doc.document_types?.name}
                </p>

                <p className="text-xs text-amber-600 font-medium">
                  Version {latestVersion.version_number}
                </p>
              </div>

              <span
                className={`px-2 py-1 text-xs rounded ${getStatusBadge(
                  doc.status || 'pending'
                )}`}
              >
                {doc.status ? doc.status.toUpperCase() : 'PENDING'}
              </span>
            </div>

            {/* ACTIONS */}
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <button
                onClick={() => handleSecureView(latestVersion.file_path)}
                className="text-sm font-medium text-sky-600 hover:underline"
              >
                View
              </button>

              {permissions.includes('document.approve') && (
  <button
    onClick={() => updateStatus(doc.id, 'approved')}
    className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
  >
    Approve
  </button>
)}

{permissions.includes('document.reject') && (
  <button
    onClick={() => updateStatus(doc.id, 'rejected')}
    className="text-xs px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
  >
    Reject
  </button>
)}

              <button
                onClick={() =>
                  setOpenDoc(openDoc === doc.id ? null : doc.id)
                }
                className="text-xs text-gray-500 hover:text-sky-600 ml-auto"
              >
                {openDoc === doc.id ? 'Hide History' : 'View History'}
              </button>
            </div>

            {/* HISTORY */}
            {openDoc === doc.id && (
  <div className="mt-4 border-t pt-3 space-y-3">

    {/* VERSION HISTORY */}
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">Versions</p>

      {versions.map((v: any) => (
        <div
          key={v.id}
          className="flex justify-between items-center text-sm text-gray-700"
        >
          <span>Version {v.version_number}</span>

          <button
            onClick={() => handleSecureView(v.file_path)}
            className="text-sky-600 hover:underline"
          >
            View
          </button>
        </div>
      ))}
    </div>

    {/* WORKFLOW HISTORY */}
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">
        Workflow History
      </p>

      {(doc.document_workflow_logs || []).map((log: any) => (
        <div
          key={log.id}
          className="text-xs text-gray-600 flex justify-between"
        >
          <span>
            {log.action.toUpperCase()} by {log.users?.email || 'System'}
          </span>

          <span>
            {new Date(log.created_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>

  </div>
)}
          </div>
        )
      })}
    </div>
  )
}