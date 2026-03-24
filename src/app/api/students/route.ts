import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      full_name,
      surname,
      other_names,
      matric_number,
      level,
      admission_year
    } = body

    const ownerKey = `STU-${Date.now()}`

    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .insert([
        {
          owner_key: ownerKey,
          owner_type: 'student',
          full_name,
          surname,
          other_names
        }
      ])
      .select()
      .single()

    if (ownerError) {
      return NextResponse.json({ error: ownerError.message }, { status: 400 })
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([
        {
          owner_id: owner.id,
          matric_number,
          level,
          admission_year
        }
      ])
      .select()
      .single()

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, owner, student })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}