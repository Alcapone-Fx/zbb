import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dashboardPeriodSchema } from '@/types/dashboard'
import { computePeriodDateRange, computeIdealVsReal } from '@/lib/zbb/dashboard'
import { computeNetWorth } from '@/lib/zbb/accounts'
import type { AccountWithBalance } from '@/types/account'
import type { DashboardData } from '@/types/dashboard'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const periodParam = url.searchParams.get('period') ?? 'current_month'
  const parsed = dashboardPeriodSchema.safeParse(periodParam)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Período inválido' }, { status: 400 })
  }
  const period = parsed.data
  const { from, to } = computePeriodDateRange(period)

  // Parallel: accounts (for net worth), transactions (for KPIs), groups (for ideal%)
  const [accountsRes, txRes, groupsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, is_archived, starting_balance, created_at')
      .eq('user_id', user.id)
      .eq('is_archived', false),

    supabase
      .from('transactions')
      .select('account_id, category_id, amount, type')
      .eq('user_id', user.id)
      .gte('date', from)
      .lte('date', to),

    supabase
      .from('category_groups')
      .select('id, name, ideal_percentage')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .eq('is_archived', false)
      .not('ideal_percentage', 'is', null),
  ])

  if (accountsRes.error || txRes.error || groupsRes.error) {
    console.error('GET /api/dashboard error', accountsRes.error, txRes.error, groupsRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Net worth — real-time from all account balances (needs full tx history, not just period)
  const allTxRes = await supabase
    .from('transactions')
    .select('account_id, amount')
    .eq('user_id', user.id)

  if (allTxRes.error) {
    console.error('GET /api/dashboard allTx error', allTxRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allAccounts = accountsRes.data ?? []
  const allTxForNetWorth = allTxRes.data ?? []
  const balanceMap: Record<string, number> = {}
  for (const t of allTxForNetWorth) {
    balanceMap[t.account_id] = (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }
  const accountsWithBalance: AccountWithBalance[] = allAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountWithBalance['type'],
    is_tracking_only: a.is_tracking_only,
    is_archived: a.is_archived,
    starting_balance: Number(a.starting_balance),
    created_at: a.created_at,
    balance: balanceMap[a.id] ?? 0,
  }))
  const net_worth = computeNetWorth(accountsWithBalance)

  // On-budget account IDs (to filter period transactions)
  const onBudgetIds = new Set(
    allAccounts.filter((a) => !a.is_tracking_only).map((a) => a.id)
  )

  // KPI aggregations from period transactions on on-budget accounts
  let net_income = 0
  let total_expense = 0
  const groupSpendingMap: Record<string, number> = {} // group_id → spending (positive abs)

  // Need category→group mapping for group spending
  // Fetch categories with group_id for the period transactions that have a category_id
  const periodTx = (txRes.data ?? []).filter((t) => onBudgetIds.has(t.account_id))
  const categoryIdsInTx = [...new Set(periodTx.filter((t) => t.category_id).map((t) => t.category_id as string))]

  const catGroupMap: Record<string, string> = {}
  if (categoryIdsInTx.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, group_id')
      .in('id', categoryIdsInTx)
    for (const c of cats ?? []) {
      catGroupMap[c.id] = c.group_id
    }
  }

  const groupsWithIdeal = groupsRes.data ?? []
  const groupsWithIdealIds = new Set(groupsWithIdeal.map((g) => g.id))

  for (const tx of periodTx) {
    const amount = Number(tx.amount)
    if (tx.type === 'income') {
      net_income += amount
    } else if (tx.type === 'expense') {
      total_expense += Math.abs(amount)
      // Track spending per group (only groups with ideal_percentage set)
      if (tx.category_id) {
        const gid = catGroupMap[tx.category_id]
        if (gid && groupsWithIdealIds.has(gid)) {
          groupSpendingMap[gid] = (groupSpendingMap[gid] ?? 0) + Math.abs(amount)
        }
      }
    }
  }

  const savings = net_income - total_expense
  const expense_pct = net_income > 0 ? Math.round((total_expense / net_income) * 10000) / 100 : null
  const savings_pct = net_income > 0 ? Math.round((savings / net_income) * 10000) / 100 : null

  const ideal_vs_real = computeIdealVsReal(
    groupsWithIdeal.map((g) => ({
      group_id: g.id,
      group_name: g.name,
      ideal_percentage: Number(g.ideal_percentage),
      spending: groupSpendingMap[g.id] ?? 0,
    })),
    net_income
  )

  const data: DashboardData = {
    period,
    net_income,
    total_expense,
    expense_pct,
    savings,
    savings_pct,
    net_worth,
    ideal_vs_real,
  }

  return NextResponse.json({ data })
}
