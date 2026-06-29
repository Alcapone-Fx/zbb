import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPrevMonth, monthEnd } from '@/lib/zbb/budget'
import type { TrendsData, TrendMonth } from '@/types/budget'

const uuidSchema = z.string().uuid()

function nMonthsAgo(month: string, n: number): string {
  let m = month
  for (let i = 0; i < n; i++) m = getPrevMonth(m)
  return m
}

function nextMonth(month: string): string {
  const [y, mo] = month.split('-').map(Number)
  const d = new Date(y, mo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categoryId } = await params

  if (!uuidSchema.safeParse(categoryId).success) {
    return NextResponse.json({ error: 'ID de categoría inválido' }, { status: 400 })
  }

  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .eq('user_id', user.id)
    .single()

  if (catErr || !cat) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const startMonth = nMonthsAgo(currentMonth, 5) // inclusive → 6 months

  const dateFrom = `${startMonth}-01`
  const dateTo = monthEnd(currentMonth)

  const [bmsRes, accountsRes] = await Promise.all([
    supabase
      .from('budget_months')
      .select('id, month')
      .eq('user_id', user.id)
      .gte('month', startMonth)
      .lte('month', currentMonth)
      .order('month', { ascending: true }),

    supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_tracking_only', false)
      .eq('is_archived', false),
  ])

  const monthRows = bmsRes.data ?? []
  const bmIds = monthRows.map((m) => m.id)
  const monthByBmId: Record<string, string> = {}
  for (const m of monthRows) monthByBmId[m.id] = m.month

  const onBudgetIds = (accountsRes.data ?? []).map((a) => a.id)

  const [allocsRes, txRes] = await Promise.all([
    bmIds.length > 0
      ? supabase
          .from('budget_allocations')
          .select('budget_month_id, assigned_amount')
          .eq('category_id', categoryId)
          .in('budget_month_id', bmIds)
      : Promise.resolve({ data: [] as Array<{ budget_month_id: string; assigned_amount: number }>, error: null }),

    onBudgetIds.length > 0
      ? supabase
          .from('transactions')
          .select('amount, date')
          .eq('user_id', user.id)
          .eq('category_id', categoryId)
          .in('account_id', onBudgetIds)
          .gte('date', dateFrom)
          .lte('date', dateTo)
      : Promise.resolve({ data: [] as Array<{ amount: number; date: string }>, error: null }),
  ])

  const assignedByMonth: Record<string, number> = {}
  for (const row of allocsRes.data ?? []) {
    const month = monthByBmId[row.budget_month_id]
    if (month) assignedByMonth[month] = Number(row.assigned_amount)
  }

  const activityByMonth: Record<string, number> = {}
  for (const tx of txRes.data ?? []) {
    const month = (tx.date as string).slice(0, 7)
    activityByMonth[month] = (activityByMonth[month] ?? 0) + Number(tx.amount)
  }

  const months: TrendMonth[] = []
  let m = startMonth
  while (m <= currentMonth) {
    months.push({
      month: m,
      assigned: assignedByMonth[m] ?? 0,
      activity: activityByMonth[m] ?? 0,
    })
    m = nextMonth(m)
  }

  const last3 = months.slice(-3)
  const avgActivity =
    last3.length > 0
      ? last3.reduce((s, x) => s + Math.abs(x.activity), 0) / last3.length
      : 0

  let peakMonth: string | null = null
  let peakAbs = 0
  for (const row of months) {
    const abs = Math.abs(row.activity)
    if (abs > peakAbs) {
      peakAbs = abs
      peakMonth = row.month
    }
  }

  const result: TrendsData = {
    categoryId,
    categoryName: cat.name as string,
    months,
    avgActivity,
    peakMonth,
  }

  return NextResponse.json({ data: result })
}
