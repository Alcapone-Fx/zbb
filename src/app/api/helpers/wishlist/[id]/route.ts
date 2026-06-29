import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateWishlistItemSchema } from '@/types/helpers'

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

  const parsed = updateWishlistItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: item, error: updateErr } = await supabase
    .from('wishlist_items')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, name, estimated_cost, priority, notes, created_at')
    .single()

  if (updateErr || !item) {
    if (updateErr?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 })
    }
    console.error('PUT /api/helpers/wishlist/[id] error', updateErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      ...item,
      estimated_cost: item.estimated_cost != null ? Number(item.estimated_cost) : null,
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
    .from('wishlist_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /api/helpers/wishlist/[id] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
