import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSinkingFundGroupSchema } from '@/types/helpers'

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

  const parsed = updateSinkingFundGroupSchema.safeParse(body)
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

  // Build update payload (allow explicit null to clear optional FK fields)
  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if ('category_id' in parsed.data) updateData.category_id = parsed.data.category_id ?? null
  if ('source_account_id' in parsed.data) updateData.source_account_id = parsed.data.source_account_id ?? null

  const { data: group, error: updateErr } = await supabase
    .from('sinking_fund_groups')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, user_id, name, category_id, source_account_id, display_order')
    .single()

  if (updateErr || !group) {
    if (updateErr?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
    }
    console.error('PUT /api/helpers/sinking-fund-groups/[id] error', updateErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      ...group,
      category_name: null,
      source_account_name: null,
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

  // Block delete if any sinking_funds still reference this group
  const { data: fundsInGroup } = await supabase
    .from('sinking_funds')
    .select('id')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .limit(1)

  if (fundsInGroup && fundsInGroup.length > 0) {
    return NextResponse.json(
      { error: 'Este grupo tiene metas asociadas. Elimínalas o muévelas primero.' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('sinking_fund_groups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('DELETE /api/helpers/sinking-fund-groups/[id] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
