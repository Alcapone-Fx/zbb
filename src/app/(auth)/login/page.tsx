'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/types/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = loginSchema.safeParse({ email, password, rememberMe })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    })

    if (authError) {
      setError('Credenciales inválidas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }

    router.push('/budget')
    router.refresh()
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    color: 'var(--text-main)',
    border: '1px solid var(--border-card)',
  }

  return (
    <div
      className="w-full max-w-sm overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: '24px',
        border: '1px solid var(--border-card)',
      }}
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <h1
          className="text-2xl font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Iniciar sesión
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
          Ingresa tu email y contraseña para acceder
        </p>
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit}>
        <div className="px-6 flex flex-col gap-4 pb-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-dim)' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
              className="rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-dim)' }}
              >
                Contraseña
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--ac)' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
              className="rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              style={inputStyle}
            />
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--ac)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-sub)' }}>
              Recuérdame
            </span>
          </label>
        </div>

        {/* Footer actions */}
        <div
          className="px-6 py-5 flex flex-col gap-3"
          style={{
            borderTop: '1px solid var(--border-card)',
            background: 'var(--bg-elevated)',
          }}
        >
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl text-sm font-bold transition-opacity"
            style={{
              background: 'var(--ac)',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>

          <p className="text-sm text-center" style={{ color: 'var(--text-sub)' }}>
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-main)' }}
            >
              Regístrate
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
