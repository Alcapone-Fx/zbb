import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reorderCategoriesSchema } from '@/types/category'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = reorderCategoriesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  await Promise.all(
    parsed.data.ids.map((id, index) =>
      supabase
        .from('categories')
        .update({ display_order: index })
        .eq('id', id)
        .eq('group_id', parsed.data.group_id)
        .eq('user_id', user.id)
    )
  )

  return new NextResponse(null, { status: 204 })
}
