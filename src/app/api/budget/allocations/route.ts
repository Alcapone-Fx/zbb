import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertAllocationSchema } from '@/types/budget'

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

  const parsed = upsertAllocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { category_id, month, assigned_amount } = parsed.data

  // Verify category belongs to user
  const { data: cat, error: catErr } = await supabase
    .from('categories')
    .select('id, is_system')
    .eq('id', category_id)
    .eq('user_id', user.id)
    .single()

  if (catErr || !cat) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
  }

  if (cat.is_system) {
    return NextResponse.json(
      { error: 'Las categorías del sistema no se pueden asignar' },
      { status: 400 }
    )
  }

  // Upsert budget_months for this month
  const { error: bmUpsertErr } = await supabase
    .from('budget_months')
    .upsert({ user_id: user.id, month }, { onConflict: 'user_id,month' })

  if (bmUpsertErr) {
    console.error('POST /api/budget/allocations budget_months upsert error', bmUpsertErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Fetch the budget_month id
  const { data: bm, error: bmErr } = await supabase
    .from('budget_months')
    .select('id')
    .eq('user_id', user.id)
    .eq('month', month)
    .single()

  if (bmErr || !bm) {
    console.error('POST /api/budget/allocations budget_months fetch error', bmErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Upsert the allocation
  const { data: allocation, error: allocErr } = await supabase
    .from('budget_allocations')
    .upsert(
      {
        budget_month_id: bm.id,
        category_id,
        assigned_amount,
      },
      { onConflict: 'budget_month_id,category_id' }
    )
    .select('id, budget_month_id, category_id, assigned_amount')
    .single()

  if (allocErr || !allocation) {
    console.error('POST /api/budget/allocations upsert error', allocErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        id: allocation.id,
        category_id: allocation.category_id,
        assigned_amount: Number(allocation.assigned_amount),
      },
    },
    { status: 200 }
  )
}
