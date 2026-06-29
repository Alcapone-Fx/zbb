import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const querySchema = z.object({
  account_id: z.string().uuid('Cuenta inválida'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { account_id, date } = parsed.data

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('user_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })

  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('account_id', account_id)
    .eq('user_id', user.id)
    .lte('date', date)

  if (error) {
    console.error('GET /api/reconciliation/balance error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const app_balance =
    Math.round((data ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0) * 100) / 100

  return NextResponse.json({ app_balance })
}
