import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createReconciliationSchema } from '@/types/reconciliation'
import { calcAdjustmentAmount } from '@/lib/zbb/reconciliation'

const listQuerySchema = z.object({
  account_id: z.string().uuid('Cuenta inválida'),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reconciliation_records')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_id', parsed.data.account_id)
    .order('date', { ascending: false })

  if (error) {
    console.error('GET /api/reconciliation error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
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

  const parsed = createReconciliationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { account_id, date, bank_balance, category_id } = parsed.data

  const { data: account } = await supabase
    .from('accounts')
    .select('id, is_tracking_only')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  // Compute app_balance = sum of all transactions up to date
  const { data: txData, error: txErr } = await supabase
    .from('transactions')
    .select('amount')
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .lte('date', date)

  if (txErr) {
    console.error('POST /api/reconciliation balance query error', txErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const app_balance =
    Math.round((txData ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0) * 100) / 100

  const adjustment_amount = calcAdjustmentAmount(bank_balance, app_balance)

  // Create adjustment transaction when there's a discrepancy
  let adjustment_transaction_id: string | null = null
  if (adjustment_amount !== 0) {
    if (!account.is_tracking_only && !category_id) {
      return NextResponse.json(
        { error: 'La categoría es requerida para cuentas en presupuesto' },
        { status: 400 }
      )
    }

    const { data: adjTx, error: adjErr } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id,
        category_id: category_id ?? null,
        amount: adjustment_amount,
        date,
        type: 'adjustment',
        payee: null,
        memo: 'Ajuste de conciliación',
        tags: [],
        next_month: false,
      })
      .select('id')
      .single()

    if (adjErr || !adjTx) {
      console.error('POST /api/reconciliation adjustment tx error', adjErr)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    adjustment_transaction_id = adjTx.id
  }

  // Mark all transactions up to date as reconciled
  const { error: reconcileErr } = await supabase
    .from('transactions')
    .update({ is_reconciled: true })
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .lte('date', date)

  if (reconcileErr) {
    console.error('POST /api/reconciliation mark reconciled error', reconcileErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const { data: record, error: recErr } = await supabase
    .from('reconciliation_records')
    .insert({
      user_id: user.id,
      account_id,
      date,
      bank_balance,
      app_balance,
      adjustment_amount,
      adjustment_transaction_id,
    })
    .select()
    .single()

  if (recErr || !record) {
    console.error('POST /api/reconciliation record insert error', recErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: { record } }, { status: 201 })
}
