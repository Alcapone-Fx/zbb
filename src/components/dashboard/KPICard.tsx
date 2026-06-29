'use client'

interface Props {
  label: string
  amount: number
  pct?: number | null
  variant?: 'default' | 'positive' | 'negative' | 'neutral'
  alwaysLive?: boolean
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export function KPICard({ label, amount, pct, variant = 'default', alwaysLive }: Props) {
  const colorMap: Record<string, string> = {
    default: 'var(--text-main)',
    positive: 'var(--color-positive)',
    negative: 'var(--color-negative)',
    neutral: 'var(--text-sub)',
  }
  const amountColor = colorMap[variant]

  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-card)',
      }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-sub)' }}>
        {label}
        {alwaysLive && (
          <span
            className="ml-1.5 text-[10px] font-normal opacity-60"
            style={{ color: 'var(--text-dim)' }}
          >
            (tiempo real)
          </span>
        )}
      </p>
      <p className="text-lg font-extrabold tracking-tight" style={{ color: amountColor }}>
        {formatAmount(amount)}
      </p>
      {pct != null && (
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% del ingreso
        </p>
      )}
    </div>
  )
}
