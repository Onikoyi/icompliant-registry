import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const owner_id = formData.get('owner_id') as string | null

    if (!file || !owner_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 🔐 Validate image type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 🔥 Store ONLY file path (NOT public URL)
    const filePath = `passports/${owner_id}-${randomUUID()}.jpg`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // 🔥 Save file path (NOT public URL)
    const { error: updateError } = await supabaseAdmin
      .from('owners')
      .update({ photo_url: filePath })
      .eq('id', owner_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // 🔐 Audit log (correct variable)
    await logAudit({
      action: 'PASSPORT_UPLOAD',
      entity: 'owner',
      entity_id: owner_id,
      metadata: {
        file_path: filePath,
      },
    })

    // 🔐 Generate signed URL for immediate display
const { data: signedUrlData, error: signedUrlError } =
await supabaseAdmin.storage
  .from('documents')
  .createSignedUrl(filePath, 60 * 60) // 1 hour

if (signedUrlError) {
return NextResponse.json(
  { error: signedUrlError.message },
  { status: 500 }
)
}

return NextResponse.json({
photo_url: signedUrlData?.signedUrl,
})
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}