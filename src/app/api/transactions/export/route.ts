import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transactionFiltersSchema } from '@/types/transaction'

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const rawFilters = Object.fromEntries(url.searchParams.entries())
  const parsed = transactionFiltersSchema.safeParse(rawFilters)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { date_from, date_to, type, category_id, account_id, tag } = parsed.data

  const now = new Date()
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const defaultTo = now.toISOString().split('T')[0]

  let query = supabase
    .from('transactions')
    .select(
      `date, type, amount, payee, memo, tags,
       accounts!inner(name),
       categories(name, category_groups(name))`
    )
    .eq('user_id', user.id)
    .gte('date', date_from ?? defaultFrom)
    .lte('date', date_to ?? defaultTo)
    .order('date', { ascending: false })
    .limit(10000)

  if (type) query = query.eq('type', type)
  if (category_id) query = query.eq('category_id', category_id)
  if (account_id) query = query.eq('account_id', account_id)
  if (tag) query = query.contains('tags', [tag])

  const { data, error } = await query

  if (error) {
    console.error('GET /api/transactions/export error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  const header = 'Fecha,Tipo,Cuenta,Categoría,Grupo,Monto,Beneficiario,Memo,Etiquetas\n'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((row: any) => {
    const cols = [
      row.date,
      row.type,
      csvEscape(row.accounts?.name ?? ''),
      csvEscape(row.categories?.name ?? ''),
      csvEscape(row.categories?.category_groups?.name ?? ''),
      Number(row.amount).toFixed(2),
      csvEscape(row.payee ?? ''),
      csvEscape(row.memo ?? ''),
      csvEscape((row.tags ?? []).join('; ')),
    ]
    return cols.join(',')
  })

  const csv = header + rows.join('\n')
  const filename = `movimientos_${date_from ?? defaultFrom}_${date_to ?? defaultTo}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function csvEscape(value: string): string {
  // Neutralize spreadsheet formula injection prefixes
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
