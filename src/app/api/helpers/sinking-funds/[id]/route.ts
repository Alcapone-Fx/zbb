import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSinkingFundSchema } from '@/types/helpers'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const parsed = updateSinkingFundSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Block setting is_paid=true via PUT — must use /pay endpoint
  if (parsed.data.is_paid === true) {
    return NextResponse.json(
      { error: 'Use /pay para marcar como pagado' },
      { status: 400 }
    )
  }

  // Validate category ownership if provided
  if (parsed.data.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', parsed.data.category_id)
      .eq('user_id', user.id)
      .single()
    if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  // Validate group ownership if provided
  if (parsed.data.group_id) {
    const { data: grp } = await supabase
      .from('sinking_fund_groups')
      .select('id')
      .eq('id', parsed.data.group_id)
      .eq('user_id', user.id)
      .single()
    if (!grp) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
  }

  const { data: fund, error: updateErr } = await supabase
    .from('sinking_funds')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(
      'id, user_id, group_id, category_id, name, target_amount, target_date, recurrence, recurrence_months, is_paid, last_paid_amount, last_paid_date, notes'
    )
    .single()

  if (updateErr || !fund) {
    if (updateErr?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Fondo no encontrado' }, { status: 404 })
    }
    console.error('PUT /api/helpers/sinking-funds/[id] error', updateErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      ...fund,
      group_id: fund.group_id ?? null,
      category_id: fund.category_id ?? null,
      category_name: null,
      target_amount: Number(fund.target_amount),
      last_paid_amount: fund.last_paid_amount != null ? Number(fund.last_paid_amount) : null,
      last_paid_date: fund.last_paid_date ?? null,
    },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('sinking_funds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /api/helpers/sinking-funds/[id] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
