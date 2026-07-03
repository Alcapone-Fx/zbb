import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSinkingFundGroupSchema } from '@/types/helpers'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('sinking_fund_groups')
    .select(
      'id, user_id, name, category_id, source_account_id, display_order, categories!category_id(name), accounts!source_account_id(name)'
    )
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('GET /api/helpers/sinking-fund-groups error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groups = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    category_id: row.category_id ?? null,
    category_name: row.categories?.name ?? null,
    source_account_id: row.source_account_id ?? null,
    source_account_name: row.accounts?.name ?? null,
    display_order: row.display_order,
  }))

  return NextResponse.json({ data: groups })
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

  const parsed = createSinkingFundGroupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
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

  // Validate account ownership if provided
  if (parsed.data.source_account_id) {
    const { data: acc } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.source_account_id)
      .eq('user_id', user.id)
      .single()
    if (!acc) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
  }

  // Compute next display_order
  const { data: maxRow } = await supabase
    .from('sinking_fund_groups')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const display_order = (maxRow?.display_order ?? -1) + 1

  const { data: group, error: insertErr } = await supabase
    .from('sinking_fund_groups')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      category_id: parsed.data.category_id ?? null,
      source_account_id: parsed.data.source_account_id ?? null,
      display_order,
    })
    .select('id, user_id, name, category_id, source_account_id, display_order')
    .single()

  if (insertErr || !group) {
    console.error('POST /api/helpers/sinking-fund-groups error', insertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        ...group,
        category_name: null,
        source_account_name: null,
      },
    },
    { status: 201 }
  )
}
