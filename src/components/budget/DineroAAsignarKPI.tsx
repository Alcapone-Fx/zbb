'use client'

import { MaskedAmount } from '@/components/shared/MaskedAmount'

interface Props {
  amount: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-419', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function DineroAAsignarKPI({ amount }: Props) {
  const isPositive = amount >= 0
  const color = isPositive ? 'var(--color-positive)' : 'var(--color-negative)'
  const bgColor = isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)'

  return (
    <div
      className="mx-5 mb-3 px-4 py-3 rounded-2xl"
      style={{ background: bgColor }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
        style={{ color: 'var(--text-dim)' }}
      >
        Dinero a Asignar
      </p>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight">
        <MaskedAmount value={formatCurrency(amount)} style={{ color }} />
      </p>
      {amount < 0 && (
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-negative)' }}>
          Has asignado más de lo que tienes disponible
        </p>
      )}
    </div>
  )
}
