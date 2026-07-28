'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking')

  // Supabase's DEFAULT email template sends the recovery link through
  // /auth/v1/verify, which redirects here with a PKCE `code` rather than an
  // established session. Without exchanging it, updateUser() below runs
  // unauthenticated and always fails. Customizing the template away from this
  // shape requires custom SMTP, so this path has to work.
  //
  // Read from window.location instead of useSearchParams so the page does not
  // need a Suspense boundary; this only ever runs client-side anyway.
  const establishSession = useCallback(async () => {
    const supabase = createClient()
    const code = new URLSearchParams(window.location.search).get('code')

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('Reset password code exchange failed:', exchangeError.message)
        setStatus('invalid')
        return
      }
      // Drop the spent code from the URL so a refresh doesn't retry it.
      window.history.replaceState({}, '', window.location.pathname)
      setStatus('ready')
      return
    }

    // No code: either a customized template already ran verifyOtp() in
    // /auth/confirm and redirected here with a live session, or the link is bad.
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setStatus(user ? 'ready' : 'invalid')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    establishSession()
  }, [establishSession])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.updateUser({
      password: result.data.password,
    })

    if (authError) {
      setError('No se pudo actualizar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    router.push('/budget')
    router.refresh()
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Verificando enlace…</CardTitle>
              <CardDescription>Un momento.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Enlace inválido o vencido</CardTitle>
              <CardDescription>
                Los enlaces de recuperación se usan una sola vez y expiran. Pide uno nuevo
                para continuar.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3">
              <Link href="/forgot-password" className="w-full">
                <Button className="w-full">Pedir un enlace nuevo</Button>
              </Link>
              <Link
                href="/login"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Volver al inicio de sesión
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-12">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña para continuar.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
