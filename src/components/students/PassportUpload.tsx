'use client'

import { useState } from 'react'

interface Props {
  ownerId: string
  currentPhotoUrl?: string | null
}

export default function PassportUpload({
  ownerId,
  currentPhotoUrl,
}: Props) {
  const [preview, setPreview] = useState<string | null>(
    currentPhotoUrl || null
  )
  const [loading, setLoading] = useState(false)

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) return

    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('owner_id', ownerId)

    const res = await fetch('/api/students/passport', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setPreview(data.photo_url)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">

      {/* STRICT 1:1 PASSPORT BOX */}
      <div className="w-36 aspect-square border-4 border-amber-500 rounded-lg shadow bg-gray-100 overflow-hidden">

        {preview ? (
          <img
            src={preview}
            alt="Passport"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Passport
          </div>
        )}

      </div>

      <label className="text-sky-600 text-sm cursor-pointer hover:underline">
        {loading ? 'Uploading...' : 'Upload Passport'}
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) =>
            e.target.files && handleUpload(e.target.files[0])
          }
        />
      </label>

    </div>
  )
}