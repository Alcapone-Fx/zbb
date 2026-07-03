'use client'

import { useState, useCallback, useEffect } from 'react'
import { PeriodSelector } from './PeriodSelector'
import { KPICard } from './KPICard'
import { SpendingDonut } from './SpendingDonut'
import { NetWorthChart } from './NetWorthChart'
import { IdealVsRealTable } from './IdealVsRealTable'
import type { DashboardData, DashboardPeriod } from '@/types/dashboard'

const EMPTY_DATA: DashboardData = {
  period: 'current_month',
  net_income: 0,
  total_expense: 0,
  expense_pct: 0,
  savings: 0,
  savings_pct: 0,
  net_worth: 0,
  group_breakdown: [],
  ideal_vs_real: [],
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPeriod = useCallback(async (period: DashboardPeriod) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard?period=${period}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al cargar dashboard')
      } else {
        setData(json.data)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch current month on mount
  useEffect(() => {
    fetchPeriod('current_month')
  }, [fetchPeriod])

  function handlePeriodChange(p: DashboardPeriod) {
    fetchPeriod(p)
  }

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
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-sub)' }}>
          KPIs e indicadores financieros
        </p>
      </div>

      {/* Period selector */}
      <PeriodSelector value={data.period} onChange={handlePeriodChange} />

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

      {/* KPI grid */}
      {!loading && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-3">
          <KPICard
            label="Ingreso neto"
            amount={data.net_income}
            variant={data.net_income >= 0 ? 'positive' : 'negative'}
          />
          <KPICard
            label="Gasto total"
            amount={data.total_expense}
            pct={data.expense_pct}
            variant="negative"
          />
          <KPICard
            label="Ahorro"
            amount={data.savings}
            pct={data.savings_pct}
            variant={data.savings >= 0 ? 'positive' : 'negative'}
          />
          <KPICard
            label="Patrimonio neto"
            amount={data.net_worth}
            variant={data.net_worth >= 0 ? 'positive' : 'negative'}
            alwaysLive
          />
        </div>
      )}

      {/* Spending donut */}
      {!loading && (
        <SpendingDonut rows={data.group_breakdown} totalExpense={data.total_expense} />
      )}

      {/* Net worth trend */}
      <NetWorthChart />

      {/* Ideal vs. Real */}
      {!loading && (
        <>
          <div className="px-5 pb-2">
            <h2
              className="text-sm font-semibold"
              style={{ color: 'var(--text-sub)' }}
            >
              Ideal vs. Real
            </h2>
          </div>
          <IdealVsRealTable rows={data.ideal_vs_real} />
        </>
      )}

      <div className="pb-24" />
    </>
  )
}
