import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

function normalizeText(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}
function normalizeUuid(v: any): string | null {
  const s = String(v ?? '').trim()
  return s ? s : null
}
function asBool(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

const OWNER_KINDS = new Set(['general', 'department', 'student', 'staff'])

export async function GET(req: Request) {
  try {
    await requirePermission('file.view')

    const url = new URL(req.url)
    const q = normalizeText(url.searchParams.get('q'))
    const active = url.searchParams.get('active') // "true"/"false"/null

    const admin = createAdminClient()

    let query = admin
      .from('files')
      .select(
        `
        id, reference_code, title, description,
        owner_kind, owner_id, department_id,
        is_active, created_by, updated_by,
        created_at, updated_at,
        departments:department_id (id, name, code)
      `
      )
      .order('created_at', { ascending: false })

    if (active === 'true') query = query.eq('is_active', true)
    if (active === 'false') query = query.eq('is_active', false)

    if (q) {
      // Search by reference_code or title (ilike)
      query = query.or(`reference_code.ilike.%${q}%,title.ilike.%${q}%`)
    }
    

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ files: data || [] })
  } 
  
  
  catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  
}

export async function POST(req: Request) {
  try {
    const { user } = await requirePermission('file.manage')
    const body = await req.json()

    const reference_code = normalizeText(body?.reference_code)
    const title = normalizeText(body?.title)
    const description = body?.description === undefined ? null : normalizeText(body?.description)

    const owner_kind = normalizeText(body?.owner_kind) || 'general'
    const owner_id = body?.owner_id === undefined ? null : normalizeUuid(body?.owner_id)
    const department_id = body?.department_id === undefined ? null : normalizeUuid(body?.department_id)

    const is_active = body?.is_active === undefined ? true : asBool(body?.is_active)

    if (!reference_code) return NextResponse.json({ error: 'reference_code is required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })
    if (!OWNER_KINDS.has(owner_kind)) {
      return NextResponse.json({ error: 'owner_kind must be one of general|department|student|staff' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: created, error } = await admin
      .from('files')
      .insert({
        reference_code,
        title,
        description,
        owner_kind,
        owner_id,
        department_id,
        is_active,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !created) {
      const msg = error?.message || 'Failed to create file'
      const isDup = msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')
      return NextResponse.json(
        { error: isDup ? 'A file with this reference code already exists' : msg },
        { status: isDup ? 409 : 500 }
      )
    }

    await logAudit({
      actor_user_id: user.id,
      action: 'FILE_CREATED',
      entity_type: 'file',
      entity_id: created.id,
      metadata: {
        reference_code: created.reference_code,
        title: created.title,
        owner_kind: created.owner_kind,
        owner_id: created.owner_id,
        department_id: created.department_id,
        is_active: created.is_active,
      },
    })

    return NextResponse.json({ file: created })
  } catch (err: any) {
    const msg = err?.message || 'Internal server error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg.startsWith('Forbidden:')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}