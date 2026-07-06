import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGroupSchema } from '@/types/category'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: groups, error: groupsError } = await supabase
    .from('category_groups')
    .select('id, name, is_system, is_archived, display_order, ideal_percentage')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (groupsError) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  const { data: categories, error: catsError } = await supabase
    .from('categories')
    .select('id, group_id, name, is_system, is_archived, display_order, linked_account_id')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  if (catsError) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  const result = (groups ?? []).map((group) => ({
    ...group,
    categories: (categories ?? []).filter((c) => c.group_id === group.id),
  }))

  return NextResponse.json({ data: result })
}

export async function POST(request: Request) {
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
  const parsed = createGroupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('category_groups')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0

  const { data: group, error } = await supabase
    .from('category_groups')
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      ideal_percentage: parsed.data.ideal_percentage ?? null,
      display_order: nextOrder,
      is_system: false,
      is_archived: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return NextResponse.json({ data: group }, { status: 201 })
}
