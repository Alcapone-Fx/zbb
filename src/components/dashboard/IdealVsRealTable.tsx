'use client'

import type { IdealVsRealRow } from '@/types/dashboard'

interface Props {
  rows: IdealVsRealRow[]
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function IdealVsRealTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div
        className="mx-5 mt-2 px-4 py-5 rounded-2xl text-center text-sm"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-card)',
          color: 'var(--text-dim)',
        }}
      >
        Sin metas de presupuesto configuradas.{' '}
        <a href="/settings/goals" className="underline" style={{ color: 'var(--color-accent)' }}>
          Configurar metas
        </a>
      </div>
    )
  }

  return (
    <div
      className="mx-5 mt-2 rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-card)' }}
    >
      {/* Header */}
      <div
        className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-2.5 text-[11px] font-semibold"
        style={{
          background: 'var(--bg-elevated)',
          color: 'var(--text-dim)',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <span>Grupo</span>
        <span className="text-right w-14">Ideal</span>
        <span className="text-right w-16">Real</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const over = row.real_pct > row.ideal_pct
        const indicatorColor = over ? 'var(--color-negative)' : 'var(--color-positive)'
        return (
          <div
            key={row.group_id}
            className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-3 items-center"
            style={{
              background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-elevated)',
              borderTop: i > 0 ? '1px solid var(--border-card)' : undefined,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: indicatorColor }}
              />
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {row.group_name}
              </span>
            </div>
            <span
              className="text-sm font-semibold text-right w-14"
              style={{ color: 'var(--text-sub)' }}
            >
              {row.ideal_pct}%
            </span>
            <div className="text-right w-16">
              <span
                className="text-sm font-bold"
                style={{ color: indicatorColor }}
              >
                {row.real_pct.toFixed(1)}%
              </span>
              <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {formatAmount(row.real_amount)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
