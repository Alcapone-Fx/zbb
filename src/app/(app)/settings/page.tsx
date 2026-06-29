import Link from 'next/link'
import { ChevronRight, Tag, Target } from 'lucide-react'

export default function SettingsPage() {
  return (
    <>
      <div
        className="px-5 pt-14 pb-5"
        style={{
          background: 'linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)',
        }}
      >
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: 'var(--text-main)' }}
        >
          Configuración
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-sub)' }}>
          Categorías y metas de presupuesto
        </p>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-3 mt-2">
        <Link
          href="/categories"
          className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors hover:bg-white/5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-accent-muted)' }}
          >
            <Tag size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              Categorías y grupos
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
              Gestiona y reordena tus grupos de presupuesto
            </p>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
        </Link>

        <Link
          href="/settings/goals"
          className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors hover:bg-white/5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-card)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--color-accent-muted)' }}
          >
            <Target size={18} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
              Metas de Presupuesto
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
              Define el % ideal de ingresos por grupo
            </p>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
        </Link>
      </div>
    </>
  )
}
