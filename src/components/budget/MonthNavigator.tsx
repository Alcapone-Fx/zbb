'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_LABELS[m - 1]} ${y}`
}

interface Props {
  month: string
  onChange: (month: string) => void
}

export function MonthNavigator({ month, onChange }: Props) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <button
        type="button"
        onClick={() => onChange(getPrevMonth(month))}
        aria-label="Mes anterior"
        className="p-1.5 rounded-lg transition-opacity hover:opacity-70 active:scale-95"
        style={{ color: 'var(--text-sub)' }}
      >
        <ChevronLeft size={20} />
      </button>

      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: 'var(--text-main)' }}
      >
        {formatMonth(month)}
      </span>

      <button
        type="button"
        onClick={() => onChange(getNextMonth(month))}
        aria-label="Mes siguiente"
        className="p-1.5 rounded-lg transition-opacity hover:opacity-70 active:scale-95"
        style={{ color: 'var(--text-sub)' }}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
