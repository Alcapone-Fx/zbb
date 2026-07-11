'use client'

import { useState, useCallback, useEffect } from 'react'
import { MonthNavigator } from './MonthNavigator'
import { DineroAAsignarKPI } from './DineroAAsignarKPI'
import { TemplateActions } from './TemplateActions'
import { BudgetTable } from './BudgetTable'
import { TrendsPanel } from './TrendsPanel'
import { useBudgetStore } from '@/stores/budget.store'
import type { BudgetMonthData, BudgetGroupRow } from '@/types/budget'

function currentMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function isPastMonth(month: string): boolean {
  return month < currentMonthString()
}

const EMPTY_DATA: BudgetMonthData = {
  month: '',
  dineroAAsignar: 0,
  primaryAccountAvailable: null,
  groups: [],
}

interface Props {
  initialMonth: string
  initialData?: BudgetMonthData
}

export function BudgetClient({ initialMonth, initialData }: Props) {
  const [month, setMonth] = useState(initialMonth)
  const [data, setData] = useState<BudgetMonthData>(initialData ?? EMPTY_DATA)
  // Start in loading state when no server-side data provided
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const [trendsCategory, setTrendsCategory] = useState<string | null>(null)

  const { staleAfter, isStale, clearStale, markStale } = useBudgetStore()

  const fetchMonth = useCallback(async (m: string) => {
    setLoading(true)
    setError(null)
    try {
      // GET itself ensures the budget_month row exists before reading
      const res = await fetch(`/api/budget/month?month=${m}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al cargar presupuesto')
      } else {
        setData(json.data)
        // Clear stale flag once we've refetched
        if (isStale(m)) clearStale()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [isStale, clearStale])

  // Fetch initial data on mount when no server-side data was provided
  useEffect(() => {
    if (!initialData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMonth(initialMonth)
    }
  }, [fetchMonth, initialData, initialMonth])

  // Re-fetch when a transaction added from the FAB marks the budget stale
  useEffect(() => {
    if (staleAfter !== null && month >= staleAfter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMonth(month)
    }
  }, [staleAfter, month, fetchMonth])

  async function handleMonthChange(m: string) {
    setMonth(m)
    // Always fetch when navigating — handles both new months and stale months
    await fetchMonth(m)
  }

  // Optimistic update when user edits an allocation
  function handleEdit(categoryId: string, newAmount: number) {
    setData((prev) => {
      const oldCategory = prev.groups
        .flatMap((g) => g.categories)
        .find((c) => c.id === categoryId)
      const oldAssigned = oldCategory?.assigned ?? 0
      const oldDisponible = oldCategory?.disponible ?? 0

      const delta = newAmount - oldAssigned
      const newDisponible = oldDisponible + delta
      // dineroAAsignar is balance-based now: it only moves by how much
      // *reserved* (positive Disponible) money changed, not by the raw
      // assigned delta — a category that stays negative before and after
      // the edit shouldn't move it at all (see src/lib/zbb/budget.ts's
      // sumReservedDisponible, which this must mirror).
      const reservedDelta = Math.max(0, newDisponible) - Math.max(0, oldDisponible)

      const newGroups: BudgetGroupRow[] = prev.groups.map((g) => ({
        ...g,
        categories: g.categories.map((c) => {
          if (c.id !== categoryId) return c
          return {
            ...c,
            assigned: newAmount,
            disponible: newDisponible,
          }
        }),
      }))

      return {
        ...prev,
        dineroAAsignar: prev.dineroAAsignar - reservedDelta,
        groups: newGroups,
      }
    })

    // If editing a past month, future months need rollover recalculation
    if (isPastMonth(month)) {
      const nextM = (() => {
        const [y, mo] = month.split('-').map(Number)
        const d = new Date(y, mo, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })()
      markStale(nextM)
    }
  }

  async function handleTemplateApplied() {
    await fetchMonth(month)
  }

  const past = isPastMonth(month)

  return (
    <>
      {/* Page header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{
          background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
        }}
      >
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Presupuesto
        </h1>
      </div>

      {/* Month navigator */}
      <MonthNavigator month={month} onChange={handleMonthChange} />

      {/* Loading / error */}
      {loading && (
        <div className="px-5 py-2">
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Cargando…
          </p>
        </div>
      )}

      {error && !loading && (
        <div
          className="mx-5 mb-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--color-negative)' }}
        >
          {error}
        </div>
      )}

      {/* KPI */}
      {!loading && <DineroAAsignarKPI amount={data.dineroAAsignar} />}

      {/* Past month notice */}
      {past && !loading && (
        <div
          className="mx-5 mb-3 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(255,200,0,0.08)', color: 'var(--text-sub)' }}
        >
          Editando un mes pasado. Los cambios actualizan los rollovers de los meses siguientes al navegar.
        </div>
      )}

      {/* Template actions */}
      {!loading && (
        <TemplateActions
          month={month}
          groups={data.groups}
          onApplied={handleTemplateApplied}
        />
      )}

      {/* Budget table */}
      {!loading && (
        <div className="pb-24">
          <BudgetTable
            groups={data.groups}
            month={month}
            onEdit={handleEdit}
            onTrends={(catId) => setTrendsCategory(catId)}
            isPast={past}
          />
        </div>
      )}

      {/* Trends side panel */}
      {trendsCategory && (
        <TrendsPanel
          key={trendsCategory}
          categoryId={trendsCategory}
          onClose={() => setTrendsCategory(null)}
        />
      )}
    </>
  )
}
