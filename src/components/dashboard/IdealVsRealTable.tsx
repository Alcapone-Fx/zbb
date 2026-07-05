'use client'

import type { IdealVsRealRow } from '@/types/dashboard'
import { MaskedAmount } from '@/components/shared/MaskedAmount'

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
        <a href="/settings/goals" className="underline" style={{ color: 'var(--ac)' }}>
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
        className="grid px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          gridTemplateColumns: '1fr 40px 48px 52px',
          gap: '8px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-dim)',
          borderBottom: '1px solid var(--border-card)',
        }}
      >
        <span>Grupo</span>
        <span className="text-right">Ideal</span>
        <span className="text-right">Real</span>
        <span className="text-right">Posición</span>
      </div>

      {/* Rows */}
      {rows.map((row, i) => {
        const delta = row.real_pct - row.ideal_pct
        const realColor = row.real_pct > 0 ? 'var(--text-main)' : 'var(--text-dim)'

        return (
          <div
            key={row.group_id}
            className="grid px-4 py-3 items-center"
            style={{
              gridTemplateColumns: '1fr 40px 48px 52px',
              gap: '8px',
              background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-elevated)',
              borderTop: i > 0 ? '1px solid var(--border-card)' : undefined,
            }}
          >
            {/* Group name */}
            <span
              className="text-xs font-medium truncate"
              style={{ color: 'var(--text-main)' }}
            >
              {row.group_name}
            </span>

            {/* Ideal % */}
            <span
              className="text-xs text-right tabular-nums"
              style={{ color: 'var(--text-sub)' }}
            >
              {row.ideal_pct}%
            </span>

            {/* Real % + amount */}
            <div className="text-right">
              <p
                className="text-xs font-bold tabular-nums"
                style={{ color: realColor }}
              >
                {row.real_pct.toFixed(1)}%
              </p>
              <p className="text-[10px] tabular-nums" style={{ color: 'var(--text-dim)' }}>
                <MaskedAmount value={formatAmount(row.real_amount)} />
              </p>
            </div>

            {/* Posición (delta real − ideal) */}
            <div className="text-right">
              <p
                className="text-xs font-bold tabular-nums"
                style={{ color: 'var(--text-sub)' }}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
