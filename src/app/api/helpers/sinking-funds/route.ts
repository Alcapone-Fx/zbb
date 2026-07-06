import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSinkingFundSchema } from '@/types/helpers'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sinking_funds')
    .select(
      'id, user_id, group_id, category_id, name, target_amount, target_date, recurrence, recurrence_months, is_paid, last_paid_amount, last_paid_date, notes, categories!category_id(name)'
    )
    .eq('user_id', user.id)
    .order('target_date', { ascending: true })

  if (error) {
    console.error('GET /api/helpers/sinking-funds error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funds = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    group_id: row.group_id ?? null,
    category_id: row.category_id ?? null,
    category_name: row.categories?.name ?? null,
    name: row.name,
    target_amount: Number(row.target_amount),
    target_date: row.target_date,
    recurrence: row.recurrence as 'one_time' | 'annual',
    recurrence_months: row.recurrence_months ?? null,
    is_paid: row.is_paid ?? false,
    last_paid_amount: row.last_paid_amount != null ? Number(row.last_paid_amount) : null,
    last_paid_date: row.last_paid_date ?? null,
    notes: row.notes ?? null,
  }))

  return NextResponse.json({ data: funds })
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

  const parsed = createSinkingFundSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { group_id, category_id, name, target_amount, target_date, recurrence, recurrence_months, notes } = parsed.data

  // Validate category ownership if provided
  if (category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('user_id', user.id)
      .single()
    if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  // Validate group ownership if provided
  if (group_id) {
    const { data: grp } = await supabase
      .from('sinking_fund_groups')
      .select('id')
      .eq('id', group_id)
      .eq('user_id', user.id)
      .single()
    if (!grp) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
  }

  const { data: fund, error: insertErr } = await supabase
    .from('sinking_funds')
    .insert({
      user_id: user.id,
      group_id: group_id ?? null,
      category_id: category_id ?? null,
      name,
      target_amount,
      target_date,
      recurrence: recurrence ?? 'one_time',
      recurrence_months: recurrence_months ?? null,
      notes: notes ?? null,
    })
    .select(
      'id, user_id, group_id, category_id, name, target_amount, target_date, recurrence, recurrence_months, is_paid, last_paid_amount, last_paid_date, notes'
    )
    .single()

  if (insertErr || !fund) {
    console.error('POST /api/helpers/sinking-funds error', insertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        ...fund,
        group_id: fund.group_id ?? null,
        category_id: fund.category_id ?? null,
        category_name: null,
        target_amount: Number(fund.target_amount),
        last_paid_amount: fund.last_paid_amount != null ? Number(fund.last_paid_amount) : null,
        last_paid_date: fund.last_paid_date ?? null,
      },
    },
    { status: 201 }
  )
}
