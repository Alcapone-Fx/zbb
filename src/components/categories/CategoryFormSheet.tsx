'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomSheet } from './BottomSheet'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@/types/category'

interface CategoryFormSheetProps {
  open: boolean
  onClose: () => void
  category?: Category
  groupId: string
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>
}

interface CategoryFormBodyProps {
  category?: Category
  groupId: string
  onSave: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>
  onClose: () => void
}

// Rendered only when the sheet is open — mounts fresh each time, so state initializes correctly
function CategoryFormBody({ category, groupId, onSave, onClose }: CategoryFormBodyProps) {
  const [name, setName] = useState(category?.name ?? '')
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
      const payload: CreateCategoryInput | UpdateCategoryInput = category
        ? { name: name.trim() }
        : { name: name.trim(), group_id: groupId }
      await onSave(payload)
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
        <Label htmlFor="cat-name" style={{ color: 'var(--text-sub)' }}>
          Nombre
        </Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Alimentación"
          autoFocus
        />
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

export function CategoryFormSheet({
  open,
  onClose,
  category,
  groupId,
  onSave,
}: CategoryFormSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
    >
      <CategoryFormBody
        category={category}
        groupId={groupId}
        onSave={onSave}
        onClose={onClose}
      />
    </BottomSheet>
  )
}
