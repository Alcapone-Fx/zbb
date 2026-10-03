'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SinkingFundsHelper } from '@/components/helpers/SinkingFundsHelper'
import { EmergencyFundHelper } from '@/components/helpers/EmergencyFundHelper'

type Tab = 'funds' | 'emergency'

const TABS: { id: Tab; label: string }[] = [
  { id: 'funds', label: 'Fondos y metas' },
  { id: 'emergency', label: 'Emergencia' },
]

interface FundPrefill {
  name: string
  estimatedCost: number | null
  wishlistItemId: string
}

/** Wishlist → fund conversion arrives as query params from Helpers. */
function readPrefill(params: URLSearchParams): FundPrefill | null {
  const wishlistItemId = params.get('wishlist')
  const name = params.get('name')
  if (!wishlistItemId || !name) return null
  const cost = Number(params.get('cost'))
  return {
    name,
    estimatedCost: params.get('cost') && Number.isFinite(cost) ? cost : null,
    wishlistItemId,
  }
}

export function PrevisionesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('funds')
  const [prefill, setPrefill] = useState<FundPrefill | null>(() =>
    readPrefill(new URLSearchParams(searchParams.toString()))
  )

  return (
    <div>
      <div
        className="px-5 pt-14 pb-4"
        style={{ background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)' }}
      >
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Previsiones
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
          Tus metas y gastos anuales viven en cuentas Off-Budget, aparte del día a día
        </p>
        <div className="flex gap-2 mt-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={
                tab === t.id
                  ? { background: 'var(--ab)', color: 'var(--ac)' }
                  : { background: 'var(--bg-card)', color: 'var(--text-sub)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-24">
        {tab === 'funds' && (
          <SinkingFundsHelper
            prefill={prefill}
            onPrefillConsumed={() => {
              setPrefill(null)
              router.replace('/previsiones')
            }}
          />
        )}
        {tab === 'emergency' && <EmergencyFundHelper />}
      </div>
    </div>
  )
}
