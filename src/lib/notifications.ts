import { createAdminClient } from '@/lib/supabase/server'

interface NotifyParams {
  userId: string
  title: string
  message: string
  entity_type?: string
  entity_id?: string
  action_url?: string
}

export async function notifyUser({
  userId,
  title,
  message,
  entity_type,
  entity_id,
  action_url,
}: NotifyParams) {
  const admin = createAdminClient()

  const { error } = await admin.from('notifications').insert({
    recipient_user_id: userId,
    title,
    message,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
    action_url: action_url || null,
  })

  if (error) {
    console.error('Notification error:', error.message)
  }
}