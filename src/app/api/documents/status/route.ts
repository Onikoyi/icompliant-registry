import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit'
import { getCurrentUser, hasPermission } from '@/lib/rbac'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
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

    // 🔐 GET CURRENT USER
    const user = await getCurrentUser()

    // 🔐 DETERMINE REQUIRED PERMISSION
    const requiredPermission =
      status === 'approved'
        ? 'document.approve'
        : 'document.reject'

    const allowed = await hasPermission(
      user.role_id,
      requiredPermission
    )

    if (!allowed) {
      return NextResponse.json(
        { error: 'Unauthorized action' },
        { status: 403 }
      )
    }

    // 🔹 UPDATE STATUS
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

    // 🔐 AUDIT
    await logAudit({
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

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}