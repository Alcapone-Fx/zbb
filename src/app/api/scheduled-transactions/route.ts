import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyAmountSign } from '@/lib/zbb/transactions'
import {
  createScheduledTransactionSchema,
  type ScheduledTransaction,
} from '@/types/scheduled-transaction'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('scheduled_transactions')
    .select(
      `id, account_id, category_id, amount, payee, memo, frequency,
       start_date, end_date, next_due_date, is_active,
       accounts!inner(name),
       categories(name)`
    )
    .eq('user_id', user.id)
    .order('next_due_date', { ascending: true })

  if (error) {
    console.error('GET /api/scheduled-transactions error', error)
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

  return NextResponse.json({ data: items })
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

  const parsed = createScheduledTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const {
    account_id,
    category_id,
    type,
    amount,
    payee,
    memo,
    frequency,
    start_date,
    end_date,
  } = parsed.data

  // Verify account belongs to user
  const { data: account } = await supabase
    .from('accounts')
    .select('id, is_tracking_only')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  if (!account.is_tracking_only && !category_id) {
    return NextResponse.json(
      { error: 'La categoría es requerida para cuentas en presupuesto' },
      { status: 400 }
    )
  }

  const signedAmount = applyAmountSign(amount, type)

  const { data: created, error: insertErr } = await supabase
    .from('scheduled_transactions')
    .insert({
      user_id: user.id,
      account_id,
      category_id: category_id ?? null,
      amount: signedAmount,
      payee: payee ?? null,
      memo: memo ?? null,
      frequency,
      start_date,
      end_date: end_date ?? null,
      next_due_date: start_date,
      is_active: true,
    })
    .select()
    .single()

  if (insertErr || !created) {
    console.error('POST /api/scheduled-transactions error', insertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: created }, { status: 201 })
}
