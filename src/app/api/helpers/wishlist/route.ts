import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWishlistItemSchema } from '@/types/helpers'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('id, user_id, name, estimated_cost, priority, notes, created_at, converted_to_fund_id, display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('GET /api/helpers/wishlist error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const items = (data ?? []).map((row) => ({
    ...row,
    estimated_cost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
  }))

  return NextResponse.json({ data: items })
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

  const parsed = createWishlistItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { name, estimated_cost, priority, notes } = parsed.data

  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0

  const { data: item, error: insertErr } = await supabase
    .from('wishlist_items')
    .insert({
      user_id: user.id,
      name,
      estimated_cost: estimated_cost ?? null,
      priority: priority ?? null,
      notes: notes ?? null,
      display_order: nextOrder,
    })
    .select('id, user_id, name, estimated_cost, priority, notes, created_at, converted_to_fund_id, display_order')
    .single()

  if (insertErr || !item) {
    console.error('POST /api/helpers/wishlist error', insertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        ...item,
        estimated_cost: item.estimated_cost != null ? Number(item.estimated_cost) : null,
      },
    },
    { status: 201 }
  )
}
