'use client'

import { useState } from 'react'
import { GroceryCalculator } from './GroceryCalculator'
import { WeekendPlanner } from './WeekendPlanner'
import { SinkingFundsHelper } from './SinkingFundsHelper'
import { EmergencyFundHelper } from './EmergencyFundHelper'
import { WishlistHelper } from './WishlistHelper'

type HelperView =
  | 'hub'
  | 'grocery'
  | 'weekend'
  | 'sinking-funds'
  | 'emergency-fund'
  | 'wishlist'

interface HelperCard {
  id: HelperView
  emoji: string
  title: string
  description: string
}

const HELPERS: HelperCard[] = [
  {
    id: 'grocery',
    emoji: '🛒',
    title: 'Calculadora de Supermercado',
    description: 'Tasa diaria × días del mes',
  },
  {
    id: 'weekend',
    emoji: '🎉',
    title: 'Planificador de Fin de Semana',
    description: 'Divide el ocio entre tus fines de semana',
  },
  {
    id: 'sinking-funds',
    emoji: '🏦',
    title: 'Fondos de Ahorro',
    description: 'Calcula la aportación mensual para tus metas',
  },
  {
    id: 'emergency-fund',
    emoji: '🛡️',
    title: 'Fondo de Emergencia',
    description: 'Visualiza tus meses cubiertos por tiers',
  },
  {
    id: 'wishlist',
    emoji: '✨',
    title: 'Lista de Deseos',
    description: 'Lo que quieres comprar algún día',
  },
]

const HELPER_TITLES: Record<HelperView, string> = {
  hub: 'Helpers',
  grocery: 'Supermercado',
  weekend: 'Fin de Semana',
  'sinking-funds': 'Fondos de Ahorro',
  'emergency-fund': 'Fondo de Emergencia',
  wishlist: 'Lista de Deseos',
}

export function HelpersClient() {
  const [view, setView] = useState<HelperView>('hub')

  if (view !== 'hub') {
    return (
      <div>
        {/* Sub-header */}
        <div
          className="px-5 pt-14 pb-4"
          style={{
            background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
          }}
        >
          <button
            onClick={() => setView('hub')}
            className="flex items-center gap-1.5 text-sm mb-3"
            style={{ color: 'var(--text-sub)' }}
          >
            <span>←</span>
            <span>Helpers</span>
          </button>
          <h1
            className="text-[22px] font-extrabold tracking-[-0.5px]"
            style={{ color: 'var(--text-main)' }}
          >
            {HELPER_TITLES[view]}
          </h1>
        </div>

        <div className="px-5 pb-24">
          {view === 'grocery' && <GroceryCalculator />}
          {view === 'weekend' && <WeekendPlanner />}
          {view === 'sinking-funds' && <SinkingFundsHelper />}
          {view === 'emergency-fund' && <EmergencyFundHelper />}
          {view === 'wishlist' && <WishlistHelper />}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-6"
        style={{
          background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
        }}
      >
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Helpers
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
          Herramientas de microplanificación
        </p>
      </div>

      {/* Cards */}
      <div className="px-5 pb-24 space-y-3 mt-2">
        {HELPERS.map((h) => (
          <button
            key={h.id}
            onClick={() => setView(h.id)}
            className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition active:scale-[0.98]"
            style={{ background: 'var(--bg-card)' }}
          >
            <span className="text-3xl shrink-0">{h.emoji}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                {h.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
                {h.description}
              </p>
            </div>
            <span className="ml-auto" style={{ color: 'var(--text-sub)' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
