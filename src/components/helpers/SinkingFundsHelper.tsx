'use client'

import { useState, useEffect } from 'react'
import { sinkingFundCalc, monthsRemaining } from '@/lib/zbb/helpers-calc'
import type { SinkingFund } from '@/types/helpers'
import type { BudgetMonthData } from '@/types/budget'

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface Category {
  id: string
  name: string
  group_name: string
}

interface FormState {
  category_id: string
  name: string
  target_amount: string
  target_date: string
  notes: string
}

const EMPTY_FORM: FormState = {
  category_id: '',
  name: '',
  target_amount: '',
  target_date: '',
  notes: '',
}

export function SinkingFundsHelper() {
  const [funds, setFunds] = useState<SinkingFund[]>([])
  const [budgetData, setBudgetData] = useState<BudgetMonthData | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [asignarState, setAsignarState] = useState<Record<string, { saving: boolean; msg: string | null }>>({})

  const month = currentMonthStr()

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/helpers/sinking-funds').then((r) => r.json()),
      fetch(`/api/budget/month?month=${month}`, { method: 'POST' })
        .then(() => fetch(`/api/budget/month?month=${month}`))
        .then((r) => r.json()),
      fetch('/api/categories/groups').then((r) => r.json()),
    ])
      .then(([fundsJson, budgetJson, catsJson]) => {
        if (cancelled) return
        if (fundsJson.error) { setError(fundsJson.error); setLoading(false); return }
        setFunds(fundsJson.data ?? [])
        if (!budgetJson.error) setBudgetData(budgetJson.data ?? null)
        const cats: Category[] = []
        for (const g of catsJson.data ?? catsJson ?? []) {
          for (const c of g.categories ?? []) {
            if (!c.is_system) cats.push({ id: c.id, name: c.name, group_name: g.name })
          }
        }
        setCategories(cats)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) { setError('Error de conexión'); setLoading(false) }
      })
    return () => { cancelled = true }
  }, [refreshKey, month])

  function load() {
    setLoading(true)
    setError(null)
    setRefreshKey((k) => k + 1)
  }

  function getDisponible(categoryId: string): number {
    if (!budgetData) return 0
    for (const group of budgetData.groups) {
      const cat = group.categories.find((c) => c.id === categoryId)
      if (cat) return cat.disponible
    }
    return 0
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(fund: SinkingFund) {
    setForm({
      category_id: fund.category_id,
      name: fund.name,
      target_amount: String(fund.target_amount),
      target_date: fund.target_date,
      notes: fund.notes ?? '',
    })
    setEditingId(fund.id)
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit() {
    if (!form.category_id) { setFormError('Selecciona una categoría'); return }
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return }
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      setFormError('El monto objetivo debe ser mayor a 0')
      return
    }
    if (!form.target_date) { setFormError('La fecha objetivo es requerida'); return }

    setSaving(true)
    setFormError(null)
    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      target_amount: parseFloat(form.target_amount),
      target_date: form.target_date,
      notes: form.notes.trim() || null,
    }
    try {
      const isEdit = editingId !== null
      const res = await fetch(
        isEdit ? `/api/helpers/sinking-funds/${editingId}` : '/api/helpers/sinking-funds',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setFormError(json.error ?? 'Error al guardar')
      } else {
        await load()
        closeForm()
      }
    } catch {
      setFormError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/helpers/sinking-funds/${id}`, { method: 'DELETE' })
      setFunds((prev) => prev.filter((f) => f.id !== id))
    } catch {
      // ignore
    }
  }

  async function handleAsignar(fund: SinkingFund, contribution: number) {
    if (contribution <= 0) return
    setAsignarState((s) => ({ ...s, [fund.id]: { saving: true, msg: null } }))
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: fund.category_id, month, assigned_amount: contribution }),
      })
      const json = await res.json()
      const msg = res.ok
        ? `$${contribution.toFixed(2)} asignado`
        : (json.error ?? 'Error al asignar')
      setAsignarState((s) => ({ ...s, [fund.id]: { saving: false, msg } }))
    } catch {
      setAsignarState((s) => ({ ...s, [fund.id]: { saving: false, msg: 'Error de conexión' } }))
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm" style={{ color: 'var(--text-sub)' }}>Cargando…</div>
  }
  if (error) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={load} className="mt-3 text-sm underline" style={{ color: 'var(--ac)' }}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!formOpen && (
        <button
          onClick={openAdd}
          className="w-full rounded-xl py-3 text-sm font-semibold"
          style={{ background: 'var(--ac)', color: '#fff' }}
        >
          + Nuevo fondo
        </button>
      )}

      {formOpen && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {editingId ? 'Editar fondo' : 'Nuevo fondo de ahorro'}
          </p>

          <input
            type="text"
            placeholder="Nombre del fondo"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
          />

          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
          >
            <option value="">Categoría vinculada…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.group_name} · {c.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Monto objetivo</label>
              <div className="flex items-center gap-1">
                <span className="text-sm" style={{ color: 'var(--text-sub)' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.target_amount}
                  onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Fecha objetivo</label>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-app)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
          />

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={closeForm}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {funds.length === 0 && !formOpen && (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">🏦</p>
          <p className="text-sm" style={{ color: 'var(--text-sub)' }}>No hay fondos de ahorro aún</p>
        </div>
      )}

      <div className="space-y-3">
        {funds.map((fund) => {
          const disponible = getDisponible(fund.category_id)
          const remaining = monthsRemaining(fund.target_date)
          const contribution = sinkingFundCalc(fund.target_amount, disponible, remaining)
          const progress = Math.min(100, (disponible / fund.target_amount) * 100)
          const state = asignarState[fund.id]

          return (
            <div
              key={fund.id}
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'var(--bg-card)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                    {fund.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
                    {fund.category_name} · hasta {fund.target_date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(fund)}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(fund.id)}
                    className="text-xs px-2 py-1 rounded-lg text-red-500"
                    style={{ background: 'rgba(239,68,68,0.1)' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-sub)' }}>
                  <span>${disponible.toFixed(2)} disponible</span>
                  <span>Meta: ${fund.target_amount.toFixed(2)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-app)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${progress}%`, background: 'var(--ac)' }}
                  />
                </div>
              </div>

              {/* Contribution + Asignar */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-sub)' }}>
                    Aportación mensual · {remaining} {remaining === 1 ? 'mes' : 'meses'}
                  </p>
                  <p className="text-lg font-bold" style={{ color: contribution > 0 ? 'var(--ac)' : '#22c55e' }}>
                    {contribution > 0 ? `$${contribution.toFixed(2)}` : '¡Meta alcanzada!'}
                  </p>
                </div>
                {contribution > 0 && (
                  <button
                    onClick={() => handleAsignar(fund, contribution)}
                    disabled={state?.saving}
                    className="rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40"
                    style={{ background: 'var(--ac)', color: '#fff' }}
                  >
                    {state?.saving ? '…' : 'Asignar'}
                  </button>
                )}
              </div>
              {state?.msg && (
                <p className={`text-xs ${state.msg.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                  {state.msg}
                </p>
              )}

              {fund.notes && (
                <p className="text-xs italic" style={{ color: 'var(--text-sub)' }}>{fund.notes}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
