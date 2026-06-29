import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim().slice(0, 100)

  if (!q) return NextResponse.json({ data: [] })

  // Distinct payees matching the partial query
  const { data: payeeRows, error } = await supabase
    .from('transactions')
    .select('payee, category_id')
    .eq('user_id', user.id)
    .ilike('payee', `%${q}%`)
    .not('payee', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('GET /api/transactions/payees error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  // Deduplicate payees; for each, pick the most recent category_id
  const seen = new Map<string, string | null>()
  for (const row of payeeRows ?? []) {
    if (row.payee && !seen.has(row.payee)) {
      seen.set(row.payee, row.category_id ?? null)
    }
  }

  const suggestions = Array.from(seen.entries())
    .slice(0, 10)
    .map(([payee, category_id]) => ({ payee, category_id }))

  return NextResponse.json({ data: suggestions })
}
