'use client'

import { useState } from 'react'
import { Save, Play } from 'lucide-react'
import type { BudgetGroupRow } from '@/types/budget'
import { ConfirmSheet } from '@/components/shared/ConfirmSheet'

interface Props {
  month: string
  groups: BudgetGroupRow[]
  onApplied: () => void
}

export function TemplateActions({ month, groups, onApplied }: Props) {
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState(false)
  const [confirmApply, setConfirmApply] = useState(false)

  async function handleSave() {
    const template: Record<string, number> = {}
    for (const g of groups) {
      for (const cat of g.categories) {
        if (!cat.is_system && cat.assigned > 0) {
          template[cat.id] = cat.assigned
        }
      }
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/budget/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Error al guardar plantilla')
      } else {
        setSavedMsg(true)
        setTimeout(() => setSavedMsg(false), 2500)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleApply() {
    setApplying(true)
    setError(null)
    try {
      const res = await fetch('/api/budget/template/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al aplicar plantilla')
      } else {
        onApplied()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="px-5 mb-3 flex items-center gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-sub)' }}
      >
        <Save size={12} />
        {saving ? 'Guardando…' : savedMsg ? '¡Guardado!' : 'Guardar plantilla'}
      </button>

      <button
        type="button"
        onClick={() => setConfirmApply(true)}
        disabled={applying}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-sub)' }}
      >
        <Play size={12} />
        {applying ? 'Aplicando…' : 'Aplicar plantilla'}
      </button>

      {error && (
        <p className="text-xs" style={{ color: 'var(--color-negative)' }}>
          {error}
        </p>
      )}

      <ConfirmSheet
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        title="Aplicar plantilla"
        description="¿Aplicar la plantilla guardada a este mes? Se sobreescribirán las asignaciones actuales."
        confirmLabel="Aplicar"
        onConfirm={handleApply}
      />
    </div>
  )
}
