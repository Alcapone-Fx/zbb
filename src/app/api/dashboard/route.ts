import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dashboardPeriodSchema } from '@/types/dashboard'
import { computePeriodDateRange, computeIdealVsReal } from '@/lib/zbb/dashboard'
import { computeNetWorth, sumBalancesByAccount } from '@/lib/zbb/accounts'
import type { AccountWithBalance } from '@/types/account'
import type { DashboardData, GroupBreakdownRow } from '@/types/dashboard'

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

  // Parallel: accounts (for net worth), transactions (for KPIs), groups
  const [accountsRes, txRes, groupsRes, allGroupsRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, is_emergency_fund, is_archived, starting_balance, created_at')
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

    supabase
      .from('category_groups')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .eq('is_archived', false)
      .order('display_order', { ascending: true }),
  ])

  if (accountsRes.error || txRes.error || groupsRes.error || allGroupsRes.error) {
    console.error('GET /api/dashboard error', accountsRes.error, txRes.error, groupsRes.error, allGroupsRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allAccounts = accountsRes.data ?? []

  // On-budget account IDs (to filter period transactions)
  const onBudgetIds = new Set(
    allAccounts.filter((a) => !a.is_tracking_only).map((a) => a.id)
  )

  // Category IDs referenced by period transactions — only depends on txRes
  // (batch 1), so this lookup can run alongside the net-worth batch below
  // instead of waiting for it.
  const periodTx = (txRes.data ?? []).filter((t) => onBudgetIds.has(t.account_id))
  const categoryIdsInTx = [...new Set(periodTx.filter((t) => t.category_id).map((t) => t.category_id as string))]

  // Net worth — real-time from all account balances (needs full tx history, not just period)
  const [allTxRes, ccCategoriesRes, catGroupRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('account_id, category_id, amount')
      .eq('user_id', user.id),
    supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .not('linked_account_id', 'is', null),
    categoryIdsInTx.length > 0
      ? supabase.from('categories').select('id, group_id').in('id', categoryIdsInTx)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (allTxRes.error) {
    console.error('GET /api/dashboard allTx error', allTxRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allTxForNetWorth = allTxRes.data ?? []
  const ccMirrorCategoryIds = new Set((ccCategoriesRes.data ?? []).map((c) => c.id))
  const balanceMap = sumBalancesByAccount(allTxForNetWorth, ccMirrorCategoryIds)
  const accountsWithBalance: AccountWithBalance[] = allAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountWithBalance['type'],
    is_tracking_only: a.is_tracking_only,
    is_emergency_fund: a.is_emergency_fund,
    is_archived: a.is_archived,
    starting_balance: Number(a.starting_balance),
    created_at: a.created_at,
    balance: balanceMap[a.id] ?? 0,
  }))
  const net_worth = computeNetWorth(accountsWithBalance)

  // KPI aggregations from period transactions on on-budget accounts
  let net_income = 0
  let total_expense = 0
  const groupSpendingMap: Record<string, number> = {} // group_id → spending (positive abs)

  const catGroupMap: Record<string, string> = {}
  for (const c of catGroupRes.data ?? []) {
    catGroupMap[c.id] = c.group_id
  }

  const groupsWithIdeal = groupsRes.data ?? []
  const groupsWithIdealIds = new Set(groupsWithIdeal.map((g) => g.id))
  const allGroupSpendingMap: Record<string, number> = {}

  for (const tx of periodTx) {
    const amount = Number(tx.amount)
    const countsAsIncome =
      tx.type === 'income' ||
      tx.type === 'opening_balance' ||
      (tx.type === 'adjustment' && amount > 0)
    if (countsAsIncome) {
      net_income += amount
    } else if (tx.type === 'expense') {
      total_expense += Math.abs(amount)
      if (tx.category_id) {
        const gid = catGroupMap[tx.category_id]
        if (gid) {
          allGroupSpendingMap[gid] = (allGroupSpendingMap[gid] ?? 0) + Math.abs(amount)
          if (groupsWithIdealIds.has(gid)) {
            groupSpendingMap[gid] = (groupSpendingMap[gid] ?? 0) + Math.abs(amount)
          }
        }
      }
    }
  }

  const savings = net_income - total_expense
  const expense_pct = net_income > 0 ? Math.round((total_expense / net_income) * 10000) / 100 : 0
  const savings_pct = net_income > 0 ? Math.round((savings / net_income) * 10000) / 100 : 0

  const ideal_vs_real = computeIdealVsReal(
    groupsWithIdeal.map((g) => ({
      group_id: g.id,
      group_name: g.name,
      ideal_percentage: Number(g.ideal_percentage),
      spending: groupSpendingMap[g.id] ?? 0,
    })),
    net_income
  )

  const allGroups = allGroupsRes.data ?? []
  const group_breakdown: GroupBreakdownRow[] = allGroups
    .map((g) => ({
      group_id: g.id,
      group_name: g.name,
      amount: allGroupSpendingMap[g.id] ?? 0,
      pct: net_income > 0
        ? Math.round(((allGroupSpendingMap[g.id] ?? 0) / net_income) * 10000) / 100
        : 0,
    }))
    .filter((g) => g.amount > 0)

  const data: DashboardData = {
    period,
    net_income,
    total_expense,
    expense_pct,
    savings,
    savings_pct,
    net_worth,
    group_breakdown,
    ideal_vs_real,
  }

  return NextResponse.json({ data })
}
