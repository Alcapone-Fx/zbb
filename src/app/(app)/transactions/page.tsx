import { Suspense } from 'react'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsClient />
    </Suspense>
  )
}
