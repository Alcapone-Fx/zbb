import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCategorySchema } from '@/types/category'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: category } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (category.is_system)
    return NextResponse.json({ error: 'Cannot modify system category' }, { status: 403 })

  const body = await request.json()
  const parsed = updateCategorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.group_id !== undefined) updates.group_id = parsed.data.group_id
  if (parsed.data.is_archived !== undefined) updates.is_archived = parsed.data.is_archived

  const { data: updated, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: category } = await supabase
    .from('categories')
    .select('is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!category) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (category.is_system)
    return NextResponse.json({ error: 'Cannot delete system category' }, { status: 403 })

  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      {
        error:
          'No puedes eliminar una categoría con historial de transacciones. Archívala en su lugar.',
      },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
