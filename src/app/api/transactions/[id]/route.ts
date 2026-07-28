import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTransactionSchema } from '@/types/transaction'
import { transferNeedsCategory } from '@/lib/zbb/transactions'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }

  const parsed = updateTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  // Verify ownership and fetch current type/amount
  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, type, amount, account_id, transfer_pair_id, is_reconciled')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  const { date, account_id, amount, category_id, payee, memo, tags, next_month } = parsed.data

  if (date !== undefined) updates.date = date
  // Transfers have a paired leg on another account — moving just one side
  // would desync the pair, so account changes are only applied to non-transfers.
  if (account_id !== undefined && existing.type !== 'transfer') updates.account_id = account_id
  if (category_id !== undefined) {
    let nextCategoryId: string | null = category_id

    // A transfer between two on-budget accounts is budget-neutral and must not
    // carry a category (see transferNeedsCategory). Without this check the edit
    // path silently reintroduces the phantom spending that POST now prevents.
    if (existing.type === 'transfer' && nextCategoryId) {
      let pairAccountId: string | null = null
      if (existing.transfer_pair_id) {
        const { data: pair } = await supabase
          .from('transactions')
          .select('account_id')
          .eq('id', existing.transfer_pair_id)
          .eq('user_id', user.id)
          .maybeSingle()
        pairAccountId = pair?.account_id ?? null
      }

      const accountIds = [existing.account_id, pairAccountId].filter(
        (v): v is string => typeof v === 'string'
      )

      const { data: accs, error: accsErr } = await supabase
        .from('accounts')
        .select('id, is_tracking_only')
        .eq('user_id', user.id)
        .in('id', accountIds)

      if (accsErr) {
        console.error('PATCH /api/transactions/[id] account lookup error', accsErr)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      }

      // Only enforceable when both legs resolve; an orphaned leg can't be judged.
      if (accs && accs.length === 2) {
        const needsCategory = transferNeedsCategory(
          accs[0].is_tracking_only,
          accs[1].is_tracking_only
        )
        if (!needsCategory) {
          const { data: cat } = await supabase
            .from('categories')
            .select('linked_account_id')
            .eq('id', nextCategoryId)
            .eq('user_id', user.id)
            .maybeSingle()

          const isCardPayment =
            !!cat?.linked_account_id && accountIds.includes(cat.linked_account_id)
          if (!isCardPayment) nextCategoryId = null
        }
      }
    }

    updates.category_id = nextCategoryId
  }
  if (payee !== undefined) updates.payee = payee
  if (memo !== undefined) updates.memo = memo
  if (tags !== undefined) updates.tags = tags
  if (next_month !== undefined) updates.next_month = next_month

  // Apply sign when updating amount — preserve original sign convention from type
  if (amount !== undefined) {
    if (existing.type === 'expense') {
      updates.amount = -Math.abs(amount)
    } else if (existing.type === 'income') {
      updates.amount = Math.abs(amount)
    } else if (existing.type === 'transfer') {
      // For transfer, preserve the original sign
      updates.amount =
        Number(existing.amount) < 0 ? -Math.abs(amount) : Math.abs(amount)
    } else {
      updates.amount = amount
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (updateErr || !updated) {
    console.error('PATCH /api/transactions/[id] error', updateErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Sync transfer pair if amount or date changed
  if (existing.transfer_pair_id && (amount !== undefined || date !== undefined)) {
    const pairUpdates: Record<string, unknown> = {}
    if (date !== undefined) pairUpdates.date = date
    if (amount !== undefined) {
      // Pair has the opposite sign
      pairUpdates.amount =
        Number(existing.amount) < 0
          ? Math.abs(amount)   // source was negative → dest is positive
          : -Math.abs(amount)  // source was positive → dest is negative
    }
    const { error: pairErr } = await supabase
      .from('transactions')
      .update(pairUpdates)
      .eq('id', existing.transfer_pair_id)
      .eq('user_id', user.id)

    if (pairErr) {
      console.error('PATCH /api/transactions/[id] pair sync error', pairErr)
    }
  }

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Fetch to verify ownership and find transfer pair
  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, transfer_pair_id, type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
  }

  const pairId = existing.transfer_pair_id

  // Nullify pair links before deletion to avoid FK constraint failures
  if (pairId) {
    await supabase
      .from('transactions')
      .update({ transfer_pair_id: null })
      .eq('id', id)
      .eq('user_id', user.id)

    await supabase
      .from('transactions')
      .update({ transfer_pair_id: null })
      .eq('id', pairId)
      .eq('user_id', user.id)
  }

  const { error: delErr } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (delErr) {
    console.error('DELETE /api/transactions/[id] error', delErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Delete transfer pair leg
  if (pairId) {
    const { error: pairDelErr } = await supabase
      .from('transactions')
      .delete()
      .eq('id', pairId)
      .eq('user_id', user.id)

    if (pairDelErr) {
      console.error('DELETE /api/transactions/[id] pair delete error', pairDelErr)
    }
  }

  return new NextResponse(null, { status: 204 })
}
