'use client'

import { useState, useEffect } from 'react'
import { countWeekends, daysInMonth, weekendPlannerCalc, avgRecentActivity } from '@/lib/zbb/helpers-calc'
import { AppSelect } from '@/components/ui/AppSelect'
import type { TrendsData } from '@/types/budget'
import type { RecurringBudgetPattern } from '@/types/helpers'

interface Category {
  id: string
  name: string
  group_name: string
}

const PATTERN_LABEL: Record<RecurringBudgetPattern, string> = {
  daily: 'Todos los días',
  weekend: 'Fines de semana',
}

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function RecurringBudgetPlanner() {
  const [available, setAvailable] = useState('')
  const [fixedExpenses, setFixedExpenses] = useState('')
  const [pattern, setPattern] = useState<RecurringBudgetPattern>('weekend')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [trends, setTrends] = useState<TrendsData | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const month = currentMonthStr()
  const [year, m] = month.split('-').map(Number)
  const days = daysInMonth(year, m)
  const periodCount = pattern === 'daily' ? days : countWeekends(year, m)
  const periodLabel = pattern === 'daily' ? 'días' : 'fines de semana'

  const avail = parseFloat(available) || 0
  const fixed = parseFloat(fixedExpenses) || 0
  const perPeriod = weekendPlannerCalc(avail, fixed, periodCount)
  const totalBudget = Math.max(0, avail - fixed)

  const suggestedMonthly = trends ? avgRecentActivity(trends.months) : null

  const currentMonthEntry = trends?.months[trends.months.length - 1]
  const spentThisMonth = currentMonthEntry ? Math.abs(currentMonthEntry.activity) : 0
  const plannedThisMonth =
    currentMonthEntry && currentMonthEntry.assigned > 0 ? currentMonthEntry.assigned : totalBudget

  const categorySections = Object.values(
    categories.reduce<Record<string, { label: string; options: { value: string; label: string }[] }>>(
      (acc, c) => {
        if (!acc[c.group_name]) acc[c.group_name] = { label: c.group_name, options: [] }
        acc[c.group_name].options.push({ value: c.id, label: c.name })
        return acc
      },
      {}
    )
  )

  useEffect(() => {
    Promise.all([
      fetch('/api/categories/groups').then((r) => r.json()),
      fetch('/api/user-settings').then((r) => r.json()),
    ]).then(([catsJson, settingsJson]) => {
      const cats: Category[] = []
      for (const g of catsJson.data ?? catsJson ?? []) {
        for (const c of g.categories ?? []) {
          if (!c.is_system) cats.push({ id: c.id, name: c.name, group_name: g.name })
        }
      }
      setCategories(cats)

      const savedCategoryId = settingsJson.data?.recurring_budget_category_id as string | null
      const savedPattern = settingsJson.data?.recurring_budget_pattern as RecurringBudgetPattern | null
      if (savedCategoryId && cats.some((c) => c.id === savedCategoryId)) {
        setCategoryId(savedCategoryId)
      }
      if (savedPattern) setPattern(savedPattern)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!categoryId) {
      Promise.resolve().then(() => setTrends(null))
      return
    }
    let cancelled = false
    fetch(`/api/budget/trends/${categoryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.data) setTrends(json.data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [categoryId])

  function persistSettings(next: { categoryId?: string; pattern?: RecurringBudgetPattern }) {
    fetch('/api/user-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recurring_budget_category_id: next.categoryId ?? categoryId ?? null,
        recurring_budget_pattern: next.pattern ?? pattern,
      }),
    }).catch(() => {})
  }

  function handleCategoryChange(newId: string) {
    setCategoryId(newId)
    persistSettings({ categoryId: newId })
  }

  function handlePatternChange(newPattern: RecurringBudgetPattern) {
    setPattern(newPattern)
    persistSettings({ pattern: newPattern })
  }

  function useSuggestedAmount() {
    if (suggestedMonthly != null) setAvailable(suggestedMonthly.toFixed(2))
  }

  async function handleAsignar() {
    if (!categoryId || totalBudget <= 0) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          month,
          assigned_amount: totalBudget,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg({ ok: false, text: json.error ?? 'Error al asignar' })
      } else {
        setMsg({ ok: true, text: `Asignado $${totalBudget.toFixed(2)} al presupuesto` })
      }
    } catch {
      setMsg({ ok: false, text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
          {days} días · <strong style={{ color: 'var(--text-main)' }}>{periodCount} {periodLabel}</strong> en este mes.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
          Calculadora de apoyo — te ayuda a planear y seguir tu gasto de este mes, no ahorra ni acumula saldo.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          ¿Qué días contás?
        </label>
        <AppSelect
          value={pattern}
          onChange={(v) => handlePatternChange(v as RecurringBudgetPattern)}
          options={[
            { value: 'daily', label: PATTERN_LABEL.daily },
            { value: 'weekend', label: PATTERN_LABEL.weekend },
          ]}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
          Categoría
        </label>
        <AppSelect
          value={categoryId}
          onChange={handleCategoryChange}
          placeholder="Seleccionar categoría…"
          sections={categorySections}
          searchable
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
              Dinero disponible
            </label>
            {suggestedMonthly != null && (
              <button
                onClick={useSuggestedAmount}
                className="text-xs font-medium"
                style={{ color: 'var(--ac)' }}
              >
                Sugerido: ${suggestedMonthly.toFixed(2)}
              </button>
            )}
          </div>
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
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Por {pattern === 'daily' ? 'día' : 'fin de semana'}</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
            ${perPeriod.toFixed(2)}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <p className="text-xs" style={{ color: 'var(--text-sub)' }}>Total</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
            ${totalBudget.toFixed(2)}
          </p>
        </div>
      </div>

      {categoryId && plannedThisMonth > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-sub)' }}>
            <span>Gastado este mes</span>
            <span>${spentThisMonth.toFixed(2)} de ${plannedThisMonth.toFixed(2)} planeados</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (spentThisMonth / plannedThisMonth) * 100)}%`,
                background: spentThisMonth > plannedThisMonth ? '#f59e0b' : 'var(--ac)',
              }}
            />
          </div>
        </div>
      )}

      {msg && (
        <p className={`text-sm ${msg.ok ? 'text-green-500' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <button
        onClick={handleAsignar}
        disabled={!categoryId || totalBudget <= 0 || saving}
        className="w-full rounded-xl py-3 text-sm font-semibold transition disabled:opacity-40"
        style={{ background: 'var(--ac)', color: '#fff' }}
      >
        {saving ? 'Asignando…' : 'Asignar total al presupuesto'}
      </button>
    </div>
  )
}
