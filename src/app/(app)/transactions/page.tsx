import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'
import type { TransactionWithDetails } from '@/types/transaction'
import type { AccountWithBalance } from '@/types/account'
import type { CategoryGroupWithCategories } from '@/types/category'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const dateTo = now.toISOString().split('T')[0]

  const [txResult, accountsResult, groupsResult, categoriesResult] = await Promise.all([
    supabase
      .from('transactions')
      .select(
        `id, account_id, category_id, amount, date, type, payee, memo, tags,
         is_cleared, is_reconciled, transfer_pair_id, next_month, created_at,
         accounts!inner(name),
         categories(name, category_groups(name))`
      )
      .eq('user_id', user.id)
      .gte('date', dateFrom)
      .lte('date', dateTo)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('accounts')
      .select('id, name, type, is_tracking_only, is_archived, starting_balance, created_at')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: true }),

    supabase
      .from('category_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),

    supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('display_order', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialTransactions: TransactionWithDetails[] = (txResult.data ?? []).map((row: any) => ({
    id: row.id,
    account_id: row.account_id,
    account_name: row.accounts?.name ?? '',
    category_id: row.category_id,
    category_name: row.categories?.name ?? null,
    category_group_name: row.categories?.category_groups?.name ?? null,
    amount: Number(row.amount),
    date: row.date,
    type: row.type,
    payee: row.payee,
    memo: row.memo,
    tags: row.tags ?? [],
    is_cleared: row.is_cleared,
    is_reconciled: row.is_reconciled,
    transfer_pair_id: row.transfer_pair_id,
    next_month: row.next_month,
    created_at: row.created_at,
  }))

  const rawGroups = groupsResult.data ?? []
  const rawCats = categoriesResult.data ?? []
  const initialGroups: CategoryGroupWithCategories[] = rawGroups.map((g) => ({
    ...g,
    categories: rawCats.filter((c) => c.group_id === g.id),
  }))

  const allAccounts = accountsResult.data ?? []
  const initialAccounts: AccountWithBalance[] = allAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type as AccountWithBalance['type'],
    is_tracking_only: a.is_tracking_only,
    is_archived: a.is_archived,
    starting_balance: Number(a.starting_balance),
    created_at: a.created_at,
    balance: 0,
  }))

  return (
    <TransactionsClient
      initialTransactions={initialTransactions}
      initialAccounts={initialAccounts}
      initialGroups={initialGroups}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
    />
  )
}
