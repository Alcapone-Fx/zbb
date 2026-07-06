import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ccMirrorAmount } from '@/lib/zbb/transactions'
import { buildCreditCardCategoryName } from '@/lib/zbb/accounts'
import { advanceNextDueDate } from '@/lib/zbb/scheduled'
import { confirmScheduledTransactionSchema } from '@/types/scheduled-transaction'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine — all fields optional
  }

  const parsed = confirmScheduledTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { amount: overrideAmount, date: overrideDate, today: clientToday } = parsed.data

  // Fetch scheduled transaction
  const { data: scheduled } = await supabase
    .from('scheduled_transactions')
    .select('*, accounts!inner(name, type, is_tracking_only)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!scheduled) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (!scheduled.is_active) {
    return NextResponse.json({ error: 'La transacción programada no está activa' }, { status: 400 })
  }

  // Prefer the client's local date — the server can't know the user's timezone.
  const today = clientToday ?? new Date().toISOString().split('T')[0]
  const txDate = overrideDate ?? today

  // Determine signed amount (use override if provided, keeping original sign/type)
  const originalAmount = Number(scheduled.amount)
  const isExpense = originalAmount < 0
  let signedAmount: number
  if (overrideAmount !== undefined) {
    signedAmount = isExpense ? -Math.abs(overrideAmount) : Math.abs(overrideAmount)
  } else {
    signedAmount = originalAmount
  }

  const txType = isExpense ? 'expense' : 'income'

  // Insert the transaction
  const { data: transaction, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: scheduled.account_id,
      category_id: scheduled.category_id ?? null,
      amount: signedAmount,
      date: txDate,
      type: txType,
      payee: scheduled.payee ?? null,
      memo: scheduled.memo ?? null,
      tags: [],
      next_month: false,
      scheduled_transaction_id: scheduled.id,
    })
    .select()
    .single()

  if (txErr || !transaction) {
    console.error('POST confirm: insert transaction error', txErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // CC mirror for expense on credit card
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = scheduled.accounts as any
  let mirror = null
  if (txType === 'expense' && account?.type === 'credit_card') {
    const ccCategoryName = buildCreditCardCategoryName(account.name)
    const { data: ccCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_system', true)
      .eq('name', ccCategoryName)
      .single()

    if (ccCategory) {
      const { data: mirrorTx, error: mirrorErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: scheduled.account_id,
          category_id: ccCategory.id,
          amount: ccMirrorAmount(signedAmount),
          date: txDate,
          type: 'adjustment',
          memo: `Pago tarjeta (automático) — ${scheduled.payee || 'gasto'}`,
          tags: [],
          next_month: false,
        })
        .select()
        .single()

      if (mirrorErr) {
        console.error('POST confirm: CC mirror error', mirrorErr)
      } else {
        mirror = mirrorTx
      }
    }
  }

  // Advance next_due_date
  const nextDue = advanceNextDueDate(scheduled.frequency, scheduled.next_due_date)
  const isExpired = scheduled.end_date && nextDue > scheduled.end_date

  const { error: advanceErr } = await supabase
    .from('scheduled_transactions')
    .update({
      next_due_date: nextDue,
      is_active: isExpired ? false : true,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (advanceErr) {
    console.error('POST confirm: advance next_due_date error', advanceErr)
  }

  return NextResponse.json(
    { data: { transaction, ...(mirror ? { mirror } : {}) } },
    { status: 201 }
  )
}
