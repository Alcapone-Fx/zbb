import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [settingsResult, accountsResult, transactionsResult] = await Promise.all([
    supabase
      .from('user_settings')
      .select('emergency_fund_min_expense')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, starting_balance')
      .eq('user_id', user.id)
      .eq('is_tracking_only', true)
      .eq('is_archived', false)
      .neq('type', 'liability'),
    supabase
      .from('transactions')
      .select('account_id, amount')
      .eq('user_id', user.id),
  ])

  if (accountsResult.error || transactionsResult.error) {
    console.error('GET /api/helpers/emergency-fund error', accountsResult.error, transactionsResult.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const balanceMap: Record<string, number> = {}
  for (const t of transactionsResult.data ?? []) {
    balanceMap[t.account_id] = (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }

  const accounts = (accountsResult.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.starting_balance) + (balanceMap[a.id] ?? 0),
  }))

  const total_balance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const min_expense = settingsResult.data?.emergency_fund_min_expense != null
    ? Number(settingsResult.data.emergency_fund_min_expense)
    : null

  return NextResponse.json({
    data: { total_balance, min_expense, accounts },
  })
}
