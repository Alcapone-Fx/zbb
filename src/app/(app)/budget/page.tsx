'use client'

import { BudgetClient } from '@/components/budget/BudgetClient'

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Thin client component — not async.
// The original async Server Component awaited 5+ sequential Supabase round-trips
// before the page could render at all (~3 s). Converting to a synchronous client
// component lets the page shell render immediately (loading.tsx handles the skeleton),
// while BudgetClient self-fetches via /api/budget/month on mount.
export default function BudgetPage() {
  return <BudgetClient initialMonth={currentMonth()} />
}
