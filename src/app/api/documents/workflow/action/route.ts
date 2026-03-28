import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'


type ActionType = 'forward' | 'approve' | 'reject'
type RoleType = 'reviewer' | 'approver'


export async function POST(req: Request) {
  try {
    const { user, permissions } = await getCurrentUserWithPermissions()

    if (!permissions.includes('document.approve')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()

    const {
      document_id,
      action,
      role,
      comment,
      forward_to,
    }: {
      document_id: string
      action: ActionType
      role?: RoleType
      comment?: string
      forward_to?: string
    } = body

    if (!document_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Get document
    const { data: document } = await admin
      .from('documents')
      .select('id, status')
      .eq('id', document_id)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    

    // Get workflow instance if exists
    const { data: workflow } = await admin
      .from('document_workflow_instances')
      .select('*')
      .eq('document_id', document_id)
      .maybeSingle()

    // AUTO-START workflow if first forward
    let workflowId = workflow?.id

    if (!workflow && action === 'forward') {
      const { data: newWorkflow, error: wfError } = await admin
        .from('document_workflow_instances')
        .insert({
          document_id,
          initiated_by: user.id,
          current_handler_id: forward_to,
          status: 'active',
        })
        .select()
        .single()

      if (wfError || !newWorkflow) {
        return NextResponse.json(
          { error: wfError?.message || 'Workflow creation failed' },
          { status: 500 }
        )
      }

      workflowId = newWorkflow.id
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow not started yet' },
        { status: 400 }
      )
    }

    // Reload workflow to check handler
    const { data: currentWorkflow } = await admin
      .from('document_workflow_instances')
      .select('*')
      .eq('id', workflowId)
      .single()
      const isCurrentHandler = workflow.current_handler_id === user.id
      const hasApprovalPermission = permissions.includes('document.approve')
      
      if (!isCurrentHandler && !hasApprovalPermission) {
        return NextResponse.json(
          { error: 'Not current handler' },
          { status: 403 }
        )
      }

    // HANDLE ACTIONS

    if (action === 'forward') {
      if (!forward_to || !role) {
        return NextResponse.json(
          { error: 'Missing forward target or role' },
          { status: 400 }
        )
      }

      await admin.from('document_workflow_steps').insert({
        workflow_id: workflowId,
        actor_user_id: user.id,
        role,
        action: 'forwarded',
        comment,
        forwarded_to: forward_to,
      })

      await admin
        .from('document_workflow_instances')
        .update({
          current_handler_id: forward_to,
        })
        .eq('id', workflowId)

      return NextResponse.json({ success: true })
    }

    if (action === 'approve') {
      await admin.from('document_workflow_steps').insert({
        workflow_id: workflowId,
        actor_user_id: user.id,
        role: 'approver',
        action: 'approved',
        comment,
      })

      await admin
        .from('document_workflow_instances')
        .update({
          status: 'approved',
          current_handler_id: null,
        })
        .eq('id', workflowId)

      await admin
        .from('documents')
        .update({ status: 'approved' })
        .eq('id', document_id)

      await logAudit({
        actor_user_id: user.id,
        action: 'DOCUMENT_APPROVED',
        entity_type: 'document',
        entity_id: document_id,
        metadata: { workflow_id: workflowId },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
        // Insert workflow step
        await admin.from('document_workflow_steps').insert({
          workflow_id: workflowId,
          actor_user_id: user.id,
          role: 'approver',
          action: 'rejected',
          comment,
        })
      
        // Get workflow to know initiator
        const { data: wf } = await admin
          .from('document_workflow_instances')
          .select('initiated_by')
          .eq('id', workflowId)
          .single()
      
        // Assign back to initiator
        await admin
          .from('document_workflow_instances')
          .update({
            status: 'active',
            current_handler_id: wf?.initiated_by,
          })
          .eq('id', workflowId)
      
        await admin
          .from('documents')
          .update({ status: 'rejected' })
          .eq('id', document_id)
      
        await logAudit({
          actor_user_id: user.id,
          action: 'DOCUMENT_REJECTED',
          entity_type: 'document',
          entity_id: document_id,
          metadata: { workflow_id: workflowId },
        })
      
        return NextResponse.json({ success: true })
      }

      await notifyUser({
        userId: forward_to,
        title: 'Document Assigned',
        message: `You have been assigned "${document.title}"`,
        entity_type: 'document',
        entity_id: document.id,
        action_url: '/admin/document-approval-pipeline'
      })
      

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error(err)
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}