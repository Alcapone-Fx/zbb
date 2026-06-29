'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface GroupGoal {
  id: string
  name: string
  ideal_percentage: number | null
}

interface Props {
  initialGroups: GroupGoal[]
}

export function GoalsClient({ initialGroups }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupGoal[]>(initialGroups)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleChange(id: string, raw: string) {
    const num = raw === '' ? null : Number(raw)
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ideal_percentage: num } : g))
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    // Validate: each non-null value must be 0–100
    for (const g of groups) {
      if (g.ideal_percentage !== null) {
        if (isNaN(g.ideal_percentage) || g.ideal_percentage < 0 || g.ideal_percentage > 100) {
          setError(`"${g.name}": el porcentaje debe estar entre 0 y 100`)
          setSaving(false)
          return
        }
      }
    }

    try {
      const results = await Promise.all(
        groups.map((g) =>
          fetch(`/api/categories/groups/${g.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ideal_percentage: g.ideal_percentage }),
          })
        )
      )
      const failed = results.find((r) => !r.ok)
      if (failed) {
        const json = await failed.json()
        setError(json.error ?? 'Error al guardar')
      } else {
        setSaved(true)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const total = groups.reduce((s, g) => s + (g.ideal_percentage ?? 0), 0)
  const totalOver = total > 100

  return (
    <>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{
          background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          <ChevronLeft size={16} />
          Configuración
        </button>
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Metas de Presupuesto
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
          Define el % ideal de ingresos para cada grupo
        </p>
      </div>

      <div className="px-5 flex flex-col gap-3 pb-32">
        {/* Total indicator */}
        <div
          className="px-4 py-3 rounded-2xl flex items-center justify-between"
          style={{
            background: 'var(--bg-elevated)',
            border: `1px solid ${totalOver ? 'var(--color-negative)' : 'var(--border-card)'}`,
          }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-sub)' }}>
            Total asignado
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: totalOver ? 'var(--color-negative)' : 'var(--color-positive)' }}
          >
            {total.toFixed(1)}%
          </span>
        </div>

        {totalOver && (
          <p className="text-xs px-1" style={{ color: 'var(--color-negative)' }}>
            El total supera el 100%. Ajusta los porcentajes.
          </p>
        )}

        {/* Group rows */}
        {groups.map((g) => (
          <div
            key={g.id}
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-card)',
            }}
          >
            <span
              className="flex-1 text-sm font-medium truncate"
              style={{ color: 'var(--text-main)' }}
            >
              {g.name}
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={g.ideal_percentage ?? ''}
                onChange={(e) => handleChange(g.id, e.target.value)}
                placeholder="—"
                className="w-16 text-right text-sm font-semibold rounded-lg px-2 py-1.5 outline-none focus:ring-1"
                style={{
                  background: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                %
              </span>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>
            No hay grupos de categorías configurados.
          </p>
        )}

        {/* Error / success feedback */}
        {error && (
          <div
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-negative)' }}
          >
            {error}
          </div>
        )}
        {saved && !error && (
          <div
            className="px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--color-positive)' }}
          >
            Metas guardadas correctamente.
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || groups.length === 0}
          className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          {saving ? 'Guardando…' : 'Guardar metas'}
        </button>
      </div>
    </>
  )
}
