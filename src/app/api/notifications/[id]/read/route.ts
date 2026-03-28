import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user } = await getCurrentUserWithPermissions()
  const admin = createAdminClient()

  const { error } = await admin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', params.id)
    .eq('recipient_user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}