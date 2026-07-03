'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { NetWorthPoint } from '@/app/api/dashboard/net-worth-history/route'

function formatAmount(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatCompact(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`
  return `${sign}$${abs}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const value: number = payload[0].value
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs shadow-lg"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-card)',
        color: 'var(--text-main)',
      }}
    >
      <p className="font-semibold mb-0.5" style={{ color: 'var(--text-sub)' }}>{label}</p>
      <p
        className="font-extrabold tabular-nums"
        style={{ color: value >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
      >
        {formatAmount(value)}
      </p>
    </div>
  )
}

export function NetWorthChart() {
  const [data, setData] = useState<NetWorthPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/net-worth-history')
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const latest = data[data.length - 1]?.net_worth ?? 0
  const earliest = data[0]?.net_worth ?? 0
  const delta = latest - earliest
  const hasData = data.some((p) => p.net_worth !== 0)

  return (
    <div className="mx-5 mt-3 mb-1">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-sub)' }}>
        Tendencia de patrimonio
      </h2>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}
      >
        {loading ? (
          <div className="h-[168px] flex items-center justify-center">
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Cargando…</p>
          </div>
        ) : !hasData ? (
          <div className="h-[168px] flex items-center justify-center">
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Sin datos suficientes</p>
          </div>
        ) : (
          <>
            {/* KPI strip */}
            <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
              <p
                className="text-lg font-extrabold tabular-nums"
                style={{ color: latest >= 0 ? 'var(--text-main)' : 'var(--color-negative)' }}
              >
                {formatAmount(latest)}
              </p>
              <p
                className="text-xs font-semibold tabular-nums"
                style={{ color: delta >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}
              >
                {delta >= 0 ? '+' : ''}{formatAmount(delta)} últimos 12m
              </p>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ac)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--ac)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatCompact}
                  tick={{ fontSize: 10, fill: 'var(--text-dim)' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <ReferenceLine y={0} stroke="var(--border-card)" strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="net_worth"
                  stroke="var(--ac)"
                  strokeWidth={2}
                  fill="url(#nwGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--ac)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
