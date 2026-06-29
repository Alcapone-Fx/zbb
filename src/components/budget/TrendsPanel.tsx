'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { TrendsData } from '@/types/budget'

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function shortMonth(yyyyMM: string): string {
  const m = parseInt(yyyyMM.split('-')[1], 10)
  return MONTH_SHORT[m - 1] ?? yyyyMM
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

interface Props {
  categoryId: string
  onClose: () => void
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'done'; data: TrendsData }

export function TrendsPanel({ categoryId, onClose }: Props) {
  // Component is remounted via key={categoryId} in BudgetClient, so initial
  // state is always 'loading'. The effect only updates state in async callbacks.
  const [state, setState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetch(`/api/budget/trends/${categoryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setState({ status: 'error', error: json.error })
        else setState({ status: 'done', data: json.data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', error: 'Error de conexión' })
      })

    return () => { cancelled = true }
  }, [categoryId])

  const loading = state.status === 'loading'
  const error = state.status === 'error' ? state.error : null
  const data = state.status === 'done' ? state.data : null

  const chartData = (data?.months ?? []).map((m) => ({
    name: shortMonth(m.month),
    Asignado: m.assigned,
    Actividad: Math.abs(m.activity),
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm h-full overflow-y-auto flex flex-col"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-card)' }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
              Tendencias
            </p>
            <p className="text-base font-extrabold mt-0.5" style={{ color: 'var(--text-main)' }}>
              {data?.categoryName ?? '…'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-sub)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-4">
          {loading && (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Cargando…
            </p>
          )}

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-negative)' }}>
              {error}
            </p>
          )}

          {data && (
            <>
              {/* KPIs */}
              <div
                className="flex gap-4 mb-5 p-3 rounded-2xl"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                    Gasto prom. (3 m)
                  </p>
                  <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {formatCurrency(data.avgActivity)}
                  </p>
                </div>
                {data.peakMonth && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                      Mes más alto
                    </p>
                    <p className="text-base font-extrabold" style={{ color: 'var(--text-main)' }}>
                      {shortMonth(data.peakMonth)}
                    </p>
                  </div>
                )}
              </div>

              {/* Chart */}
              <p className="text-xs font-bold mb-3" style={{ color: 'var(--text-sub)' }}>
                Últimos 6 meses
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v}`}
                    width={40}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Asignado" fill="var(--ac)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actividad" fill="var(--color-negative)" radius={[3, 3, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>

              {/* Month table */}
              <div className="mt-4">
                <div className="grid grid-cols-3 mb-1 px-1">
                  {['Mes', 'Asignado', 'Gasto'].map((h) => (
                    <p key={h} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                      {h}
                    </p>
                  ))}
                </div>
                {data.months.map((m) => (
                  <div
                    key={m.month}
                    className="grid grid-cols-3 px-1 py-1.5"
                    style={{ borderTop: '1px solid var(--border-card)' }}
                  >
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-sub)' }}>
                      {shortMonth(m.month)}
                    </p>
                    <p className="text-xs tabular-nums" style={{ color: 'var(--text-main)' }}>
                      {formatCurrency(m.assigned)}
                    </p>
                    <p
                      className="text-xs tabular-nums"
                      style={{ color: m.activity < 0 ? 'var(--color-negative)' : 'var(--text-main)' }}
                    >
                      {m.activity !== 0 ? formatCurrency(m.activity) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
