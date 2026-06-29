import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { monthSchema } from '@/types/budget'

const applySchema = z.object({ month: monthSchema })

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

  const parsed = applySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { month } = parsed.data

  // Fetch the saved template
  const { data: settings, error: settingsErr } = await supabase
    .from('user_settings')
    .select('budget_template')
    .eq('user_id', user.id)
    .single()

  if (settingsErr) {
    console.error('POST /api/budget/template/apply settings fetch error', settingsErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const template = settings?.budget_template as Record<string, number> | null
  if (!template || Object.keys(template).length === 0) {
    return NextResponse.json({ error: 'No hay plantilla guardada' }, { status: 400 })
  }

  // Ensure budget_months exists for this month
  const { error: bmUpsertErr } = await supabase
    .from('budget_months')
    .upsert({ user_id: user.id, month }, { onConflict: 'user_id,month' })

  if (bmUpsertErr) {
    console.error('POST /api/budget/template/apply budget_months upsert error', bmUpsertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const { data: bm, error: bmErr } = await supabase
    .from('budget_months')
    .select('id')
    .eq('user_id', user.id)
    .eq('month', month)
    .single()

  if (bmErr || !bm) {
    console.error('POST /api/budget/template/apply budget_months fetch error', bmErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Verify all template category IDs belong to the user (security)
  const templateCategoryIds = Object.keys(template)
  const { data: ownedCats, error: catCheckErr } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_system', false)
    .in('id', templateCategoryIds)

  if (catCheckErr) {
    console.error('POST /api/budget/template/apply cat check error', catCheckErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const validCatIds = new Set((ownedCats ?? []).map((c) => c.id))

  const allocations = templateCategoryIds
    .filter((catId) => validCatIds.has(catId))
    .map((catId) => ({
      budget_month_id: bm.id,
      category_id: catId,
      assigned_amount: template[catId],
    }))

  if (allocations.length === 0) {
    return NextResponse.json({ error: 'No hay categorías válidas en la plantilla' }, { status: 400 })
  }

  const { error: upsertErr } = await supabase
    .from('budget_allocations')
    .upsert(allocations, { onConflict: 'budget_month_id,category_id' })

  if (upsertErr) {
    console.error('POST /api/budget/template/apply upsert error', upsertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: { applied: allocations.length } })
}
