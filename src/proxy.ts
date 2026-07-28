import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/verify-email']

// Landing routes for the links Supabase emails out. Exempt from BOTH guards
// below, for opposite reasons:
//   - /auth/confirm is reached with NO session yet, so the `!user` redirect
//     would bounce it to /login and the token_hash would never reach
//     verifyOtp() — leaving the account permanently unconfirmed, with no
//     resend button on /verify-email to recover from it.
//   - /auth/reset-password IS reached with a (recovery) session, so the
//     "redirect verified users away from auth pages" rule would bounce it to
//     /budget before the user can set a new password.
// Neither route renders anything an unauthenticated visitor shouldn't see:
// both are inert without a valid one-time token.
const AUTH_CALLBACK_ROUTES = ['/auth/confirm', '/auth/reset-password']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required by @supabase/ssr
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Checked before every other rule — but after getUser() above, so the
  // response still carries any refreshed session cookies.
  if (AUTH_CALLBACK_ROUTES.some((p) => pathname === p)) {
    return supabaseResponse
  }

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p)
  // API routes handle auth themselves — proxy only covers page navigation
  const isApiRoute = pathname.startsWith('/api/')

  if (!isAuthPage && !isApiRoute) {
    // Unauthenticated: redirect everything (including non-existent routes) to /login.
    // This prevents route enumeration via 404 vs 302 differences.
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    // Authenticated but email not confirmed
    if (!user.email_confirmed_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
  }

  // Redirect verified users away from auth pages
  if (isAuthPage && user?.email_confirmed_at) {
    const url = request.nextUrl.clone()
    url.pathname = '/budget'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
