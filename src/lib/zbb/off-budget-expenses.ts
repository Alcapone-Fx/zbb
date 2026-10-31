import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * An expense paid from an Off-Budget account (e.g. a savings account) that the
 * user filed under a budget category. The budget only reads On-Budget
 * accounts, so without this such an expense never reduces the envelope it
 * pays for — the bill stays "available" even though it was paid.
 *
 * Counting it lowers that category's Disponible and leaves the On-Budget
 * balance alone, so "Dinero a Asignar" rises by the same amount: the envelope
 * no longer needs the money, and it never left the On-Budget account.
 */
export interface OffBudgetExpense {
  account_id: string
  category_id: string
  amount: number
  date: string
  type: 'expense'
}

/**
 * Categories whose spending must NOT be pulled into the day-to-day budget:
 *   - Previsiones (sinking funds / groups): paying a fund is an expense from
 *     its Off-Budget account and "never touches the month" — the money was
 *     already contributed out of the budget (CONVENTIONS 2026-10-03).
 *   - Credit-card "Pago · X" categories: their activity is derived from the
 *     card's own balance (computeCcPaymentActivity), never from raw rows.
 */
export async function fetchExcludedOffBudgetCategoryIds(
  supabase: Supabase,
  userId: string
): Promise<Set<string>> {
  const [groupsRes, fundsRes, cardCatsRes] = await Promise.all([
    supabase.from('sinking_fund_groups').select('category_id').eq('user_id', userId),
    supabase.from('sinking_funds').select('category_id').eq('user_id', userId),
    supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .not('linked_account_id', 'is', null),
  ])

  // Fail loudly: silently treating a failed lookup as "nothing excluded" would
  // count every fund payment against the budget.
  const failed = groupsRes.error ?? fundsRes.error ?? cardCatsRes.error
  if (failed) throw failed

  const ids = new Set<string>()
  for (const r of groupsRes.data ?? []) if (r.category_id) ids.add(r.category_id)
  for (const r of fundsRes.data ?? []) if (r.category_id) ids.add(r.category_id)
  for (const r of cardCatsRes.data ?? []) ids.add(r.id)
  return ids
}

/**
 * Categorized expenses from non-archived Off-Budget accounts in [dateFrom,
 * dateTo], minus the excluded categories above. Pass `categoryId` to scope to
 * a single category (used by the per-category trend view).
 */
export async function fetchBudgetedOffBudgetExpenses(
  supabase: Supabase,
  userId: string,
  opts: { dateFrom: string; dateTo: string; categoryId?: string }
): Promise<OffBudgetExpense[]> {
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_tracking_only', true)
    .eq('is_archived', false)
  if (accErr) throw accErr

  const accountIds = (accounts ?? []).map((a) => a.id)
  if (accountIds.length === 0) return []

  let query = supabase
    .from('transactions')
    .select('account_id, category_id, amount, date')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .not('category_id', 'is', null)
    .in('account_id', accountIds)
    .gte('date', opts.dateFrom)
    .lte('date', opts.dateTo)
  if (opts.categoryId) query = query.eq('category_id', opts.categoryId)

  const [{ data, error }, excluded] = await Promise.all([
    query,
    fetchExcludedOffBudgetCategoryIds(supabase, userId),
  ])
  if (error) throw error

  return (data ?? [])
    .filter((t) => t.category_id && !excluded.has(t.category_id))
    .map((t) => ({
      account_id: t.account_id,
      category_id: t.category_id as string,
      amount: Number(t.amount),
      date: t.date,
      type: 'expense' as const,
    }))
}
