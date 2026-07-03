import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateAccountSchema } from '@/types/account'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const parsed = updateAccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { id } = await params

  if (parsed.data.action === 'rename') {
    const { error } = await supabase
      .from('accounts')
      .update({ name: parsed.data.name })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('PATCH /api/accounts/[id] rename error', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  }

  if (parsed.data.action === 'archive') {
    const { data: txs, error: txErr } = await supabase
      .from('transactions')
      .select('amount')
      .eq('account_id', id)
      .eq('user_id', user.id)

    if (txErr) {
      console.error('PATCH /api/accounts/[id] balance check error', txErr)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    const balance = (txs ?? []).reduce((sum, t) => sum + Number(t.amount), 0)
    if (Math.abs(balance) > 0.001) {
      return NextResponse.json(
        {
          error: `No puedes archivar una cuenta con saldo distinto de cero (saldo actual: ${balance.toFixed(2)})`,
        },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('accounts')
      .update({ is_archived: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('PATCH /api/accounts/[id] archive error', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  }

  if (parsed.data.action === 'set_budget_type') {
    const { error } = await supabase
      .from('accounts')
      .update({ is_tracking_only: parsed.data.is_tracking_only })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('PATCH /api/accounts/[id] set_budget_type error', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  }

  if (parsed.data.action === 'set_emergency_fund') {
    const { error } = await supabase
      .from('accounts')
      .update({ is_emergency_fund: parsed.data.is_emergency_fund })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('PATCH /api/accounts/[id] set_emergency_fund error', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}
