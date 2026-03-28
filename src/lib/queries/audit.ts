import { createServerClient } from '@/lib/supabase/server'

interface AuditFilters {
  userId?: string
  entityType?: string
  from?: string
  to?: string
}

export async function getAuditLogs(filters: AuditFilters = {}) {
  const supabase = await createServerClient()

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      user_id,
      action,
      entity_type,
      entity_id,
      entity,
      metadata,
      created_at,
      users:user_id (
        email
      )
    `)
    .order('created_at', { ascending: false })

  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.from) {
    query = query.gte('created_at', filters.from)
  }

  if (filters.to) {
    query = query.lte('created_at', filters.to)
  }

  const { data, error } = await query.limit(200)

  if (error) throw new Error(error.message)

  return data ?? []
}