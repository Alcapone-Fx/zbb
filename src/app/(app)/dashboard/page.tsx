'use client'

import { DashboardClient } from '@/components/dashboard/DashboardClient'

// This is intentionally a thin client component — not async.
// The original async Server Component + loading.tsx created a streaming Suspense
// boundary whose $RS reconciler raced with React hydration, causing:
//   "Cannot read properties of null (reading 'parentNode')"
// Converting to a synchronous client component eliminates streaming entirely.
// DashboardClient self-fetches via /api/dashboard on mount.
export default function DashboardPage() {
  return <DashboardClient />
}
