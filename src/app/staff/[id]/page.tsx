import { notFound } from 'next/navigation'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
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

async function getStaff(id: string) {
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('staff')
    .select(`
      id,
      staff_number,
      employment_type,
      role_title,
      employment_status,
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

export default async function StaffProfilePage({ params }: PageProps) {
  const { id } = await params

  const staff = await getStaff(id)
  if (!staff) notFound()

  const owner = Array.isArray(staff.owners) ? staff.owners[0] : staff.owners
  if (!owner) notFound()

  const ownerId = owner.id

  let photoUrl: string | null = null

  if (owner.photo_url) {
    const admin = createAdminClient()

    const { data, error } = await admin.storage
      .from('documents')
      .createSignedUrl(owner.photo_url, 60 * 60)

    if (!error) {
      photoUrl = data?.signedUrl || null
    } else {
      console.error('Failed to create staff passport signed URL:', error.message)
    }
  }

  const documents = await getOwnerDocuments(ownerId)
  const documentTypes = await getDocumentTypes()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="rounded-3xl shadow-2xl overflow-hidden border border-sky-200">
          <div className="bg-sky-700 px-10 py-8 text-white flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-wide">
                Staff Profile
              </h1>
              <p className="text-sky-200 text-sm mt-1">
                Employment & identity overview
              </p>
            </div>

            <PassportUpload
              ownerId={ownerId}
              currentPhotoUrl={photoUrl}
            />
          </div>

          <div className="bg-white px-10 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-sky-700 mb-4 border-b border-sky-200 pb-2">
                  Personal Information
                </h2>

                <div className="space-y-3 text-gray-800 text-sm">
                  <p><span className="font-semibold text-amber-700">Full Name:</span> {owner.full_name}</p>
                  <p><span className="font-semibold text-amber-700">Surname:</span> {owner.surname}</p>
                  <p><span className="font-semibold text-amber-700">Other Names:</span> {owner.other_names}</p>
                  <p><span className="font-semibold text-amber-700">Owner Key:</span> {owner.owner_key}</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-700 mb-4 border-b border-amber-200 pb-2">
                  Employment Information
                </h2>

                <div className="space-y-3 text-gray-800 text-sm">
                  <p><span className="font-semibold text-sky-700">Staff Number:</span> {staff.staff_number}</p>
                  <p><span className="font-semibold text-sky-700">Employment Type:</span> {staff.employment_type}</p>
                  <p><span className="font-semibold text-sky-700">Role Title:</span> {staff.role_title}</p>
                  <p><span className="font-semibold text-sky-700">Status:</span> {staff.employment_status}</p>
                </div>
              </div>
            </div>

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