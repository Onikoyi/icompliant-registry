import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_BUCKET } from '@/lib/storage'
import { logAudit } from '@/lib/audit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing file path' },
        { status: 400 }
      )
    }

    // 🔐 Generate signed URL (60 seconds)
    const { data, error } = await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(filePath, 60)

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Failed to generate URL' },
        { status: 500 }
      )
    }

    await logAudit({
        action: 'DOCUMENT_VIEW',
        entity: 'document_file',
        entity_id: filePath,
        metadata: {
          path: filePath,
        },
      })
      
      return NextResponse.json({
        url: data.signedUrl,
      })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}