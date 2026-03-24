import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import DocumentUploadForm from '@/components/documents/DocumentUploadForm'
import DocumentList from '@/components/documents/DocumentList'
import PassportUpload from '@/components/students/PassportUpload'
import {
  getOwnerDocuments,
  getDocumentTypes,
} from '@/lib/queries/documents'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getStudent(id: string) {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('students')
    .select(`
      id,
      matric_number,
      level,
      admission_year,
      graduation_year,
      academic_status,
      owners (
        id,
        full_name,
        surname,
        other_names,
        owner_key,
        photo_url
      )
    `)
    .eq('id', id)
    .single()

  return data
}

export default async function StudentProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServerClient()

  const student = await getStudent(id)
  if (!student) notFound()

  const ownerId = student.owners.id

  // ✅ Generate signed URL (FIX)
  let photoUrl: string | null = null

  if (student.owners.photo_url) {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(student.owners.photo_url, 60 * 60)

    if (!error) {
      photoUrl = data?.signedUrl || null
    }
  }

  const documents = await getOwnerDocuments(ownerId)
  const documentTypes = await getDocumentTypes()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">

      <div className="max-w-7xl mx-auto px-8 py-12">

        <div className="rounded-3xl shadow-2xl overflow-hidden border border-sky-200">

          {/* HEADER */}
          <div className="bg-sky-700 px-10 py-8 text-white flex justify-between items-center">

            <div>
              <h1 className="text-3xl font-bold tracking-wide">
                Student Profile
              </h1>
              <p className="text-sky-200 text-sm mt-1">
                Complete academic & identity overview
              </p>
            </div>

            <PassportUpload
              ownerId={ownerId}
              currentPhotoUrl={photoUrl}
            />

          </div>

          {/* BODY */}
          <div className="bg-white px-10 py-12">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

              {/* PERSONAL */}
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-sky-700 mb-4 border-b border-sky-200 pb-2">
                  Personal Information
                </h2>

                <div className="space-y-3 text-gray-800 text-sm">
                  <p><span className="font-semibold text-amber-700">Full Name:</span> {student.owners.full_name}</p>
                  <p><span className="font-semibold text-amber-700">Surname:</span> {student.owners.surname}</p>
                  <p><span className="font-semibold text-amber-700">Other Names:</span> {student.owners.other_names}</p>
                  <p><span className="font-semibold text-amber-700">Owner Key:</span> {student.owners.owner_key}</p>
                </div>
              </div>

              {/* ACADEMIC */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-700 mb-4 border-b border-amber-200 pb-2">
                  Academic Information
                </h2>

                <div className="space-y-3 text-gray-800 text-sm">
                  <p><span className="font-semibold text-sky-700">Matric Number:</span> {student.matric_number}</p>
                  <p><span className="font-semibold text-sky-700">Level:</span> {student.level}</p>
                  <p><span className="font-semibold text-sky-700">Admission Year:</span> {student.admission_year}</p>
                  <p><span className="font-semibold text-sky-700">Graduation Year:</span> {student.graduation_year}</p>
                  <p><span className="font-semibold text-sky-700">Status:</span> {student.academic_status}</p>
                </div>
              </div>

            </div>

            {/* DOCUMENTS */}
            <div className="mt-14 grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-6 shadow-sm">
                <DocumentUploadForm
                  ownerId={ownerId}
                  documentTypes={documentTypes}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                <DocumentList documents={documents} />
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}