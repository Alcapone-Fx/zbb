'use client'

import { useState, useEffect } from 'react'
import type { WishlistItem, WishlistPriority } from '@/types/helpers'
import { AppSelect } from '@/components/ui/AppSelect'
import { ConfirmSheet } from '@/components/shared/ConfirmSheet'

const PRIORITY_LABEL: Record<WishlistPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}
const PRIORITY_COLOR: Record<WishlistPriority, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#6b7280',
}

interface FormState {
  name: string
  estimated_cost: string
  priority: WishlistPriority | ''
  notes: string
}

const EMPTY_FORM: FormState = { name: '', estimated_cost: '', priority: '', notes: '' }

interface Props {
  onConvert: (item: WishlistItem) => void
}

export function WishlistHelper({ onConvert }: Props) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [convertedCollapsed, setConvertedCollapsed] = useState(true)
  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => Promise<void>
    destructive?: boolean
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/helpers/wishlist')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setError(json.error)
        else setItems(json.data ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Error de conexión'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [refreshKey])

  function load() {
    setLoading(true)
    setError(null)
    setRefreshKey((k) => k + 1)
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(item: WishlistItem) {
    setForm({
      name: item.name,
      estimated_cost: item.estimated_cost != null ? String(item.estimated_cost) : '',
      priority: item.priority ?? '',
      notes: item.notes ?? '',
    })
    setEditingId(item.id)
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setFormError('El nombre es requerido')
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name.trim(),
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      priority: form.priority || null,
      notes: form.notes.trim() || null,
    }
    try {
      const isEdit = editingId !== null
      const res = await fetch(
        isEdit ? `/api/helpers/wishlist/${editingId}` : '/api/helpers/wishlist',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error ?? 'Error al guardar')
      } else {
        await load()
        closeForm()
      }
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(item: WishlistItem) {
    setConfirm({
      title: 'Eliminar deseo',
      description: `¿Eliminar "${item.name}" de tu lista de deseos?`,
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => performDelete(item.id),
    })
  }

  async function performDelete(id: string) {
    try {
      await fetch(`/api/helpers/wishlist/${id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      // ignore
    }
  }

  const activeItems = items.filter((i) => !i.converted_to_fund_id)
  const convertedItems = items.filter((i) => i.converted_to_fund_id)

  if (loading) {
    return <div className="py-10 text-center text-sm" style={{ color: 'var(--text-sub)' }}>Cargando…</div>
  }
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={load} className="mt-3 text-sm underline" style={{ color: 'var(--ac)' }}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <button
          onClick={openAdd}
          className="w-full rounded-xl py-3 text-sm font-semibold"
          style={{ background: 'var(--ac)', color: '#fff' }}
        >
          + Agregar deseo
        </button>
      )}

      {formOpen && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {editingId ? 'Editar deseo' : 'Nuevo deseo'}
          </p>

          <input
            type="text"
            placeholder="¿Qué quieres comprar?"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoComplete="nope"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
          />

          <div className="flex gap-2">
            <div className="flex items-center gap-1 flex-1">
              <span className="text-sm" style={{ color: 'var(--text-sub)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Costo estimado"
                value={form.estimated_cost}
                onChange={(e) => setForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
              />
            </div>

            <AppSelect
              value={form.priority}
              onChange={(v) => setForm((f) => ({ ...f, priority: v as WishlistPriority | '' }))}
              placeholder="Prioridad"
              options={[
                { value: 'high', label: 'Alta' },
                { value: 'medium', label: 'Media' },
                { value: 'low', label: 'Baja' },
              ]}
            />
          </div>

          <input
            type="text"
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
          />

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {activeItems.length === 0 && !formOpen && (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">✨</p>
          <p className="text-sm" style={{ color: 'var(--text-sub)' }}>Tu lista de deseos está vacía</p>
        </div>
      )}

      <div className="space-y-2">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="rounded-xl p-4"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    {item.name}
                  </span>
                  {item.priority && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        color: PRIORITY_COLOR[item.priority],
                        background: `${PRIORITY_COLOR[item.priority]}22`,
                      }}
                    >
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  )}
                </div>
                {item.estimated_cost != null && (
                  <p className="text-sm mt-0.5 font-semibold" style={{ color: 'var(--ac)' }}>
                    ${item.estimated_cost.toLocaleString('es', { minimumFractionDigits: 2 })}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-sub)' }}>
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onConvert(item)}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--ab)', color: 'var(--ac)' }}
              >
                Convertir en Fondo de Ahorro
              </button>
              <button
                onClick={() => openEdit(item)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(item)}
                className="text-xs px-3 py-1.5 rounded-lg text-red-500"
                style={{ background: 'rgba(239,68,68,0.1)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {convertedItems.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-card)' }}>
          <button
            type="button"
            onClick={() => setConvertedCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
              Ya promovidos ({convertedItems.length})
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {convertedCollapsed ? '▶' : '▼'}
            </span>
          </button>

          {!convertedCollapsed && (
            <div className="space-y-2 p-2" style={{ background: 'var(--bg-card)' }}>
              {convertedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-elevated)', opacity: 0.75 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                          {item.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: 'var(--color-positive)', background: 'rgba(34,197,94,0.12)' }}
                        >
                          ✓ Convertido
                        </span>
                      </div>
                      {item.estimated_cost != null && (
                        <p className="text-sm mt-0.5 font-semibold" style={{ color: 'var(--text-sub)' }}>
                          ${item.estimated_cost.toLocaleString('es', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-xs px-3 py-1.5 rounded-lg text-red-500"
                      style={{ background: 'rgba(239,68,68,0.1)' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirm && (
        <ConfirmSheet
          open={true}
          onClose={() => setConfirm(null)}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          destructive={confirm.destructive}
        />
      )}
    </div>
  )
}
