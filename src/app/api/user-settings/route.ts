import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateUserSettingsSchema } from '@/types/helpers'

const SELECT_FIELDS =
  'emergency_fund_min_expense, grocery_category_id, recurring_budget_category_id, recurring_budget_pattern'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: settings, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' })
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    console.error('GET /api/user-settings error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      emergency_fund_min_expense:
        settings.emergency_fund_min_expense != null
          ? Number(settings.emergency_fund_min_expense)
          : null,
      grocery_category_id: settings.grocery_category_id,
      recurring_budget_category_id: settings.recurring_budget_category_id,
      recurring_budget_pattern: settings.recurring_budget_pattern,
    },
  })
}

export async function PATCH(req: Request) {
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

  const parsed = updateUserSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { data: settings, error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: user.id, ...parsed.data },
      { onConflict: 'user_id' }
    )
    .select(SELECT_FIELDS)
    .single()

  if (error) {
    console.error('PATCH /api/user-settings error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      emergency_fund_min_expense:
        settings.emergency_fund_min_expense != null
          ? Number(settings.emergency_fund_min_expense)
          : null,
      grocery_category_id: settings.grocery_category_id,
      recurring_budget_category_id: settings.recurring_budget_category_id,
      recurring_budget_pattern: settings.recurring_budget_pattern,
    },
  })
}
