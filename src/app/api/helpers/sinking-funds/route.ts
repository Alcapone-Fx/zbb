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
    .select('id, user_id, category_id, name, target_amount, target_date, notes, categories(name)')
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
    category_id: row.category_id,
    category_name: row.categories?.name ?? '',
    name: row.name,
    target_amount: Number(row.target_amount),
    target_date: row.target_date,
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

  const { category_id, name, target_amount, target_date, notes } = parsed.data

  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .eq('user_id', user.id)
    .single()

  if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })

  const { data: fund, error: insertErr } = await supabase
    .from('sinking_funds')
    .insert({ user_id: user.id, category_id, name, target_amount, target_date, notes: notes ?? null })
    .select('id, user_id, category_id, name, target_amount, target_date, notes')
    .single()

  if (insertErr || !fund) {
    console.error('POST /api/helpers/sinking-funds error', insertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        ...fund,
        target_amount: Number(fund.target_amount),
      },
    },
    { status: 201 }
  )
}
