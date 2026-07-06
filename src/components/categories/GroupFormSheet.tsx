'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomSheet } from '@/components/shared/BottomSheet'
import type { CategoryGroup, CreateGroupInput, UpdateGroupInput } from '@/types/category'

interface GroupFormSheetProps {
  open: boolean
  onClose: () => void
  group?: CategoryGroup
  onSave: (data: CreateGroupInput | UpdateGroupInput) => Promise<void>
}

interface GroupFormBodyProps {
  group?: CategoryGroup
  onSave: (data: CreateGroupInput | UpdateGroupInput) => Promise<void>
  onClose: () => void
}

// Rendered only when the sheet is open — mounts fresh each time, so state initializes correctly
function GroupFormBody({ group, onSave, onClose }: GroupFormBodyProps) {
  const [name, setName] = useState(group?.name ?? '')
  const [idealPct, setIdealPct] = useState(
    group?.ideal_percentage != null ? String(group.ideal_percentage) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const pct = idealPct.trim() ? parseFloat(idealPct) : null
      await onSave({ name: name.trim(), ideal_percentage: pct })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-name" style={{ color: 'var(--text-sub)' }}>
          Nombre
        </Label>
        <Input
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Necesidades"
          autoFocus
          autoComplete="nope"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-pct" style={{ color: 'var(--text-sub)' }}>
          Porcentaje ideal{' '}
          <span style={{ color: 'var(--text-dim)' }}>(opcional)</span>
        </Label>
        <div className="relative">
          <Input
            id="group-pct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={idealPct}
            onChange={(e) => setIdealPct(e.target.value)}
            placeholder="ej. 50"
            className="pr-7"
          />
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none"
            style={{ color: 'var(--text-sub)' }}
          >
            %
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Usado en el Dashboard para comparar gasto real vs. ideal
        </p>
      </div>

      {error && (
        <p className="text-sm font-medium" style={{ color: 'var(--color-negative)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

export function GroupFormSheet({ open, onClose, group, onSave }: GroupFormSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={group ? 'Editar grupo' : 'Nuevo grupo'}>
      <GroupFormBody group={group} onSave={onSave} onClose={onClose} />
    </BottomSheet>
  )
}
