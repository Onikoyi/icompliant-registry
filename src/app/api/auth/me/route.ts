import { NextResponse } from 'next/server'
import { getCurrentUserWithPermissions } from '@/lib/rbac'

export async function GET() {
  try {
    const { user, permissions } = await getCurrentUserWithPermissions()

    return NextResponse.json({
      user,
      permissions,
    })
  } catch (error: any) {
    const message = error?.message || 'Internal server error'

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (message === 'User not found in system') {
      return NextResponse.json(
        { error: 'User not found in system' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}