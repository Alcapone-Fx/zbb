import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ScheduledTransaction } from '@/types/scheduled-transaction'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prefer the client's local date — the server can't know the user's timezone.
  const clientToday = new URL(req.url).searchParams.get('today')
  const today =
    clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday)
      ? clientToday
      : new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('scheduled_transactions')
    .select(
      `id, account_id, category_id, amount, payee, memo, frequency,
       start_date, end_date, next_due_date, is_active,
       accounts!inner(name),
       categories(name)`
    )
    .eq('user_id', user.id)
    .eq('is_active', true)
    .lte('next_due_date', today)
    .order('next_due_date', { ascending: true })

  if (error) {
    console.error('GET /api/scheduled-transactions/pending error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: ScheduledTransaction[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: user.id,
    account_id: row.account_id,
    account_name: row.accounts?.name ?? '',
    category_id: row.category_id,
    category_name: row.categories?.name ?? null,
    amount: Number(row.amount),
    payee: row.payee,
    memo: row.memo,
    frequency: row.frequency,
    start_date: row.start_date,
    end_date: row.end_date,
    next_due_date: row.next_due_date,
    is_active: row.is_active,
  }))

  return NextResponse.json({ data: items, count: items.length })
}
