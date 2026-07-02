'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BudgetGroupRow, BudgetCategoryRow } from '@/types/budget'

function formatCompact(amount: number): string {
  return new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatExact(amount: number): string {
  return new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

interface BudgetRowProps {
  cat: BudgetCategoryRow
  month: string
  onEdit: (categoryId: string, newAmount: number) => void
  onTrends: (categoryId: string) => void
  isPast: boolean
}

function BudgetRow({ cat, month, onEdit, onTrends, isPast }: BudgetRowProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEdit() {
    if (cat.is_system) return
    setEditValue(cat.assigned > 0 ? String(cat.assigned) : '')
    setEditing(true)
  }

  async function commitEdit() {
    setEditing(false)
    const raw = parseFloat(editValue)
    const newAmount = isNaN(raw) || raw < 0 ? 0 : raw
    if (newAmount === cat.assigned) return

    setSaving(true)
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: cat.id,
          month,
          assigned_amount: newAmount,
        }),
      })
      if (res.ok) {
        onEdit(cat.id, newAmount)
      }
    } finally {
      setSaving(false)
    }
  }

  const disponibleColor =
    cat.disponible > 0
      ? 'var(--color-positive)'
      : cat.disponible < 0
        ? 'var(--color-negative)'
        : 'var(--text-dim)'

  return (
    <div
      className="grid items-center px-4 py-2"
      style={{
        gridTemplateColumns: '1fr 72px 64px 72px',
        borderBottom: '1px solid var(--border-card)',
        opacity: saving ? 0.6 : 1,
      }}
    >
      {/* Category name — tap for trends */}
      <button
        type="button"
        onClick={() => onTrends(cat.id)}
        className="text-left truncate"
      >
        <span
          className="text-xs font-medium"
          style={{ color: cat.is_system ? 'var(--text-dim)' : 'var(--text-main)' }}
        >
          {cat.name}
        </span>
      </button>

      {/* Asignado — editable (non-system) */}
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-full text-right text-xs font-bold outline-none rounded px-1 py-0.5"
          style={{
            background: 'var(--bg-elevated)',
            color: 'var(--text-main)',
            border: '1px solid var(--ac)',
          }}
        />
      ) : (
        <button
          type="button"
          disabled={cat.is_system || isPast}
          onClick={startEdit}
          className="text-right text-xs font-bold tabular-nums transition-opacity"
          style={{
            color: cat.is_system ? 'var(--text-dim)' : 'var(--text-main)',
            opacity: cat.is_system ? 0.5 : 1,
          }}
        >
          {cat.is_system ? '—' : formatCompact(cat.assigned)}
        </button>
      )}

      {/* Actividad */}
      <p
        className="text-right text-xs tabular-nums"
        style={{
          color: cat.activity < 0 ? 'var(--color-negative)' : 'var(--text-dim)',
        }}
      >
        {cat.activity !== 0 ? formatCompact(cat.activity) : '—'}
      </p>

      {/* Disponible */}
      <p
        className="text-right text-xs font-bold tabular-nums"
        style={{ color: disponibleColor }}
      >
        {formatCompact(cat.disponible)}
      </p>
    </div>
  )
}

interface BudgetGroupProps {
  group: BudgetGroupRow
  month: string
  onEdit: (categoryId: string, newAmount: number) => void
  onTrends: (categoryId: string) => void
  isPast: boolean
}

function BudgetGroup({ group, month, onEdit, onTrends, isPast }: BudgetGroupProps) {
  const [collapsed, setCollapsed] = useState(false)

  const totalAssigned = group.categories.reduce((s, c) => s + c.assigned, 0)
  const totalActivity = group.categories.reduce((s, c) => s + c.activity, 0)
  const totalDisponible = group.categories.reduce((s, c) => s + c.disponible, 0)

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full grid items-center px-4 py-2.5"
        style={{
          gridTemplateColumns: '1fr 72px 64px 72px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <span className="flex items-center gap-1 text-left">
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span
            className="text-[11px] font-extrabold uppercase tracking-wide truncate"
            style={{ color: 'var(--text-sub)' }}
          >
            {group.name}
          </span>
        </span>
        <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: 'var(--text-main)' }}>
          {formatExact(totalAssigned)}
        </span>
        <span
          className="text-right text-[11px] tabular-nums"
          style={{ color: totalActivity < 0 ? 'var(--color-negative)' : 'var(--text-dim)' }}
        >
          {totalActivity !== 0 ? formatExact(totalActivity) : '—'}
        </span>
        <span
          className="text-right text-[11px] font-bold tabular-nums"
          style={{
            color:
              totalDisponible > 0
                ? 'var(--color-positive)'
                : totalDisponible < 0
                  ? 'var(--color-negative)'
                  : 'var(--text-dim)',
          }}
        >
          {formatExact(totalDisponible)}
        </span>
      </button>

      {!collapsed &&
        group.categories.map((cat) => (
          <BudgetRow
            key={cat.id}
            cat={cat}
            month={month}
            onEdit={onEdit}
            onTrends={onTrends}
            isPast={isPast}
          />
        ))}
    </div>
  )
}

interface Props {
  groups: BudgetGroupRow[]
  month: string
  onEdit: (categoryId: string, newAmount: number) => void
  onTrends: (categoryId: string) => void
  isPast: boolean
}

export function BudgetTable({ groups, month, onEdit, onTrends, isPast }: Props) {
  return (
    <div>
      {/* Column headers */}
      <div
        className="grid px-4 py-1.5"
        style={{
          gridTemplateColumns: '1fr 72px 64px 72px',
          borderBottom: '2px solid var(--border-card)',
        }}
      >
        <span />
        {['Asignado', 'Actividad', 'Disponible'].map((h) => (
          <p
            key={h}
            className="text-right text-[9px] font-extrabold uppercase tracking-widest"
            style={{ color: 'var(--text-dim)' }}
          >
            {h}
          </p>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center py-12 px-8 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-dim)' }}>
            Sin categorías
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
            Crea grupos y categorías en la sección Categorías
          </p>
        </div>
      )}

      {groups.map((group) => (
        <BudgetGroup
          key={group.id}
          group={group}
          month={month}
          onEdit={onEdit}
          onTrends={onTrends}
          isPast={isPast}
        />
      ))}
    </div>
  )
}
