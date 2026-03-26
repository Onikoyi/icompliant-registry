import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(req: NextRequest) {
  let res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  const isPublicAsset =
    pathname.startsWith('/branding/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/manifest.webmanifest' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$/i.test(pathname)

  if (isPublicAsset) {
    return res
  }

  if (pathname.startsWith('/api/')) {
    return res
  }

  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set(name, value, options)
        },
        remove: (name, options) => {
          res.cookies.set(name, '', options)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let mustResetPassword = false

if (user) {

  const { data: appUser } = await supabase
    .from('users')
    .select('must_reset_password')
    .eq('id', user.id)
    .single()

  mustResetPassword = appUser?.must_reset_password === true
}

  const publicRoutes = [
    '/login',
    '/forgot-password',
    '/reset-password',
  ]
  
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  )
  
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 🔥 FORCE PASSWORD RESET
  if (
    user &&
    mustResetPassword &&
    !pathname.startsWith('/reset-password') &&
    !pathname.startsWith('/api/')
  ) {
    return NextResponse.redirect(new URL('/reset-password', req.url))
  }
  
  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}