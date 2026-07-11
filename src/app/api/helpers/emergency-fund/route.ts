import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sumBalancesByAccount } from '@/lib/zbb/accounts'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [settingsResult, accountsResult, transactionsResult, ccCategoriesResult] = await Promise.all([
    supabase
      .from('user_settings')
      .select('emergency_fund_min_expense')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('accounts')
      .select('id, name, type, is_emergency_fund, starting_balance')
      .eq('user_id', user.id)
      .eq('is_emergency_fund', true)
      .eq('is_archived', false),
    supabase
      .from('transactions')
      .select('account_id, category_id, amount, type')
      .eq('user_id', user.id),
    supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .not('linked_account_id', 'is', null),
  ])

  if (accountsResult.error || transactionsResult.error) {
    console.error('GET /api/helpers/emergency-fund error', accountsResult.error, transactionsResult.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const ccMirrorCategoryIds = new Set((ccCategoriesResult.data ?? []).map((c) => c.id))
  const balanceMap = sumBalancesByAccount(transactionsResult.data ?? [], ccMirrorCategoryIds)

  const accounts = (accountsResult.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    balance: balanceMap[a.id] ?? 0,
  }))

  const total_balance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const min_expense = settingsResult.data?.emergency_fund_min_expense != null
    ? Number(settingsResult.data.emergency_fund_min_expense)
    : null

  return NextResponse.json({
    data: { total_balance, min_expense, accounts },
  })
}
