import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { monthSchema } from '@/types/budget'
import {
  computeDisponibles,
  computeDineroAAsignar,
  getPrevMonth,
  monthEnd,
} from '@/lib/zbb/budget'
import type { BudgetMonthData, BudgetGroupRow, BudgetCategoryRow } from '@/types/budget'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const monthParam = url.searchParams.get('month') ?? currentMonth()
  const parsed = monthSchema.safeParse(monthParam)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Mes inválido (YYYY-MM)' }, { status: 400 })
  }
  const targetMonth = parsed.data

  // Fetch all budget_months up to and including target
  const { data: allMonthsData, error: monthsErr } = await supabase
    .from('budget_months')
    .select('id, month')
    .eq('user_id', user.id)
    .lte('month', targetMonth)
    .order('month', { ascending: true })

  if (monthsErr) {
    console.error('GET /api/budget/month months fetch error', monthsErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allMonths = allMonthsData ?? []
  const sortedMonths = allMonths.map((m) => m.month)
  const monthIdByMonth: Record<string, string> = {}
  for (const m of allMonths) monthIdByMonth[m.month] = m.id

  const budgetMonthIds = allMonths.map((m) => m.id)
  const earliestMonth = sortedMonths[0] ?? targetMonth
  const prevMonth = getPrevMonth(targetMonth)

  // Parallel: groups+cats, on-budget accounts, allocations
  const [groupsRes, catsRes, accountsRes, allocsRes] = await Promise.all([
    supabase
      .from('category_groups')
      .select('id, name, is_system, is_archived, display_order, ideal_percentage')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),

    supabase
      .from('categories')
      .select('id, group_id, name, is_system, is_archived, display_order')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('display_order', { ascending: true }),

    supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_tracking_only', false)
      .eq('is_archived', false),

    budgetMonthIds.length > 0
      ? supabase
          .from('budget_allocations')
          .select('budget_month_id, category_id, assigned_amount')
          .in('budget_month_id', budgetMonthIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (groupsRes.error || catsRes.error) {
    console.error('GET /api/budget/month groups/cats error', groupsRes.error ?? catsRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allGroups = (groupsRes.data ?? []).filter((g) => !g.is_archived)
  const allCats = catsRes.data ?? []
  const categoryIds = allCats.map((c) => c.id)
  const onBudgetIds = (accountsRes.data ?? []).map((a) => a.id)

  // Build allocations map: month -> catId -> assigned_amount
  const monthById: Record<string, string> = {}
  for (const m of allMonths) monthById[m.id] = m.month

  const allocationsMap: Record<string, Record<string, number>> = {}
  for (const row of allocsRes.data ?? []) {
    const month = monthById[row.budget_month_id]
    if (!month) continue
    if (!allocationsMap[month]) allocationsMap[month] = {}
    allocationsMap[month][row.category_id] = Number(row.assigned_amount)
  }

  // Transactions: from earliest month to end of target month, on-budget accounts
  const dateFrom = `${earliestMonth}-01`
  const dateTo = monthEnd(targetMonth)
  // Also need prev month for income next_month=true → extend start if prevMonth < earliest
  const fetchFrom = prevMonth < earliestMonth ? `${prevMonth}-01` : dateFrom

  const txQuery =
    onBudgetIds.length > 0
      ? await supabase
          .from('transactions')
          .select('category_id, amount, date, type, next_month')
          .eq('user_id', user.id)
          .in('account_id', onBudgetIds)
          .gte('date', fetchFrom)
          .lte('date', dateTo)
      : { data: [], error: null }

  if (txQuery.error) {
    console.error('GET /api/budget/month transactions error', txQuery.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allTx = txQuery.data ?? []

  // Build activity map: month -> catId -> signed sum (for disponible computation)
  const activitiesMap: Record<string, Record<string, number>> = {}
  // Income sums for Dinero a Asignar
  let incomeThisMonth = 0
  let incomeLastMonthNextFlag = 0

  for (const tx of allTx) {
    const txMonth = tx.date.slice(0, 7) // YYYY-MM
    const amount = Number(tx.amount)

    // Activity for disponible: all transactions within budget months range
    if (txMonth >= earliestMonth && txMonth <= targetMonth && tx.category_id) {
      if (!activitiesMap[txMonth]) activitiesMap[txMonth] = {}
      activitiesMap[txMonth][tx.category_id] =
        (activitiesMap[txMonth][tx.category_id] ?? 0) + amount
    }

    // Income for Dinero a Asignar
    if (tx.type === 'income') {
      if (txMonth === targetMonth && !tx.next_month) {
        incomeThisMonth += amount
      } else if (txMonth === prevMonth && tx.next_month) {
        incomeLastMonthNextFlag += amount
      }
    }
  }

  // Compute disponibles for all months
  const allDisponibles = computeDisponibles(
    sortedMonths,
    allocationsMap,
    activitiesMap,
    categoryIds
  )

  // Negative rollover from previous month for Dinero a Asignar
  const prevMonthDisponibles = allDisponibles[prevMonth] ?? {}
  let negativeRolloverPrevMonth = 0
  for (const catId of categoryIds) {
    const d = prevMonthDisponibles[catId] ?? 0
    if (d < 0) negativeRolloverPrevMonth += d
  }

  // Total allocated this month
  const totalAllocatedThisMonth = Object.values(
    allocationsMap[targetMonth] ?? {}
  ).reduce((s, v) => s + v, 0)

  const dineroAAsignar = computeDineroAAsignar({
    incomeThisMonth,
    incomeLastMonthNextFlag,
    totalAllocatedThisMonth,
    negativeRolloverPrevMonth,
  })

  // Build response groups
  const targetDisponibles = allDisponibles[targetMonth] ?? {}
  const targetAllocations = allocationsMap[targetMonth] ?? {}
  const targetActivities = activitiesMap[targetMonth] ?? {}

  const catsByGroup: Record<string, BudgetCategoryRow[]> = {}
  for (const cat of allCats) {
    if (!catsByGroup[cat.group_id]) catsByGroup[cat.group_id] = []
    catsByGroup[cat.group_id].push({
      id: cat.id,
      name: cat.name,
      is_system: cat.is_system,
      display_order: cat.display_order,
      assigned: targetAllocations[cat.id] ?? 0,
      activity: targetActivities[cat.id] ?? 0,
      disponible: targetDisponibles[cat.id] ?? 0,
    })
  }

  const groups: BudgetGroupRow[] = allGroups.map((g) => ({
    id: g.id,
    name: g.name,
    is_system: g.is_system,
    ideal_percentage: g.ideal_percentage !== undefined ? Number(g.ideal_percentage) : null,
    display_order: g.display_order,
    categories: catsByGroup[g.id] ?? [],
  }))

  const responseData: BudgetMonthData = {
    month: targetMonth,
    dineroAAsignar,
    groups,
  }

  return NextResponse.json({ data: responseData })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const monthParam = url.searchParams.get('month') ?? currentMonth()
  const parsed = monthSchema.safeParse(monthParam)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Mes inválido (YYYY-MM)' }, { status: 400 })
  }
  const targetMonth = parsed.data

  const { error: upsertErr } = await supabase
    .from('budget_months')
    .upsert({ user_id: user.id, month: targetMonth }, { onConflict: 'user_id,month' })

  if (upsertErr) {
    console.error('POST /api/budget/month upsert error', upsertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
