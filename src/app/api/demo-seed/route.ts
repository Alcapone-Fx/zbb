import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildCreditCardCategoryName } from '@/lib/zbb/accounts'

/**
 * Demo data seeder — populates a brand-new account with one coherent ZBB month
 * so the concept is legible immediately. An empty budget shows nothing at all:
 * "Dinero a Asignar" is the whole idea, and it needs accounts, income and
 * allocations to exist before it means anything.
 *
 * The numbers below are chosen so the month lands on Dinero a Asignar = $0.00
 * exactly. That identity is what the demo is for, so it is worth stating how it
 * holds (see docs/CONVENTIONS.md and src/lib/zbb/budget.ts):
 *
 *   dineroAAsignar = totalOnBudgetBalance − reservedDisponible
 *
 *   totalOnBudgetBalance = openings + income + Σexpenses
 *   reservedDisponible   = Σ over NON-mirror categories of max(Disponible, 0)
 *                        = Σ(assigned) + Σexpenses      ← every expense is categorized
 *
 * The Σexpenses terms cancel, so the condition reduces to:
 *
 *   Σ(assigned over regular categories) == openings + income
 *   32,200                              == 3,700 + 28,500          ✓
 *
 * Every category is left with a non-negative Disponible, so nothing is dropped
 * by the `d > 0` filter in sumReservedDisponible and the identity is exact.
 *
 * The "Pago · Tarjeta Oro" category sits outside both sides of that equation:
 * mirror categories are excluded from reservedDisponible, and the card's debt
 * is already netted into totalOnBudgetBalance. Nothing is assigned to it, which
 * per computeCcPaymentActivity's documented invariant leaves its Disponible
 * equal to the card's outstanding debt ($7,939) — exactly what should show.
 */

const bodySchema = z.object({
  // The client's local date. The server can't know the user's timezone, and a
  // seed dated into the wrong month lands outside the budget view entirely.
  // Same rationale as the `today` field on POST /api/accounts.
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
    .optional(),
})

const GROUPS = [
  { key: 'esenciales', name: 'Esenciales', ideal_percentage: 50 },
  { key: 'estilo', name: 'Estilo de vida', ideal_percentage: 30 },
  { key: 'ahorro', name: 'Ahorro', ideal_percentage: 20 },
] as const

type GroupKey = (typeof GROUPS)[number]['key']

const CATEGORIES: {
  key: string
  group: GroupKey
  name: string
  assigned: number
}[] = [
  { key: 'renta', group: 'esenciales', name: 'Renta', assigned: 9500 },
  { key: 'super', group: 'esenciales', name: 'Súper', assigned: 4200 },
  { key: 'luz', group: 'esenciales', name: 'Luz y agua', assigned: 800 },
  { key: 'transporte', group: 'esenciales', name: 'Transporte', assigned: 1500 },
  { key: 'restaurantes', group: 'estilo', name: 'Restaurantes', assigned: 1200 },
  { key: 'streaming', group: 'estilo', name: 'Streaming', assigned: 299 },
  { key: 'ropa', group: 'estilo', name: 'Ropa', assigned: 1200 },
  { key: 'emergencia', group: 'ahorro', name: 'Fondo de emergencia', assigned: 8000 },
  { key: 'vacaciones', group: 'ahorro', name: 'Vacaciones', assigned: 5501 },
]

const ACCOUNTS: {
  key: string
  name: string
  type: 'checking' | 'savings' | 'credit_card' | 'cash'
  starting_balance: number
  is_tracking_only: boolean
  is_primary: boolean
  is_emergency_fund: boolean
}[] = [
  {
    key: 'nomina',
    name: 'Cuenta Nómina',
    type: 'checking',
    starting_balance: 5000,
    is_tracking_only: false,
    is_primary: true,
    is_emergency_fund: false,
  },
  {
    key: 'efectivo',
    name: 'Efectivo',
    type: 'cash',
    starting_balance: 3000,
    is_tracking_only: false,
    is_primary: false,
    is_emergency_fund: false,
  },
  {
    key: 'tarjeta',
    name: 'Tarjeta Oro',
    type: 'credit_card',
    starting_balance: -4300,
    is_tracking_only: false,
    is_primary: false,
    is_emergency_fund: false,
  },
  // Off-budget: excluded from totalOnBudgetBalance, so it cannot disturb the
  // $0.00 identity above. Present so the emergency-fund helper has something
  // to show.
  {
    key: 'ahorro_bbva',
    name: 'Ahorro BBVA',
    type: 'savings',
    starting_balance: 18000,
    is_tracking_only: true,
    is_primary: false,
    is_emergency_fund: true,
  },
]

const INCOME = {
  account: 'nomina',
  amount: 28500,
  day: 1,
  payee: 'Nómina',
  memo: 'Sueldo del mes',
}

/** 12 expenses totalling −17,869. Day numbers stay ≤ 24 so every month fits. */
const EXPENSES: {
  account: string
  category: string
  amount: number
  day: number
  payee: string
}[] = [
  { account: 'nomina', category: 'renta', amount: -9500, day: 2, payee: 'Renta departamento' },
  { account: 'tarjeta', category: 'streaming', amount: -299, day: 3, payee: 'Streaming' },
  { account: 'nomina', category: 'super', amount: -1850, day: 5, payee: 'Supermercado' },
  { account: 'efectivo', category: 'transporte', amount: -450, day: 6, payee: 'Gasolina' },
  { account: 'nomina', category: 'luz', amount: -720, day: 8, payee: 'Compañía de luz' },
  { account: 'tarjeta', category: 'restaurantes', amount: -640, day: 9, payee: 'Cena' },
  { account: 'efectivo', category: 'super', amount: -980, day: 12, payee: 'Mercado' },
  { account: 'tarjeta', category: 'transporte', amount: -380, day: 14, payee: 'Taxi' },
  { account: 'tarjeta', category: 'ropa', amount: -1200, day: 16, payee: 'Tienda de ropa' },
  { account: 'tarjeta', category: 'super', amount: -1120, day: 19, payee: 'Supermercado' },
  { account: 'efectivo', category: 'restaurantes', amount: -320, day: 21, payee: 'Comida rápida' },
  { account: 'efectivo', category: 'transporte', amount: -410, day: 24, payee: 'Gasolina' },
]

/** Tables to clear on reset, ordered so no FK is ever left dangling. */
const RESET_TABLES = [
  'reconciliation_records',
  'transactions',
  'scheduled_transactions',
  'budget_months', // ON DELETE CASCADE clears budget_allocations
  'wishlist_items',
  'sinking_funds',
  'sinking_fund_groups',
  'categories',
  'category_groups',
  'accounts',
  'tags',
] as const

function toDate(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown = {}
  if (req.headers.get('content-length') !== '0') {
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido' }, { status: 400 })
    }
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const today = parsed.data.today ?? new Date().toISOString().split('T')[0]
  const month = today.slice(0, 7)

  // Refuse rather than merge: seeding on top of existing data would double the
  // balances and break the $0.00 identity the demo exists to show.
  const [existingAccounts, existingCategories] = await Promise.all([
    supabase.from('accounts').select('id').eq('user_id', user.id).limit(1),
    supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .limit(1),
  ])

  if (existingAccounts.error || existingCategories.error) {
    console.error(
      'POST /api/demo-seed precheck error',
      existingAccounts.error,
      existingCategories.error
    )
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  if ((existingAccounts.data ?? []).length > 0 || (existingCategories.data ?? []).length > 0) {
    return NextResponse.json(
      {
        error:
          'Ya tienes cuentas o categorías. Borra todos tus datos antes de cargar el ejemplo.',
      },
      { status: 409 }
    )
  }

  // ---- Category groups -------------------------------------------------
  const { data: groupRows, error: groupErr } = await supabase
    .from('category_groups')
    .insert(
      GROUPS.map((g, i) => ({
        user_id: user.id,
        name: g.name,
        ideal_percentage: g.ideal_percentage,
        display_order: i,
      }))
    )
    .select('id, name')

  if (groupErr || !groupRows) {
    console.error('POST /api/demo-seed group insert error', groupErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const groupIdByKey = new Map<string, string>()
  for (const g of GROUPS) {
    const row = groupRows.find((r) => r.name === g.name)
    if (row) groupIdByKey.set(g.key, row.id)
  }

  // ---- Categories ------------------------------------------------------
  const { data: catRows, error: catErr } = await supabase
    .from('categories')
    .insert(
      CATEGORIES.map((c, i) => ({
        user_id: user.id,
        group_id: groupIdByKey.get(c.group)!,
        name: c.name,
        display_order: i,
      }))
    )
    .select('id, name')

  if (catErr || !catRows) {
    console.error('POST /api/demo-seed category insert error', catErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const catIdByKey = new Map<string, string>()
  for (const c of CATEGORIES) {
    const row = catRows.find((r) => r.name === c.name)
    if (row) catIdByKey.set(c.key, row.id)
  }

  // ---- Accounts + opening balances -------------------------------------
  const { data: accRows, error: accErr } = await supabase
    .from('accounts')
    .insert(
      ACCOUNTS.map((a) => ({
        user_id: user.id,
        name: a.name,
        type: a.type,
        is_tracking_only: a.is_tracking_only,
        is_primary: a.is_primary,
        is_emergency_fund: a.is_emergency_fund,
        starting_balance: a.starting_balance,
      }))
    )
    .select('id, name')

  if (accErr || !accRows) {
    console.error('POST /api/demo-seed account insert error', accErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const accIdByKey = new Map<string, string>()
  for (const a of ACCOUNTS) {
    const row = accRows.find((r) => r.name === a.name)
    if (row) accIdByKey.set(a.key, row.id)
  }

  // ---- "Pago · Tarjeta Oro" system category ----------------------------
  // Mirrors POST /api/accounts: get-or-create the "Sistema" group rather than
  // assuming handle_new_user() ran, since that depends on a Supabase auth
  // webhook being registered by hand.
  const card = ACCOUNTS.find((a) => a.type === 'credit_card')!
  const cardId = accIdByKey.get(card.key)

  let systemGroupId: string | undefined
  const { data: systemGroup, error: sysErr } = await supabase
    .from('category_groups')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_system', true)
    .limit(1)
    .maybeSingle()

  if (sysErr) {
    console.error('POST /api/demo-seed system group lookup error', sysErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  if (systemGroup) {
    systemGroupId = systemGroup.id
  } else {
    const { data: newGroup, error: newGroupErr } = await supabase
      .from('category_groups')
      .insert({ user_id: user.id, name: 'Sistema', display_order: 9999, is_system: true })
      .select('id')
      .single()
    if (newGroupErr || !newGroup) {
      console.error('POST /api/demo-seed Sistema group create error', newGroupErr)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
    systemGroupId = newGroup.id
  }

  if (cardId) {
    const { error: ccErr } = await supabase.from('categories').insert({
      user_id: user.id,
      group_id: systemGroupId,
      name: buildCreditCardCategoryName(card.name),
      is_system: true,
      display_order: 0,
      linked_account_id: cardId,
    })
    if (ccErr) {
      console.error('POST /api/demo-seed CC category insert error', ccErr)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }

  // ---- Transactions ----------------------------------------------------
  const openingRows = ACCOUNTS.map((a) => ({
    user_id: user.id,
    account_id: accIdByKey.get(a.key)!,
    category_id: null,
    amount: a.starting_balance,
    date: toDate(month, 1),
    type: 'opening_balance' as const,
    memo: 'Saldo inicial',
    is_cleared: true,
  }))

  // Income carries no category — in ZBB it lands in "Dinero a Asignar", and a
  // category would instead credit that envelope's activity.
  const incomeRow = {
    user_id: user.id,
    account_id: accIdByKey.get(INCOME.account)!,
    category_id: null,
    amount: INCOME.amount,
    date: toDate(month, INCOME.day),
    type: 'income' as const,
    payee: INCOME.payee,
    memo: INCOME.memo,
    is_cleared: true,
  }

  const expenseRows = EXPENSES.map((e) => ({
    user_id: user.id,
    account_id: accIdByKey.get(e.account)!,
    category_id: catIdByKey.get(e.category)!,
    amount: e.amount,
    date: toDate(month, e.day),
    type: 'expense' as const,
    payee: e.payee,
    is_cleared: true,
  }))

  const { error: txErr } = await supabase
    .from('transactions')
    .insert([...openingRows, incomeRow, ...expenseRows])

  if (txErr) {
    console.error('POST /api/demo-seed transaction insert error', txErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // ---- Budget month + allocations --------------------------------------
  const { error: bmErr } = await supabase
    .from('budget_months')
    .upsert({ user_id: user.id, month }, { onConflict: 'user_id,month' })

  if (bmErr) {
    console.error('POST /api/demo-seed budget_months upsert error', bmErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const { data: bm, error: bmFetchErr } = await supabase
    .from('budget_months')
    .select('id')
    .eq('user_id', user.id)
    .eq('month', month)
    .single()

  if (bmFetchErr || !bm) {
    console.error('POST /api/demo-seed budget_months fetch error', bmFetchErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const { error: allocErr } = await supabase.from('budget_allocations').upsert(
    CATEGORIES.map((c) => ({
      budget_month_id: bm.id,
      category_id: catIdByKey.get(c.key)!,
      assigned_amount: c.assigned,
    })),
    { onConflict: 'budget_month_id,category_id' }
  )

  if (allocErr) {
    console.error('POST /api/demo-seed allocation insert error', allocErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      data: {
        month,
        groups: GROUPS.length,
        categories: CATEGORIES.length,
        accounts: ACCOUNTS.length,
        transactions: openingRows.length + 1 + expenseRows.length,
      },
    },
    { status: 201 }
  )
}

/**
 * Full reset — deletes every row this user owns across all data tables, not
 * just the seeded ones. There is no column marking a row as demo data, so a
 * surgical delete would have to guess by name and would silently miss or
 * destroy real rows. `user_settings` is deliberately preserved (theme and
 * calculator preferences), with the saved budget template cleared since the
 * category IDs it references are about to disappear.
 */
export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  for (const table of RESET_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', user.id)
    if (error) {
      console.error(`DELETE /api/demo-seed failed clearing ${table}`, error)
      return NextResponse.json(
        { error: `No se pudieron borrar los datos (${table}).` },
        { status: 500 }
      )
    }
  }

  // budget_template references category IDs that no longer exist.
  const { error: settingsErr } = await supabase
    .from('user_settings')
    .update({ budget_template: null })
    .eq('user_id', user.id)

  if (settingsErr) {
    console.error('DELETE /api/demo-seed settings reset error', settingsErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Recreate the "Sistema" group so the account is in the same shape a fresh
  // signup would be, instead of relying on the self-heal in POST /api/accounts.
  const { error: sysErr } = await supabase
    .from('category_groups')
    .insert({ user_id: user.id, name: 'Sistema', display_order: 9999, is_system: true })

  if (sysErr) {
    console.error('DELETE /api/demo-seed Sistema group recreate error', sysErr)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ data: { reset: true } })
}
