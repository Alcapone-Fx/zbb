import type { DashboardPeriod, IdealVsRealRow } from '@/types/dashboard'

export interface PeriodDateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0) // day 0 of next month = last day of this month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function computePeriodDateRange(period: DashboardPeriod, now = new Date()): PeriodDateRange {
  const y = now.getFullYear()
  const m = now.getMonth() + 1 // 1-based

  const pad = (n: number) => String(n).padStart(2, '0')
  const toYYYYMM = (year: number, month: number): [number, number] => {
    if (month < 1) return [year - 1, month + 12]
    if (month > 12) return [year + 1, month - 12]
    return [year, month]
  }

  switch (period) {
    case 'current_month': {
      return {
        from: `${y}-${pad(m)}-01`,
        to: lastDayOfMonth(y, m),
      }
    }
    case 'prev_month': {
      const [py, pm] = toYYYYMM(y, m - 1)
      return {
        from: `${py}-${pad(pm)}-01`,
        to: lastDayOfMonth(py, pm),
      }
    }
    case 'quarter': {
      // Last 3 calendar months + current month partial → 3-month window ending today
      const [qy, qm] = toYYYYMM(y, m - 2)
      return {
        from: `${qy}-${pad(qm)}-01`,
        to: lastDayOfMonth(y, m),
      }
    }
    case 'year': {
      return {
        from: `${y}-01-01`,
        to: lastDayOfMonth(y, m),
      }
    }
  }
}

export interface GroupSpending {
  group_id: string
  group_name: string
  ideal_percentage: number
  spending: number // absolute value (positive)
}

export function computeIdealVsReal(
  groups: GroupSpending[],
  totalIncome: number
): IdealVsRealRow[] {
  return groups.map((g) => {
    const real_pct =
      totalIncome > 0 ? Math.round((g.spending / totalIncome) * 10000) / 100 : 0
    return {
      group_id: g.group_id,
      group_name: g.group_name,
      ideal_pct: g.ideal_percentage,
      real_pct,
      real_amount: g.spending,
    }
  })
}
