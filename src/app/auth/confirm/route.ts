import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Landing route for the links Supabase emails out.
 *
 * Two link shapes can arrive here, depending on the project's email templates:
 *
 *   token_hash + type — a CUSTOMIZED template using {{ .TokenHash }}. The token
 *     is still unspent, so we verify it ourselves via verifyOtp().
 *
 *   code — Supabase's DEFAULT template ({{ .ConfirmationURL }}). That link goes
 *     to /auth/v1/verify first, which confirms the address on Supabase's side
 *     and then redirects here with a PKCE auth code. The address is already
 *     confirmed by then, but until the code is exchanged no session exists —
 *     which is why password reset silently failed: /auth/reset-password called
 *     updateUser() with no session at all.
 *
 * Both are supported because customizing templates requires custom SMTP (or a
 * paid plan), so the default `code` shape is what a free-tier project actually
 * sends. The flow must not depend on that setting.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/budget'
  // Reject external or protocol-relative redirects to prevent open redirect attacks
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/budget'

  const supabase = await createClient()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (error) {
      console.error('Email confirmation error (token_hash):', error.message)
      return NextResponse.redirect(
        new URL('/login?error=confirmation_failed', request.url)
      )
    }

    return NextResponse.redirect(new URL(next, request.url))
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Email confirmation error (code):', error.message)
      return NextResponse.redirect(
        new URL('/login?error=confirmation_failed', request.url)
      )
    }

    return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
}
