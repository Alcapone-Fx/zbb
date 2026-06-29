'use client'

import type { DashboardPeriod } from '@/types/dashboard'

const LABELS: Record<DashboardPeriod, string> = {
  current_month: 'Este mes',
  prev_month: 'Mes anterior',
  quarter: 'Trimestre',
  year: 'Año',
}

interface Props {
  value: DashboardPeriod
  onChange: (p: DashboardPeriod) => void
}

export function PeriodSelector({ value, onChange }: Props) {
  const periods: DashboardPeriod[] = ['current_month', 'prev_month', 'quarter', 'year']
  return (
    <div className="flex gap-1.5 px-5 py-3 overflow-x-auto no-scrollbar">
      {periods.map((p) => {
        const active = p === value
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={
              active
                ? { background: 'var(--color-accent)', color: '#fff' }
                : {
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-sub)',
                    border: '1px solid var(--border-card)',
                  }
            }
          >
            {LABELS[p]}
          </button>
        )
      })}
    </div>
  )
}
