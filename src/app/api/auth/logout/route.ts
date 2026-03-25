import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

function redirectToLogin(req: Request) {
  const url = new URL(req.url)
  return new URL("/login", url.origin)
}

export async function GET(req: Request) {
  const cookieStore = await cookies()
  const res = NextResponse.redirect(redirectToLogin(req))

  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...(options ?? {}) })
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: "", maxAge: 0, ...(options ?? {}) })
        },
      },
    }
  )

  // ✅ This clears Supabase auth cookies server-side
  await supabase.auth.signOut()

  return res
}