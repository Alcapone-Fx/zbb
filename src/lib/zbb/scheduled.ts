import type { ScheduledTransactionFrequency } from '@/types/scheduled-transaction'

export function advanceNextDueDate(
  frequency: ScheduledTransactionFrequency,
  current: string  // YYYY-MM-DD
): string {
  // Use noon UTC to stay in the same calendar date regardless of server TZ
  const d = new Date(current + 'T12:00:00Z')
  switch (frequency) {
    case 'daily':
      d.setUTCDate(d.getUTCDate() + 1)
      break
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + 7)
      break
    case 'monthly':
      d.setUTCMonth(d.getUTCMonth() + 1)
      break
    case 'yearly':
      d.setUTCFullYear(d.getUTCFullYear() + 1)
      break
  }
  return d.toISOString().split('T')[0]
}
