import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateGroupSchema } from '@/types/category'

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

  const { data: group } = await supabase
    .from('category_groups')
    .select('is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (group.is_system)
    return NextResponse.json({ error: 'Cannot modify system group' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
  }
  const parsed = updateGroupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Same guard as archiving a single category (see
  // src/app/api/categories/[id]/route.ts), summed across every non-system
  // category in the group — archiving the group cascades to archive all of
  // them below, and each one's Disponible collapses to Σ(assigned ever) +
  // Σ(activity ever).
  if (parsed.data.is_archived === true) {
    const { data: groupCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .eq('is_system', false)

    const groupCategoryIds = (groupCategories ?? []).map((c) => c.id)
    if (groupCategoryIds.length > 0) {
      const [{ data: allocs }, { data: txs }] = await Promise.all([
        supabase.from('budget_allocations').select('assigned_amount').in('category_id', groupCategoryIds),
        supabase.from('transactions').select('amount').in('category_id', groupCategoryIds).eq('user_id', user.id),
      ])
      const disponible =
        (allocs ?? []).reduce((s, a) => s + Number(a.assigned_amount), 0) +
        (txs ?? []).reduce((s, t) => s + Number(t.amount), 0)
      if (Math.abs(disponible) > 0.01) {
        return NextResponse.json(
          {
            error: `No puedes archivar un grupo con Disponible distinto de cero en sus categorías (actual: ${disponible.toFixed(2)})`,
          },
          { status: 400 }
        )
      }
    }
  }

  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.ideal_percentage !== undefined)
    updates.ideal_percentage = parsed.data.ideal_percentage
  if (parsed.data.is_archived !== undefined) updates.is_archived = parsed.data.is_archived

  const { data: updated, error } = await supabase
    .from('category_groups')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  // When archiving a group, also archive all its non-system categories
  if (parsed.data.is_archived === true) {
    await supabase
      .from('categories')
      .update({ is_archived: true })
      .eq('group_id', id)
      .eq('user_id', user.id)
      .eq('is_system', false)
  }

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

  const { data: group } = await supabase
    .from('category_groups')
    .select('is_system')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (group.is_system)
    return NextResponse.json({ error: 'Cannot delete system group' }, { status: 403 })

  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)

  if (categories && categories.length > 0) {
    const categoryIds = categories.map((c) => c.id)
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('category_id', categoryIds)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'No puedes eliminar un grupo con historial de transacciones. Archívalo en su lugar.' },
        { status: 409 }
      )
    }
  }

  const { error } = await supabase
    .from('category_groups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: 'Internal error' }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
