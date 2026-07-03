'use client'

import { useState, useEffect } from 'react'
import { groceryCalc, daysInMonth } from '@/lib/zbb/helpers-calc'
import { AppSelect } from '@/components/ui/AppSelect'

interface Category {
  id: string
  name: string
  group_name: string
}

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function GroceryCalculator() {
  const [dailyRate, setDailyRate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const month = currentMonthStr()
  const [year, m] = month.split('-').map(Number)
  const days = daysInMonth(year, m)
  const rate = parseFloat(dailyRate) || 0
  const result = groceryCalc(rate, year, m)

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
    if (!categoryId || result <= 0) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId, month, assigned_amount: result }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? 'Error al asignar' })
      } else {
        setMsg({ ok: true, text: `Asignado ${result.toFixed(2)} a presupuesto` })
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
        Calcula tu presupuesto mensual de supermercado a partir de una tasa diaria.
      </p>

      <div className="space-y-3">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Gasto diario estimado
        </label>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-sub)' }}>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            placeholder="0.00"
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
              color: 'var(--text-main)',
            }}
          />
        </div>
      </div>

      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'var(--bg-card)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
            {days} días × ${rate.toFixed(2)}/día
          </p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
            ${result.toFixed(2)}
          </p>
        </div>
        <span className="text-3xl">🛒</span>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Asignar a categoría
        </label>
        <AppSelect
          value={categoryId}
          onChange={setCategoryId}
          placeholder="Seleccionar categoría…"
          options={categories.map((c) => ({ value: c.id, label: c.name, sub: c.group_name }))}
        />
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <button
        onClick={handleAsignar}
        disabled={!categoryId || result <= 0 || saving}
        className="w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-40"
        style={{ background: 'var(--ac)', color: '#fff' }}
      >
        {saving ? 'Asignando…' : 'Asignar al presupuesto'}
      </button>
    </div>
  )
}
