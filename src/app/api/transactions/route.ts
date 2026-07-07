import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createTransactionSchema,
  transactionFiltersSchema,
} from '@/types/transaction'
import type { TransactionWithDetails } from '@/types/transaction'
import {
  applyAmountSign,
  transferLegAmounts,
  ccMirrorAmount,
} from '@/lib/zbb/transactions'
import { buildCreditCardCategoryName } from '@/lib/zbb/accounts'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const rawFilters = Object.fromEntries(url.searchParams.entries())
  const parsed = transactionFiltersSchema.safeParse(rawFilters)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { date_from, date_to, type, category_id, account_id, tag } = parsed.data

  // Default: current month
  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = now.toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select(
      `id, account_id, category_id, amount, date, type, payee, memo, tags,
       is_cleared, is_reconciled, transfer_pair_id, next_month, created_at,
       accounts!inner(name),
       categories(name, category_groups(name))`
    )
    .eq('user_id', user.id)
    .gte('date', date_from ?? defaultFrom)
    .lte('date', date_to ?? defaultTo)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000)

  if (type) query = query.eq('type', type)
  if (category_id) query = query.eq('category_id', category_id)
  if (account_id) query = query.eq('account_id', account_id)
  if (tag) query = query.contains('tags', [tag])

  const { data, error } = await query

  if (error) {
    console.error('GET /api/transactions error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: TransactionWithDetails[] = (data ?? []).map((row: any) => ({
    id: row.id,
    account_id: row.account_id,
    account_name: row.accounts?.name ?? '',
    category_id: row.category_id,
    category_name: row.categories?.name ?? null,
    category_group_name: row.categories?.category_groups?.name ?? null,
    amount: Number(row.amount),
    date: row.date,
    type: row.type,
    payee: row.payee,
    memo: row.memo,
    tags: row.tags ?? [],
    is_cleared: row.is_cleared,
    is_reconciled: row.is_reconciled,
    transfer_pair_id: row.transfer_pair_id,
    next_month: row.next_month,
    created_at: row.created_at,
  }))

  return NextResponse.json({ data: transactions })
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

  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const {
    date,
    type,
    account_id,
    amount,
    category_id,
    payee,
    memo,
    tags,
    next_month,
    transfer_to_account_id,
  } = parsed.data

  // Fetch source account
  const { data: account, error: accErr } = await supabase
    .from('accounts')
    .select('id, name, type, is_tracking_only')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (accErr || !account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  // Enforce category requirement for expenses on on-budget accounts only.
  // Income is deliberately exempt — uncategorized income is exactly what
  // increases "Dinero a Asignar" (Ready to Assign) for later allocation.
  if (type === 'expense' && !account.is_tracking_only && !category_id) {
    return NextResponse.json(
      { error: 'La categoría es requerida para cuentas en presupuesto' },
      { status: 400 }
    )
  }

  // --- TRANSFER ---
  if (type === 'transfer') {
    if (!transfer_to_account_id) {
      return NextResponse.json(
        { error: 'La cuenta de destino es requerida para transferencias' },
        { status: 400 }
      )
    }
    if (transfer_to_account_id === account_id) {
      return NextResponse.json(
        { error: 'Las cuentas de origen y destino deben ser diferentes' },
        { status: 400 }
      )
    }

    const { data: destAccount } = await supabase
      .from('accounts')
      .select('id, is_tracking_only')
      .eq('id', transfer_to_account_id)
      .eq('user_id', user.id)
      .single()

    if (!destAccount) {
      return NextResponse.json({ error: 'Cuenta de destino no encontrada' }, { status: 404 })
    }

    const eitherOnBudget = !account.is_tracking_only || !destAccount.is_tracking_only
    if (eitherOnBudget && !category_id) {
      return NextResponse.json(
        { error: 'La categoría es requerida cuando una cuenta está en presupuesto' },
        { status: 400 }
      )
    }

    const { sourceLegAmount, destLegAmount } = transferLegAmounts(amount)

    // Insert leg 1 (source) without pair_id yet
    const { data: leg1, error: leg1Err } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id,
        category_id: category_id ?? null,
        amount: sourceLegAmount,
        date,
        type: 'transfer',
        payee: payee ?? null,
        memo: memo ?? null,
        tags: tags ?? [],
        next_month: false,
      })
      .select()
      .single()

    if (leg1Err || !leg1) {
      console.error('POST /api/transactions transfer leg1 error', leg1Err)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    // Insert leg 2 (destination) with pair_id = leg1.id
    const { data: leg2, error: leg2Err } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        account_id: transfer_to_account_id,
        category_id: null,
        amount: destLegAmount,
        date,
        type: 'transfer',
        payee: payee ?? null,
        memo: memo ?? null,
        tags: tags ?? [],
        next_month: false,
        transfer_pair_id: leg1.id,
      })
      .select()
      .single()

    if (leg2Err || !leg2) {
      console.error('POST /api/transactions transfer leg2 error', leg2Err)
      // Orphaned leg1 — clean up best-effort
      await supabase.from('transactions').delete().eq('id', leg1.id).eq('user_id', user.id)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    // Update leg1 to reference leg2
    const { error: updateErr } = await supabase
      .from('transactions')
      .update({ transfer_pair_id: leg2.id })
      .eq('id', leg1.id)

    if (updateErr) {
      console.error('POST /api/transactions transfer pair link error', updateErr)
    }

    return NextResponse.json({ data: { transaction: leg1, transfer_pair: leg2 } }, { status: 201 })
  }

  // --- EXPENSE / INCOME ---
  const signedAmount = applyAmountSign(amount, type)

  const { data: transaction, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id,
      category_id: category_id ?? null,
      amount: signedAmount,
      date,
      type,
      payee: payee ?? null,
      memo: memo ?? null,
      tags: tags ?? [],
      next_month: type === 'income' ? next_month : false,
    })
    .select()
    .single()

  if (txErr || !transaction) {
    console.error('POST /api/transactions insert error', txErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // --- CC mirror (expense on credit_card account) ---
  let mirror = null
  if (type === 'expense' && account.type === 'credit_card') {
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
          account_id,
          category_id: ccCategory.id,
          amount: ccMirrorAmount(signedAmount),
          date,
          type: 'adjustment',
          memo: `Pago tarjeta (automático) — ${payee || 'gasto'}`,
          tags: [],
          next_month: false,
        })
        .select()
        .single()

      if (mirrorErr) {
        console.error('POST /api/transactions CC mirror error', mirrorErr)
      } else {
        mirror = mirrorTx
      }
    } else {
      console.warn(
        'POST /api/transactions: CC system category not found for account',
        account.name
      )
    }
  }

  return NextResponse.json(
    { data: { transaction, ...(mirror ? { mirror } : {}) } },
    { status: 201 }
  )
}
