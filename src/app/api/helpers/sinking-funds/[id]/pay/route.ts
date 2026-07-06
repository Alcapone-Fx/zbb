import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paySchema } from '@/types/helpers'
import { advanceMonths } from '@/lib/zbb/helpers-calc'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = paySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { amount, date, record_transaction } = parsed.data

  // Fetch the sinking fund (must belong to this user)
  const { data: fund, error: fundErr } = await supabase
    .from('sinking_funds')
    .select('id, user_id, group_id, name, target_date, recurrence, recurrence_months, category_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fundErr || !fund) {
    return NextResponse.json({ error: 'Fondo no encontrado' }, { status: 404 })
  }

  // If fund belongs to a group, get group for source_account + category
  let groupCategoryId: string | null = null
  let groupSourceAccountId: string | null = null

  if (fund.group_id) {
    const { data: grp } = await supabase
      .from('sinking_fund_groups')
      .select('category_id, source_account_id')
      .eq('id', fund.group_id)
      .eq('user_id', user.id)
      .single()

    if (grp) {
      groupCategoryId = grp.category_id ?? null
      groupSourceAccountId = grp.source_account_id ?? null
    }
  }

  // Create expense transaction if both source account and category are available —
  // skipped when record_transaction is false (user already recorded the real
  // expense elsewhere, e.g. paid with a credit card instead of the linked account).
  const effectiveCategoryId = groupCategoryId ?? fund.category_id ?? null
  if (record_transaction && groupSourceAccountId && effectiveCategoryId) {
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: user.id,
      account_id: groupSourceAccountId,
      category_id: effectiveCategoryId,
      amount: -amount, // negative = expense (money leaves account)
      date,
      type: 'expense',
      memo: `Pago: ${fund.name}`,
    })

    if (txErr) {
      console.error('POST /api/helpers/sinking-funds/[id]/pay transaction insert error', txErr)
      return NextResponse.json({ error: 'Error al registrar transacción' }, { status: 500 })
    }
  }

  // Advance target_date for annual funds — recurrence_months defaults to 12
  // so existing annual funds (created before this field existed) are unaffected.
  const newTargetDate =
    fund.recurrence === 'annual'
      ? advanceMonths(fund.target_date, fund.recurrence_months ?? 12)
      : fund.target_date

  // Update the sinking fund
  const { data: updated, error: updateErr } = await supabase
    .from('sinking_funds')
    .update({
      is_paid: true,
      last_paid_amount: amount,
      last_paid_date: date,
      target_date: newTargetDate,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select(
      'id, user_id, group_id, category_id, name, target_amount, target_date, recurrence, recurrence_months, is_paid, last_paid_amount, last_paid_date, notes'
    )
    .single()

  if (updateErr || !updated) {
    console.error('POST /api/helpers/sinking-funds/[id]/pay update error', updateErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      ...updated,
      group_id: updated.group_id ?? null,
      category_id: updated.category_id ?? null,
      category_name: null,
      target_amount: Number(updated.target_amount),
      last_paid_amount: updated.last_paid_amount != null ? Number(updated.last_paid_amount) : null,
      last_paid_date: updated.last_paid_date ?? null,
    },
  })
}
