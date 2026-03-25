import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { document_id, status } = body

    if (!document_id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { user, permissions } = await getCurrentUserWithPermissions()

    const requiredPermission =
      status === 'approved'
        ? 'document.approve'
        : status === 'rejected'
          ? 'document.reject'
          : null

    if (!requiredPermission) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    const allowed = permissions.includes(requiredPermission)

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized action' },
        { status: 403 }
      )
    }

    const { error } = await supabaseAdmin
      .from('documents')
      .update({ status })
      .eq('id', document_id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'DOCUMENT_STATUS_UPDATE',
      entity: 'document',
      entity_id: document_id,
      metadata: { status },
    })

    await supabaseAdmin
      .from('document_workflow_logs')
      .insert({
        document_id,
        action: status,
        performed_by: user.id,
        metadata: {
          status,
        },
      })

    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error: any) {
    console.error(error)

    const message = error?.message || 'Internal server error'

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}