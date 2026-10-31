import { describe, it, expect } from 'vitest'
import {
  fetchBudgetedOffBudgetExpenses,
  fetchExcludedOffBudgetCategoryIds,
} from '../off-budget-expenses'

type Row = Record<string, unknown>

/** Minimal chainable stand-in for the Supabase query builder. */
function fakeSupabase(tables: Record<string, Row[]>, errors: Record<string, unknown> = {}) {
  const calls: { table: string; filters: Array<[string, unknown]> }[] = []
  const client = {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> }
      calls.push(call)
      const builder: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'not', 'in', 'gte', 'lte']) {
        builder[m] = (...args: unknown[]) => {
          call.filters.push([m, args])
          return builder
        }
      }
      builder.then = (resolve: (v: unknown) => void) =>
        resolve({ data: tables[table] ?? [], error: errors[table] ?? null })
      return builder
    },
  }
  return { client: client as never, calls }
}

describe('fetchExcludedOffBudgetCategoryIds', () => {
  it('collects sinking-fund group, fund and credit-card categories', async () => {
    const { client } = fakeSupabase({
      sinking_fund_groups: [{ category_id: 'g1' }, { category_id: null }],
      sinking_funds: [{ category_id: 'f1' }],
      categories: [{ id: 'cc1' }],
    })
    const ids = await fetchExcludedOffBudgetCategoryIds(client, 'u')
    expect([...ids].sort()).toEqual(['cc1', 'f1', 'g1'])
  })

  it('throws instead of silently excluding nothing when a lookup fails', async () => {
    const { client } = fakeSupabase({}, { sinking_funds: new Error('boom') })
    await expect(fetchExcludedOffBudgetCategoryIds(client, 'u')).rejects.toThrow('boom')
  })
})

describe('fetchBudgetedOffBudgetExpenses', () => {
  const range = { dateFrom: '2026-10-01', dateTo: '2026-10-31' }

  it('returns categorized expenses and drops Previsiones / card-payment categories', async () => {
    const { client } = fakeSupabase({
      accounts: [{ id: 'savings' }],
      transactions: [
        { account_id: 'savings', category_id: 'caess', amount: '-60.9', date: '2026-10-28' },
        { account_id: 'savings', category_id: 'fund-cat', amount: -100, date: '2026-10-10' },
        { account_id: 'savings', category_id: 'cc-cat', amount: -5, date: '2026-10-11' },
      ],
      sinking_fund_groups: [{ category_id: 'fund-cat' }],
      sinking_funds: [],
      categories: [{ id: 'cc-cat' }],
    })
    const rows = await fetchBudgetedOffBudgetExpenses(client, 'u', range)
    expect(rows).toEqual([
      { account_id: 'savings', category_id: 'caess', amount: -60.9, date: '2026-10-28', type: 'expense' },
    ])
  })

  it('returns [] without querying transactions when there are no off-budget accounts', async () => {
    const { client, calls } = fakeSupabase({ accounts: [] })
    expect(await fetchBudgetedOffBudgetExpenses(client, 'u', range)).toEqual([])
    expect(calls.some((c) => c.table === 'transactions')).toBe(false)
  })

  it('queries only off-budget, non-archived accounts and expense rows', async () => {
    const { client, calls } = fakeSupabase({ accounts: [{ id: 'a' }], transactions: [] })
    await fetchBudgetedOffBudgetExpenses(client, 'u', { ...range, categoryId: 'c' })
    const acc = calls.find((c) => c.table === 'accounts')!.filters.map((f) => JSON.stringify(f))
    expect(acc).toContain(JSON.stringify(['eq', ['is_tracking_only', true]]))
    expect(acc).toContain(JSON.stringify(['eq', ['is_archived', false]]))
    const tx = calls.find((c) => c.table === 'transactions')!.filters.map((f) => JSON.stringify(f))
    expect(tx).toContain(JSON.stringify(['eq', ['type', 'expense']]))
    expect(tx).toContain(JSON.stringify(['eq', ['category_id', 'c']]))
  })
})
