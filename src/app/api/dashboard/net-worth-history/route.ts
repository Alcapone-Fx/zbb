import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeNetWorth } from '@/lib/zbb/accounts'
import type { AccountWithBalance } from '@/types/account'

export interface NetWorthPoint {
  month: string   // YYYY-MM
  label: string   // "Ene 26"
  net_worth: number
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)
  return d.toISOString().split('T')[0]
}

function buildMonths(count: number): Array<{ ym: string; lastDay: string; label: string }> {
  const now = new Date()
  const result = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const ym = `${y}-${String(m).padStart(2, '0')}`
    const label = `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`
    result.push({ ym, lastDay: lastDayOfMonth(y, m), label })
  }
  return result
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const months = buildMonths(12)
  const cutoff = months[months.length - 1].lastDay

  const [accountsRes, txRes, ccCategoriesRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, is_emergency_fund, is_primary, is_archived, starting_balance, created_at')
      .eq('user_id', user.id)
      .eq('is_archived', false),

    supabase
      .from('transactions')
      .select('account_id, category_id, amount, date')
      .eq('user_id', user.id)
      .lte('date', cutoff),

    supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .not('linked_account_id', 'is', null),
  ])

  if (accountsRes.error || txRes.error) {
    console.error('GET /api/dashboard/net-worth-history error', accountsRes.error, txRes.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const allAccounts = accountsRes.data ?? []
  const allTx = txRes.data ?? []
  const ccMirrorCategoryIds = new Set((ccCategoriesRes.data ?? []).map((c) => c.id))

  const points: NetWorthPoint[] = months.map(({ ym, lastDay, label }) => {
    const balanceMap: Record<string, number> = {}
    for (const tx of allTx) {
      if (tx.category_id && ccMirrorCategoryIds.has(tx.category_id)) continue
      if (tx.date <= lastDay) {
        balanceMap[tx.account_id] = (balanceMap[tx.account_id] ?? 0) + Number(tx.amount)
      }
    }

    const accountsWithBalance: AccountWithBalance[] = allAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type as AccountWithBalance['type'],
      is_tracking_only: a.is_tracking_only,
      is_emergency_fund: a.is_emergency_fund,
      is_primary: a.is_primary,
      is_archived: a.is_archived,
      starting_balance: Number(a.starting_balance),
      created_at: a.created_at,
      balance: balanceMap[a.id] ?? 0,
    }))

    return { month: ym, label, net_worth: computeNetWorth(accountsWithBalance) }
  })

  return NextResponse.json({ data: points })
}
