'use client'

import { useState, useEffect } from 'react'
import { countWeekends, weekendPlannerCalc, daysInMonth } from '@/lib/zbb/helpers-calc'

interface Category {
  id: string
  name: string
  group_name: string
}

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function WeekendPlanner() {
  const [available, setAvailable] = useState('')
  const [fixedExpenses, setFixedExpenses] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const month = currentMonthStr()
  const [year, m] = month.split('-').map(Number)
  const weekendCount = countWeekends(year, m)
  const days = daysInMonth(year, m)

  const avail = parseFloat(available) || 0
  const fixed = parseFloat(fixedExpenses) || 0
  const perWeekend = weekendPlannerCalc(avail, fixed, weekendCount)
  const totalWeekendBudget = Math.max(0, avail - fixed)

  useEffect(() => {
    fetch('/api/categories/groups')
      .then((r) => r.json())
      .then((json) => {
        const cats: Category[] = []
        for (const g of json.data ?? json ?? []) {
          for (const c of g.categories ?? []) {
            if (!c.is_system) cats.push({ id: c.id, name: c.name, group_name: g.name })
          }
        }
        setCategories(cats)
      })
      .catch(() => {})
  }, [])

  async function handleAsignar() {
    if (!categoryId || totalWeekendBudget <= 0) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          month,
          assigned_amount: totalWeekendBudget,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? 'Error al asignar' })
      } else {
        setMsg({ ok: true, text: `Asignado $${totalWeekendBudget.toFixed(2)} al presupuesto` })
      }
    } catch {
      setMsg({ ok: false, text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
        {days} días · <strong style={{ color: 'var(--text-main)' }}>{weekendCount} fines de semana</strong> en este mes.
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Dinero disponible
          </label>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-sub)' }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={available}
              onChange={(e) => setAvailable(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Gastos fijos comprometidos
          </label>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-sub)' }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fixedExpenses}
              onChange={(e) => setFixedExpenses(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Por fin de semana</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
            ${perWeekend.toFixed(2)}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Total ocio</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
            ${totalWeekendBudget.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Asignar a categoría
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            color: 'var(--text-main)',
          }}
        >
          <option value="">Seleccionar categoría…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.group_name} · {c.name}
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <button
        onClick={handleAsignar}
        disabled={!categoryId || totalWeekendBudget <= 0 || saving}
        className="w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-40"
        style={{ background: 'var(--ac)', color: '#fff' }}
      >
        {saving ? 'Asignando…' : 'Asignar total ocio al presupuesto'}
      </button>
    </div>
  )
}
