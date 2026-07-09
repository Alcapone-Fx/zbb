import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reorderWishlistSchema } from '@/types/helpers'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }
  const parsed = reorderWishlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      supabase
        .from('wishlist_items')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', user.id)
    )
  )

  return new NextResponse(null, { status: 204 })
}
