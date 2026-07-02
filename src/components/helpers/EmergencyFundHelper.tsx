'use client'

import { useState, useEffect } from 'react'
import { emergencyFundTier } from '@/lib/zbb/helpers-calc'
import type { EmergencyFundData } from '@/types/helpers'

const TIER_LABELS = ['Crítico', '1–3 meses', '3–6 meses', '6+ meses']
const TIER_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  'light-green': '#84cc16',
  green: '#22c55e',
}
const TIER_BG: Record<string, string> = {
  red: 'rgba(239,68,68,0.15)',
  yellow: 'rgba(234,179,8,0.15)',
  'light-green': 'rgba(132,204,22,0.15)',
  green: 'rgba(34,197,94,0.15)',
}

export function EmergencyFundHelper() {
  const [data, setData] = useState<EmergencyFundData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [promptMinExpense, setPromptMinExpense] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/helpers/emergency-fund')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) setError(json.error)
        else setData(json.data)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Error de conexión'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [refreshKey])

  function load() {
    setLoading(true)
    setError(null)
    setRefreshKey((k) => k + 1)
  }

  async function handleSaveMinExpense() {
    const value = parseFloat(promptMinExpense)
    if (!value || value <= 0) return
    setSavingExpense(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/user-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergency_fund_min_expense: value }),
      })
      if (res.ok) {
        load()
        setPromptMinExpense('')
      } else {
        const json = await res.json().catch(() => ({}))
        setSaveError(json.error ?? 'Error al guardar')
      }
    } catch {
      setSaveError('Error de conexión')
    } finally {
      setSavingExpense(false)
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: 'var(--text-sub)' }}>
        Cargando…
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={load}
          className="mt-3 text-sm underline"
          style={{ color: 'var(--ac)' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  // Prompt for min_expense if not set
  if (data.min_expense === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
          Para calcular tus niveles de emergencia, necesitamos saber cuánto son tus gastos mínimos mensuales.
        </p>
        <div className="space-y-1">
          <label className="block text-sm font-medium" style={{ color: 'var(--text-main)' }}>
            Gasto mensual mínimo
          </label>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-sub)' }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={promptMinExpense}
              onChange={(e) => setPromptMinExpense(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                color: 'var(--text-main)',
              }}
            />
          </div>
        </div>
        <button
          onClick={handleSaveMinExpense}
          disabled={savingExpense || !promptMinExpense}
          className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
          style={{ background: 'var(--ac)', color: '#fff' }}
        >
          {savingExpense ? 'Guardando…' : 'Guardar y continuar'}
        </button>
        {saveError && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-negative)' }}>
            {saveError}
          </p>
        )}
      </div>
    )
  }

  const tierInfo = emergencyFundTier(data.total_balance, data.min_expense)
  const tierLabel = TIER_LABELS[tierInfo.tier]
  const tierColor = TIER_COLORS[tierInfo.color]
  const tierBg = TIER_BG[tierInfo.color]
  const TIER_TARGETS = [1, 3, 6, 12]
  const progressPct = Math.min(100, (tierInfo.coveredMonths / 12) * 100)

  return (
    <div className="space-y-5">
      {/* Balance summary */}
      <div
        className="rounded-xl p-4"
        style={{ background: tierBg }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium" style={{ color: tierColor }}>
              {tierLabel}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
              ${data.total_balance.toLocaleString('es', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-sub)' }}>
              {tierInfo.coveredMonths.toFixed(1)} meses cubiertos
            </p>
          </div>
          <span className="text-3xl">🛡️</span>
        </div>

        {/* Progress bar with 4 tier markers */}
        <div className="mt-4 space-y-1">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: tierColor }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-sub)' }}>
            {TIER_TARGETS.map((t) => (
              <span key={t}>{t}m</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="space-y-2">
        {TIER_TARGETS.map((months, i) => {
          const target = data.min_expense! * months
          const reached = data.total_balance >= target
          const colors = ['red', 'yellow', 'light-green', 'green']
          const c = TIER_COLORS[colors[i]]
          return (
            <div
              key={months}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'var(--bg-card)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: reached ? c : 'var(--border)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-main)' }}>
                  {months} {months === 1 ? 'mes' : 'meses'}
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: reached ? c : 'var(--text-sub)' }}>
                ${target.toLocaleString('es', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )
        })}
      </div>

      {/* Accounts */}
      {data.accounts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-sub)' }}>
            Cuentas incluidas
          </p>
          {data.accounts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'var(--bg-card)' }}
            >
              <span className="text-sm" style={{ color: 'var(--text-main)' }}>{a.name}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                ${a.balance.toLocaleString('es', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Edit min expense */}
      <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
          Gasto mínimo mensual: ${data.min_expense.toLocaleString('es', { minimumFractionDigits: 2 })}
          <button
            onClick={() => setPromptMinExpense(String(data.min_expense))}
            className="ml-2 underline"
            style={{ color: 'var(--ac)' }}
          >
            Editar
          </button>
        </p>
        {promptMinExpense !== '' && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={promptMinExpense}
                onChange={(e) => setPromptMinExpense(e.target.value)}
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-main)',
                }}
              />
              <button
                onClick={handleSaveMinExpense}
                disabled={savingExpense}
                className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--ac)', color: '#fff' }}
              >
                {savingExpense ? '…' : 'Guardar'}
              </button>
            </div>
            {saveError && (
              <p className="text-xs" style={{ color: 'var(--color-negative)' }}>
                {saveError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
