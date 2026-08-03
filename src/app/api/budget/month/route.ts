import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { monthSchema } from '@/types/budget'
import {
  computeDisponibles,
  sumReservedDisponible,
  computeReadyToAssign,
  monthEnd,
  monthRange,
  getPrevMonth,
} from '@/lib/zbb/budget'
import { sumBalancesByAccount, signedAccountBalance } from '@/lib/zbb/accounts'
import { computeCcPaymentActivity } from '@/lib/zbb/credit-cards'
import type { CcTransaction } from '@/lib/zbb/credit-cards'
import type { BudgetMonthData, BudgetGroupRow, BudgetCategoryRow } from '@/types/budget'
import type { AccountType } from '@/types/account'

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

  // Ensure the target month's row exists before reading (was previously a
  // separate client-side POST call — folded in here to save a round-trip).
  const { error: upsertErr } = await supabase
    .from('budget_months')
    .upsert({ user_id: user.id, month: targetMonth }, { onConflict: 'user_id,month' })

  if (upsertErr) {
    console.error('GET /api/budget/month upsert error', upsertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

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
  const budgetMonthIds = allMonths.map((m) => m.id)
  // The upsert above guarantees at least the target month's row exists.
  const earliestMonth = allMonths[0]?.month ?? targetMonth
  // Contiguous, NOT just the months holding a budget_months row: a month the
  // user never opened has no row, and computeDisponibles would skip straight
  // over it, dropping its activity from every category's rollover.
  const sortedMonths = monthRange(earliestMonth, targetMonth)

  // Parallel: groups+cats, on-budget accounts, allocations
  const [groupsRes, catsRes, accountsRes, allocsRes] = await Promise.all([
    supabase
      .from('category_groups')
      .select('id, name, is_system, is_archived, display_order, ideal_percentage')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),

    supabase
      .from('categories')
      .select('id, group_id, name, is_system, is_archived, display_order, linked_account_id')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('display_order', { ascending: true }),

    supabase
      .from('accounts')
      .select('id, type')
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

  // CC "Pago · X" categories get their activity computed synthetically below
  // (from the linked account's real expense/transfer net) — the literal mirror
  // transactions must be excluded from the generic activity sum, or their
  // activity would be counted twice.
  const ccMirrorCategoryIds = new Set(
    allCats.filter((c) => c.linked_account_id).map((c) => c.id)
  )

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

  const [txQuery, balanceTxQuery] =
    onBudgetIds.length > 0
      ? await Promise.all([
          supabase
            .from('transactions')
            .select('category_id, amount, date, type, account_id')
            .eq('user_id', user.id)
            .in('account_id', onBudgetIds)
            .gte('date', dateFrom)
            .lte('date', dateTo),
          // Unbounded lower date — this is the balance snapshot behind
          // computeReadyToAssign, which must include money that entered an
          // on-budget account (e.g. an opening_balance) before the user's
          // earliest budget_months row, or that money is invisible forever.
          // Capped at the same dateTo as the activity query above so a
          // past-month view stays consistent with that month's Disponible.
          //
          // It also feeds computeCcPaymentActivity, for the same reason: a card
          // added with debt already on it must still produce a payment
          // obligation, however far back its opening_balance is dated.
          supabase
            .from('transactions')
            .select('account_id, category_id, amount, type, date')
            .eq('user_id', user.id)
            .in('account_id', onBudgetIds)
            .lte('date', dateTo),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]

  if (txQuery.error) {
    console.error('GET /api/budget/month transactions error', txQuery.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
  if (balanceTxQuery.error) {
    console.error('GET /api/budget/month balance transactions error', balanceTxQuery.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allTx = txQuery.data ?? []

  // Build activity map: month -> catId -> signed sum (for disponible computation)
  const activitiesMap: Record<string, Record<string, number>> = {}

  for (const tx of allTx) {
    const txMonth = tx.date.slice(0, 7) // YYYY-MM
    const amount = Number(tx.amount)

    // Activity for disponible: all transactions within budget months range,
    // excluding CC mirror transactions (their category gets its activity
    // computed synthetically below, from the linked account's real net).
    if (
      txMonth >= earliestMonth &&
      txMonth <= targetMonth &&
      tx.category_id &&
      !ccMirrorCategoryIds.has(tx.category_id)
    ) {
      if (!activitiesMap[txMonth]) activitiesMap[txMonth] = {}
      activitiesMap[txMonth][tx.category_id] =
        (activitiesMap[txMonth][tx.category_id] ?? 0) + amount
    }
  }

  // CC payment tracking: each "Pago · X" category mirrors the negated net
  // change of its linked card's balance, so its Disponible tracks what's owed
  // on that card. Fed from the unbounded balance query rather than allTx —
  // see computeCcPaymentActivity for why every transaction type counts.
  const ccPaymentActivity = computeCcPaymentActivity(
    (balanceTxQuery.data ?? []) as CcTransaction[],
    allCats
      .filter((c) => c.linked_account_id)
      .map((c) => ({ id: c.id, linked_account_id: c.linked_account_id! })),
    sortedMonths,
    ccMirrorCategoryIds
  )
  for (const [month, byCategory] of Object.entries(ccPaymentActivity)) {
    if (!activitiesMap[month]) activitiesMap[month] = {}
    for (const [catId, amount] of Object.entries(byCategory)) {
      activitiesMap[month][catId] = (activitiesMap[month][catId] ?? 0) + amount
    }
  }

  // Compute disponibles for all months
  const allDisponibles = computeDisponibles(
    sortedMonths,
    allocationsMap,
    activitiesMap,
    categoryIds
  )

  const targetDisponibles = allDisponibles[targetMonth] ?? {}

  // Balance snapshot (as of dateTo) for the on-budget universe, and for the
  // primary account alone — the two bases computeReadyToAssign subtracts
  // reservedDisponible from. Cumulative by construction: it reflects every
  // dollar currently in an on-budget account, regardless of which month it
  // arrived in.
  const balanceMap = sumBalancesByAccount(balanceTxQuery.data ?? [], ccMirrorCategoryIds)
  const onBudgetAccounts = accountsRes.data ?? []
  const totalOnBudgetBalance = onBudgetAccounts.reduce(
    (sum, a) =>
      sum + signedAccountBalance({ type: a.type as AccountType, balance: balanceMap[a.id] ?? 0 }),
    0
  )
  const reservedDisponible = sumReservedDisponible(targetDisponibles, categoryIds, ccMirrorCategoryIds)
  // Also the headline of "Disponible para ahorrar/invertir" on /accounts. The
  // two are one quantity — on-budget cash nobody has claimed yet — framed as a
  // chore in /budget and as an opportunity in /accounts; /accounts adds a
  // liquidity line beside it saying how much of it sits in the primary
  // account. It used to compute its own primary-scoped variant, which could
  // not be made correct: see docs/CONVENTIONS.md 2026-08-02.
  const dineroAAsignar = computeReadyToAssign(totalOnBudgetBalance, reservedDisponible)

  // Build response groups
  const targetAllocations = allocationsMap[targetMonth] ?? {}
  const targetActivities = activitiesMap[targetMonth] ?? {}
  // Carried in from last month. Sent explicitly so the UI can explain a
  // Disponible that doesn't equal assigned + activity — an overspend that
  // rolls forward is otherwise an unexplained gap in the row. Empty for the
  // first month of the chain, which has nothing before it.
  const rollovers = allDisponibles[getPrevMonth(targetMonth)] ?? {}

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
      rollover: rollovers[cat.id] ?? 0,
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
