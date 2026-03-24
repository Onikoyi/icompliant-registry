'use client'

import { useState } from 'react'

interface Props {
  ownerId: string
  documentTypes: {
    id: string
    name: string
  }[]
}

export default function DocumentUploadForm({
  ownerId,
  documentTypes,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [documentTypeId, setDocumentTypeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!file || !documentTypeId) {
      setError('All fields are required.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must not exceed 5MB.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('owner_id', ownerId)
    formData.append('document_type_id', documentTypeId)

    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Upload failed.')
      return
    }

    window.location.reload()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-sky-50 border border-sky-200 p-6 rounded-xl shadow-sm space-y-4"
    >
      <h2 className="text-lg font-semibold text-sky-700">
        Upload Document
      </h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
          {error}
        </div>
      )}

      <select
        value={documentTypeId}
        onChange={(e) => setDocumentTypeId(e.target.value)}
        className="w-full border border-sky-300 p-2 rounded"
        required
      >
        <option value="">Select Document Type</option>
        {documentTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>

      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded transition"
      >
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  )
}