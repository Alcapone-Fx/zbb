import { Suspense } from 'react'
import { PrevisionesClient } from '@/components/previsiones/PrevisionesClient'

export default function PrevisionesPage() {
  return (
    <Suspense fallback={null}>
      <PrevisionesClient />
    </Suspense>
  )
}
