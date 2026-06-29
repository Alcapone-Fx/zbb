import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyAmountSign } from '@/lib/zbb/transactions'
import { updateScheduledTransactionSchema } from '@/types/scheduled-transaction'

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

  const parsed = updateScheduledTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('scheduled_transactions')
    .select('id, amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const { type, amount, ...rest } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = { ...rest }

  if (amount !== undefined) {
    const effectiveType =
      type ?? (existing.amount < 0 ? 'expense' : 'income')
    updates.amount = applyAmountSign(amount, effectiveType)
  } else if (type !== undefined) {
    // Type changed without amount change — re-sign existing absolute value
    updates.amount = applyAmountSign(Math.abs(existing.amount), type)
  }

  const { data: updated, error: patchErr } = await supabase
    .from('scheduled_transactions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (patchErr || !updated) {
    console.error('PATCH /api/scheduled-transactions/[id] error', patchErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
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

  const { error } = await supabase
    .from('scheduled_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /api/scheduled-transactions/[id] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
