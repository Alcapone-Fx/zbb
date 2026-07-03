'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { GroupBreakdownRow } from '@/types/dashboard'

const COLORS = ['#4F6EF7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

function formatAmount(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  rows: GroupBreakdownRow[]
  totalExpense: number
}

export function SpendingDonut({ rows, totalExpense }: Props) {
  return (
    <div className="mx-5 mt-3 mb-1">
      <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-sub)' }}>
        Distribución de gasto
      </h2>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-card)' }}
      >
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Sin gastos categorizados en el período
            </p>
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="amount"
                    nameKey="group_name"
                    innerRadius={58}
                    outerRadius={85}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {rows.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatAmount(Number(value)), String(name)]}
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-card)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{ top: 0 }}
              >
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>
                  Gasto total
                </p>
                <p className="text-base font-extrabold tabular-nums" style={{ color: 'var(--text-main)' }}>
                  {formatAmount(totalExpense)}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pt-1 pb-4">
              {rows.map((row, i) => (
                <div key={row.group_id} className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-xs truncate" style={{ color: 'var(--text-sub)' }}>
                    {row.group_name}
                  </span>
                  <span className="text-xs font-bold tabular-nums ml-auto flex-shrink-0" style={{ color: 'var(--text-main)' }}>
                    {row.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
