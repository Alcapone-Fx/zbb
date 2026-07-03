import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCreditCardCategoryName, computeNetWorth } from '@/lib/zbb/accounts'
import { createAccountSchema } from '@/types/account'
import type { AccountWithBalance } from '@/types/account'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [accountsResult, transactionsResult] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, is_archived, starting_balance, created_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('account_id, amount')
      .eq('user_id', user.id),
  ])

  if (accountsResult.error || transactionsResult.error) {
    console.error('GET /api/accounts error', accountsResult.error, transactionsResult.error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const balanceMap: Record<string, number> = {}
  for (const t of transactionsResult.data ?? []) {
    balanceMap[t.account_id] =
      (balanceMap[t.account_id] ?? 0) + Number(t.amount)
  }

  const accountsWithBalance: AccountWithBalance[] = (accountsResult.data ?? []).map(
    (a) => ({
      id: a.id,
      name: a.name,
      type: a.type as AccountWithBalance['type'],
      is_tracking_only: a.is_tracking_only,
      is_archived: a.is_archived,
      starting_balance: Number(a.starting_balance),
      created_at: a.created_at,
      balance: balanceMap[a.id] ?? 0,
    })
  )

  const on_budget = accountsWithBalance.filter((a) => !a.is_tracking_only)
  const off_budget = accountsWithBalance.filter((a) => a.is_tracking_only)
  const net_worth = computeNetWorth(accountsWithBalance)

  return NextResponse.json({ on_budget, off_budget, net_worth })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = createAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, type, is_tracking_only, starting_balance } = parsed.data

  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      name,
      type,
      is_tracking_only,
      starting_balance,
    })
    .select()
    .single()

  if (accErr || !account) {
    console.error('POST /api/accounts insert error', accErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  const { error: txErr } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: account.id,
    amount: starting_balance,
    date: today,
    type: 'opening_balance',
    memo: 'Saldo inicial',
  })

  if (txErr) {
    console.error('POST /api/accounts opening_balance tx error', txErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  if (type === 'credit_card') {
    const { data: systemGroup } = await supabase
      .from('category_groups')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_system', true)
      .limit(1)
      .single()

    if (systemGroup) {
      const { error: catErr } = await supabase.from('categories').insert({
        user_id: user.id,
        group_id: systemGroup.id,
        name: buildCreditCardCategoryName(name),
        is_system: true,
        display_order: 0,
        linked_account_id: account.id,
      })
      if (catErr) {
        console.error('POST /api/accounts CC category insert error', catErr)
      }
    } else {
      console.warn(
        'POST /api/accounts: system category_group not found for user',
        user.id
      )
    }
  }

  return NextResponse.json({ data: account }, { status: 201 })
}
