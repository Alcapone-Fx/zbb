'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Trash2 } from 'lucide-react'
import { ConfirmSheet } from '@/components/shared/ConfirmSheet'

/** Client-local date — `toISOString()` would shift the month across timezones. */
function localToday(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    return typeof body?.error === 'string' ? body.error : fallback
  } catch {
    return fallback
  }
}

export function DemoDataSection() {
  const router = useRouter()
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    setError(null)
    try {
      const res = await fetch('/api/demo-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today: localToday() }),
      })
      if (!res.ok) {
        setError(await readError(res, 'No se pudieron cargar los datos de ejemplo.'))
        return
      }
      router.push('/budget')
      router.refresh()
    } catch {
      setError('No se pudieron cargar los datos de ejemplo. Revisa tu conexión.')
    } finally {
      setSeeding(false)
    }
  }

  async function handleReset() {
    setError(null)
    try {
      const res = await fetch('/api/demo-seed', { method: 'DELETE' })
      if (!res.ok) {
        setError(await readError(res, 'No se pudieron borrar los datos.'))
        return
      }
      router.refresh()
    } catch {
      setError('No se pudieron borrar los datos. Revisa tu conexión.')
    }
  }

  return (
    <>
      {error && (
        <p
          className="text-xs px-4 py-3 rounded-xl"
          style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSeed}
        disabled={seeding}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors text-left hover:bg-white/5"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-card)',
          opacity: seeding ? 0.6 : 1,
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--ab)' }}
        >
          <Sparkles size={18} style={{ color: 'var(--ac)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {seeding ? 'Cargando…' : 'Cargar datos de ejemplo'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
            Un mes completo de ejemplo para ver cómo funciona
          </p>
        </div>
      </button>

      <button
        onClick={() => setConfirmReset(true)}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors text-left hover:bg-white/5"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-card)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(248,113,113,0.12)' }}
        >
          <Trash2 size={18} style={{ color: '#F87171' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#F87171' }}>
            Borrar todos mis datos
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
            Deja la cuenta vacía, como recién creada
          </p>
        </div>
      </button>

      <ConfirmSheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Borrar todos mis datos"
        description="Se eliminarán todas tus cuentas, categorías, transacciones, metas y presupuestos. Esto borra TODO, no solo los datos de ejemplo, y no se puede deshacer."
        confirmLabel="Borrar todo"
        onConfirm={handleReset}
        destructive
      />
    </>
  )
}
