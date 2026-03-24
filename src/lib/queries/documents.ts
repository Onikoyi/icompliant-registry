import { supabase } from '@/lib/supabase'

export async function getOwnerDocuments(ownerId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select(`
  id,
  title,
  status,
  document_types ( name ),
  document_versions (
    id,
    file_path,
    version_number,
    created_at
  ),
  document_workflow_logs (
    id,
    action,
    created_at,
    users ( email )
  )
`)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    // 🔥 CRITICAL: ensure latest version comes first
    .order('version_number', {
      referencedTable: 'document_versions',
      ascending: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getDocumentTypes() {
  const { data, error } = await supabase
    .from('document_types')
    .select('id, name')
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}