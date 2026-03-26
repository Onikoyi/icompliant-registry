import { createAdminClient } from '@/lib/supabase/server'

export type OwnerType = 'student' | 'staff'

export interface OwnerComplianceSummary {
  owner_id: string
  owner_type: OwnerType
  required_count: number
  uploaded_count: number
  approved_count: number
  missing_count: number
  missing: { id: string; name: string }[]
}

export async function getOwnerComplianceSummary(
  ownerId: string,
  ownerType: OwnerType
): Promise<OwnerComplianceSummary> {
  const admin = createAdminClient()

  // 1) Required document types: mandatory + active + applies_to owner (owner_type or both)
  const { data: requiredTypes, error: reqErr } = await admin
    .from('document_types')
    .select('id, name, owner_type, is_mandatory, is_active')
    .eq('is_active', true)
    .eq('is_mandatory', true)
    .in('owner_type', [ownerType, 'both'])
    .order('name', { ascending: true })

  if (reqErr) throw new Error(reqErr.message)

  const required = requiredTypes || []
  const requiredIds = required.map((t) => t.id)

  if (requiredIds.length === 0) {
    return {
      owner_id: ownerId,
      owner_type: ownerType,
      required_count: 0,
      uploaded_count: 0,
      approved_count: 0,
      missing_count: 0,
      missing: [],
    }
  }

  // 2) Documents uploaded for these required types
  const { data: docs, error: docErr } = await admin
    .from('documents')
    .select('id, document_type_id, status')
    .eq('owner_id', ownerId)
    .in('document_type_id', requiredIds)

  if (docErr) throw new Error(docErr.message)

  const uploaded = docs || []

  const uploadedTypeIds = new Set<string>(uploaded.map((d) => d.document_type_id))
  const approvedTypeIds = new Set<string>(
    uploaded.filter((d) => d.status === 'approved').map((d) => d.document_type_id)
  )

  const missing = required
    .filter((t) => !approvedTypeIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name }))

  return {
    owner_id: ownerId,
    owner_type: ownerType,
    required_count: required.length,
    uploaded_count: uploadedTypeIds.size,
    approved_count: approvedTypeIds.size,
    missing_count: missing.length,
    missing: missing.slice(0, 8), // keep UI concise
  }
}