import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCategorySchema } from '@/types/category'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = createCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: group } = await supabase
    .from('category_groups')
    .select('is_system')
    .eq('id', parsed.data.group_id)
    .eq('user_id', user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  if (group.is_system)
    return NextResponse.json(
      { error: 'No puedes agregar categorías al grupo de sistema' },
      { status: 403 }
    )

  const { data: existing } = await supabase
    .from('categories')
    .select('display_order')
    .eq('group_id', parsed.data.group_id)
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      user_id: user.id,
      group_id: parsed.data.group_id,
      name: parsed.data.name,
      display_order: nextOrder,
      is_system: false,
      is_archived: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return NextResponse.json({ data: category }, { status: 201 })
}
