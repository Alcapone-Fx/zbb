'use client'

import { useState, useEffect } from 'react'
import { sinkingFundCalc, monthsRemaining } from '@/lib/zbb/helpers-calc'
import type { SinkingFund, SinkingFundGroup } from '@/types/helpers'
import { AppSelect } from '@/components/ui/AppSelect'

// ── Helpers ────────────────────────────────────────────────────────────────

function currentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

/** Formats a YYYY-MM-DD date as "Ene-26" style */
function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const parts = dateStr.split('-')
  const m = parseInt(parts[1]) - 1
  const y = parts[0].slice(2)
  return `${months[m]}-${y}`
}

// ── Local interfaces ───────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  group_name: string
}

interface Account {
  id: string
  name: string
}

interface GroupFormState {
  name: string
  category_id: string
  source_account_id: string
}

interface FundFormState {
  name: string
  target_amount: string
  target_date: string
  group_id: string
  recurrence: 'one_time' | 'annual'
  notes: string
}

interface PayFormState {
  amount: string
  date: string
}

const EMPTY_GROUP_FORM: GroupFormState = { name: '', category_id: '', source_account_id: '' }
const EMPTY_FUND_FORM: FundFormState = {
  name: '',
  target_amount: '',
  target_date: '',
  group_id: '',
  recurrence: 'one_time',
  notes: '',
}

// ── FundRow sub-component ──────────────────────────────────────────────────

interface FundRowProps {
  fund: SinkingFund
  isPayOpen: boolean
  payForm: PayFormState
  paySaving: boolean
  payFormError: string | null
  onPayFormChange: (form: PayFormState) => void
  onOpenPay: (fund: SinkingFund) => void
  onClosePay: () => void
  onConfirmPay: (fundId: string) => void
  onEdit: (fund: SinkingFund) => void
  onDelete: (id: string) => void
  onResetCycle: (id: string) => void
}

function FundRow({
  fund,
  isPayOpen,
  payForm,
  paySaving,
  payFormError,
  onPayFormChange,
  onOpenPay,
  onClosePay,
  onConfirmPay,
  onEdit,
  onDelete,
  onResetCycle,
}: FundRowProps) {
  const remaining = monthsRemaining(fund.target_date)
  const contribution = sinkingFundCalc(fund.target_amount, 0, remaining)

  const isPaid = fund.is_paid
  const isOneTime = fund.recurrence === 'one_time'
  const isAnnual = fund.recurrence === 'annual'

  const inputStyle = {
    background: 'var(--bg-app)',
    borderColor: 'var(--border-card)',
    color: 'var(--text-main)',
  }

  return (
    <div
      className="px-4 py-3 border-t"
      style={{
        borderColor: 'var(--border-card)',
        opacity: isPaid && isOneTime ? 0.55 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-main)' }}>
            {fund.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
            {isPaid
              ? null
              : `$${contribution.toFixed(2)}/mes · ${remaining} ${remaining === 1 ? 'mes' : 'meses'}`}
            {isPaid && isAnnual && fund.last_paid_date && (
              <>Pagado {formatShortDate(fund.last_paid_date)} · próx. {formatShortDate(fund.target_date)}</>
            )}
            {isPaid && isOneTime && 'Completado'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Edit/Delete always available */}
          <button
            onClick={() => onEdit(fund)}
            className="text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(fund.id)}
            className="text-xs px-2 py-1 rounded-lg text-red-500"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            Eliminar
          </button>

          {/* Status-based action */}
          {!isPaid && (
            <button
              onClick={() => onOpenPay(fund)}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              Pagar
            </button>
          )}
          {isPaid && isAnnual && (
            <button
              onClick={() => onResetCycle(fund.id)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Reiniciar
            </button>
          )}
          {isPaid && isOneTime && (
            <button
              onClick={() => onResetCycle(fund.id)}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Reactivar
            </button>
          )}
        </div>
      </div>

      {fund.notes && !isPayOpen && (
        <p className="text-xs italic mt-1" style={{ color: 'var(--text-dim)' }}>{fund.notes}</p>
      )}

      {/* Pay form (inline) */}
      {isPayOpen && (
        <div className="mt-3 p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
            Confirmar pago — {fund.name}
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Monto</label>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: 'var(--text-sub)' }}>$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => onPayFormChange({ ...payForm, amount: e.target.value })}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>Fecha</label>
              <input
                type="date"
                value={payForm.date}
                onChange={(e) => onPayFormChange({ ...payForm, date: e.target.value })}
                className="w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          {payFormError && <p className="text-xs text-red-500">{payFormError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => onConfirmPay(fund.id)}
              disabled={paySaving}
              className="flex-1 rounded-xl py-2 text-xs font-semibold disabled:opacity-40"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              {paySaving ? 'Guardando…' : 'Confirmar pago'}
            </button>
            <button
              onClick={onClosePay}
              className="flex-1 rounded-xl py-2 text-xs"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function SinkingFundsHelper() {
  const [groups, setGroups] = useState<SinkingFundGroup[]>([])
  const [funds, setFunds] = useState<SinkingFund[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)  // true = initial load in progress
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Group form
  const [groupFormOpen, setGroupFormOpen] = useState(false)
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState<GroupFormState>(EMPTY_GROUP_FORM)
  const [groupSaving, setGroupSaving] = useState(false)
  const [groupFormError, setGroupFormError] = useState<string | null>(null)

  // Fund form
  const [fundFormOpen, setFundFormOpen] = useState(false)
  const [fundEditingId, setFundEditingId] = useState<string | null>(null)
  const [fundForm, setFundForm] = useState<FundFormState>(EMPTY_FUND_FORM)
  const [fundSaving, setFundSaving] = useState(false)
  const [fundFormError, setFundFormError] = useState<string | null>(null)

  // Pay form
  const [payingFundId, setPayingFundId] = useState<string | null>(null)
  const [payForm, setPayForm] = useState<PayFormState>({ amount: '', date: todayStr() })
  const [paySaving, setPaySaving] = useState(false)
  const [payFormError, setPayFormError] = useState<string | null>(null)

  // Collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Per-group asignar feedback
  const [asignarState, setAsignarState] = useState<
    Record<string, { saving: boolean; msg: string | null }>
  >({})

  const month = currentMonthStr()

  // ── Data loading ───────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetch('/api/helpers/sinking-fund-groups').then((r) => r.json()),
      fetch('/api/helpers/sinking-funds').then((r) => r.json()),
      fetch('/api/categories/groups').then((r) => r.json()),
      fetch('/api/accounts').then((r) => r.json()),
    ])
      .then(([groupsJson, fundsJson, catsJson, accountsJson]) => {
        if (cancelled) return
        if (groupsJson.error) { setError(groupsJson.error); setLoading(false); return }
        if (fundsJson.error) { setError(fundsJson.error); setLoading(false); return }
        setGroups(groupsJson.data ?? [])
        setFunds(fundsJson.data ?? [])

        const cats: Category[] = []
        for (const g of catsJson.data ?? []) {
          for (const c of g.categories ?? []) {
            if (!c.is_system && !c.is_archived) {
              cats.push({ id: c.id, name: c.name, group_name: g.name })
            }
          }
        }
        setCategories(cats)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const accs: Account[] = (accountsJson.on_budget ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
        }))
        setAccounts(accs)
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

  // ── Group form handlers ────────────────────────────────────────────────

  function openAddGroup() {
    setGroupForm(EMPTY_GROUP_FORM)
    setGroupEditingId(null)
    setGroupFormError(null)
    setGroupFormOpen(true)
    setFundFormOpen(false)
  }

  function openEditGroup(group: SinkingFundGroup) {
    setGroupForm({
      name: group.name,
      category_id: group.category_id ?? '',
      source_account_id: group.source_account_id ?? '',
    })
    setGroupEditingId(group.id)
    setGroupFormError(null)
    setGroupFormOpen(true)
    setFundFormOpen(false)
  }

  function closeGroupForm() {
    setGroupFormOpen(false)
    setGroupEditingId(null)
    setGroupForm(EMPTY_GROUP_FORM)
    setGroupFormError(null)
  }

  async function handleGroupSubmit() {
    if (!groupForm.name.trim()) { setGroupFormError('El nombre es requerido'); return }
    setGroupSaving(true)
    setGroupFormError(null)
    const payload = {
      name: groupForm.name.trim(),
      category_id: groupForm.category_id || null,
      source_account_id: groupForm.source_account_id || null,
    }
    try {
      const isEdit = groupEditingId !== null
      const res = await fetch(
        isEdit
          ? `/api/helpers/sinking-fund-groups/${groupEditingId}`
          : '/api/helpers/sinking-fund-groups',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setGroupFormError(json.error ?? 'Error al guardar')
      } else {
        load()
        closeGroupForm()
      }
    } catch {
      setGroupFormError('Error de conexión')
    } finally {
      setGroupSaving(false)
    }
  }

  async function handleDeleteGroup(id: string, name: string) {
    const fundsInGroup = funds.filter((f) => f.group_id === id)
    if (fundsInGroup.length > 0) {
      setError(`El grupo "${name}" tiene ${fundsInGroup.length} meta(s). Elimínalas o muévelas primero.`)
      return
    }
    try {
      const res = await fetch(`/api/helpers/sinking-fund-groups/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const json = await res.json()
        setError(json.error ?? 'No se puede eliminar el grupo')
        return
      }
      if (!res.ok && res.status !== 204) {
        setError('Error al eliminar el grupo')
        return
      }
      setGroups((prev) => prev.filter((g) => g.id !== id))
    } catch {
      setError('Error de conexión')
    }
  }

  // ── Fund form handlers ─────────────────────────────────────────────────

  function openAddFund(defaultGroupId?: string) {
    setFundForm({ ...EMPTY_FUND_FORM, group_id: defaultGroupId ?? '' })
    setFundEditingId(null)
    setFundFormError(null)
    setFundFormOpen(true)
    setGroupFormOpen(false)
  }

  function openEditFund(fund: SinkingFund) {
    setFundForm({
      name: fund.name,
      target_amount: String(fund.target_amount),
      target_date: fund.target_date,
      group_id: fund.group_id ?? '',
      recurrence: fund.recurrence,
      notes: fund.notes ?? '',
    })
    setFundEditingId(fund.id)
    setFundFormError(null)
    setFundFormOpen(true)
    setGroupFormOpen(false)
  }

  function closeFundForm() {
    setFundFormOpen(false)
    setFundEditingId(null)
    setFundForm(EMPTY_FUND_FORM)
    setFundFormError(null)
  }

  async function handleFundSubmit() {
    if (!fundForm.name.trim()) { setFundFormError('El nombre es requerido'); return }
    const amt = parseFloat(fundForm.target_amount)
    if (!fundForm.target_amount || isNaN(amt) || amt <= 0) {
      setFundFormError('El monto objetivo debe ser mayor a 0'); return
    }
    if (!fundForm.target_date) { setFundFormError('La fecha objetivo es requerida'); return }

    setFundSaving(true)
    setFundFormError(null)
    const payload = {
      name: fundForm.name.trim(),
      target_amount: amt,
      target_date: fundForm.target_date,
      group_id: fundForm.group_id || null,
      recurrence: fundForm.recurrence,
      notes: fundForm.notes.trim() || null,
    }
    try {
      const isEdit = fundEditingId !== null
      const res = await fetch(
        isEdit ? `/api/helpers/sinking-funds/${fundEditingId}` : '/api/helpers/sinking-funds',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        setFundFormError(json.error ?? 'Error al guardar')
      } else {
        load()
        closeFundForm()
      }
    } catch {
      setFundFormError('Error de conexión')
    } finally {
      setFundSaving(false)
    }
  }

  async function handleDeleteFund(id: string) {
    try {
      await fetch(`/api/helpers/sinking-funds/${id}`, { method: 'DELETE' })
      setFunds((prev) => prev.filter((f) => f.id !== id))
    } catch {
      setError('Error al eliminar la meta')
    }
  }

  // ── Pay handlers ───────────────────────────────────────────────────────

  function openPay(fund: SinkingFund) {
    setPayingFundId(fund.id)
    setPayForm({ amount: String(fund.target_amount), date: todayStr() })
    setPayFormError(null)
  }

  function closePay() {
    setPayingFundId(null)
    setPayForm({ amount: '', date: todayStr() })
    setPayFormError(null)
  }

  async function handleConfirmPay(fundId: string) {
    const amount = parseFloat(payForm.amount)
    if (!payForm.amount || isNaN(amount) || amount <= 0) {
      setPayFormError('El monto debe ser mayor a 0'); return
    }
    if (!payForm.date) { setPayFormError('La fecha es requerida'); return }

    setPaySaving(true)
    setPayFormError(null)
    try {
      const res = await fetch(`/api/helpers/sinking-funds/${fundId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, date: payForm.date }),
      })
      const json = await res.json()
      if (!res.ok) {
        setPayFormError(json.error ?? 'Error al registrar pago')
      } else {
        // Patch the local fund state with the server response
        setFunds((prev) =>
          prev.map((f) =>
            f.id === fundId
              ? {
                  ...f,
                  is_paid: json.data.is_paid,
                  last_paid_amount: json.data.last_paid_amount,
                  last_paid_date: json.data.last_paid_date,
                  target_date: json.data.target_date,
                }
              : f
          )
        )
        closePay()
      }
    } catch {
      setPayFormError('Error de conexión')
    } finally {
      setPaySaving(false)
    }
  }

  async function handleResetCycle(fundId: string) {
    try {
      const res = await fetch(`/api/helpers/sinking-funds/${fundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: false }),
      })
      if (res.ok) {
        const json = await res.json()
        setFunds((prev) =>
          prev.map((f) =>
            f.id === fundId ? { ...f, is_paid: json.data.is_paid ?? false } : f
          )
        )
      } else {
        setError('Error al reiniciar el ciclo')
      }
    } catch {
      setError('Error de conexión')
    }
  }

  // ── Group asignar ──────────────────────────────────────────────────────

  async function handleAsignarGroup(group: SinkingFundGroup, totalMonthly: number) {
    if (totalMonthly <= 0 || !group.category_id) return
    const rounded = Math.round(totalMonthly * 100) / 100
    setAsignarState((s) => ({ ...s, [group.id]: { saving: true, msg: null } }))
    try {
      const res = await fetch('/api/budget/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: group.category_id, month, assigned_amount: rounded }),
      })
      const json = await res.json()
      const msg = res.ok
        ? `$${rounded.toFixed(2)} asignado`
        : (json.error ?? 'Error al asignar')
      setAsignarState((s) => ({ ...s, [group.id]: { saving: false, msg } }))
    } catch {
      setAsignarState((s) => ({ ...s, [group.id]: { saving: false, msg: 'Error de conexión' } }))
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────

  function groupMonthlyTotal(groupId: string): number {
    return funds
      .filter((f) => f.group_id === groupId && !f.is_paid)
      .reduce(
        (sum, f) => sum + sinkingFundCalc(f.target_amount, 0, monthsRemaining(f.target_date)),
        0
      )
  }

  function toggleCollapse(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  const inputStyle = {
    background: 'var(--bg-app)',
    borderColor: 'var(--border-card)',
    color: 'var(--text-main)',
  }

  const inputClass = 'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none'

  // ── Loading / error states ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="py-10 text-center text-sm" style={{ color: 'var(--text-sub)' }}>
        Cargando…
      </div>
    )
  }

  const ungroupedFunds = funds.filter((f) => !f.group_id)

  return (
    <div className="space-y-4">
      {/* Top-level error banner */}
      {error && (
        <div className="rounded-xl px-4 py-3 flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.1)' }}>
          <p className="flex-1 text-sm text-red-500">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!groupFormOpen && !fundFormOpen && (
        <div className="flex gap-2">
          <button
            onClick={openAddGroup}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-card)',
            }}
          >
            + Nuevo grupo
          </button>
          <button
            onClick={() => openAddFund()}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: 'var(--ac)', color: '#fff' }}
          >
            + Nueva meta
          </button>
        </div>
      )}

      {/* Group form */}
      {groupFormOpen && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {groupEditingId ? 'Editar grupo' : 'Nuevo grupo'}
          </p>

          <input
            type="text"
            placeholder="Nombre del grupo (ej. Anuales)"
            value={groupForm.name}
            onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
            autoComplete="off"
            className={inputClass}
            style={inputStyle}
          />

          <AppSelect
            value={groupForm.category_id}
            onChange={(v) => setGroupForm((f) => ({ ...f, category_id: v }))}
            placeholder="Categoría presupuestal (opcional)"
            options={categories.map((c) => ({ value: c.id, label: c.name, sub: c.group_name }))}
          />

          <AppSelect
            value={groupForm.source_account_id}
            onChange={(v) => setGroupForm((f) => ({ ...f, source_account_id: v }))}
            placeholder="Cuenta de origen (opcional)"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          />

          {groupFormError && <p className="text-sm text-red-500">{groupFormError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleGroupSubmit}
              disabled={groupSaving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              {groupSaving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={closeGroupForm}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Fund form */}
      {fundFormOpen && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
            {fundEditingId ? 'Editar meta' : 'Nueva meta de ahorro'}
          </p>

          <input
            type="text"
            placeholder="Nombre de la meta"
            value={fundForm.name}
            onChange={(e) => setFundForm((f) => ({ ...f, name: e.target.value }))}
            autoComplete="off"
            className={inputClass}
            style={inputStyle}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>
                Monto objetivo
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm" style={{ color: 'var(--text-sub)' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={fundForm.target_amount}
                  onChange={(e) => setFundForm((f) => ({ ...f, target_amount: e.target.value }))}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: 'var(--text-sub)' }}>
                Fecha objetivo
              </label>
              <input
                type="date"
                value={fundForm.target_date}
                onChange={(e) => setFundForm((f) => ({ ...f, target_date: e.target.value }))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <AppSelect
            value={fundForm.group_id}
            onChange={(v) => setFundForm((f) => ({ ...f, group_id: v }))}
            placeholder="Sin grupo"
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
          />

          <AppSelect
            value={fundForm.recurrence}
            onChange={(v) => setFundForm((f) => ({ ...f, recurrence: v as 'one_time' | 'annual' }))}
            options={[
              { value: 'one_time', label: 'Una vez' },
              { value: 'annual', label: 'Anual', sub: 'Se renueva cada año automáticamente' },
            ]}
          />

          <input
            type="text"
            placeholder="Notas (opcional)"
            value={fundForm.notes}
            onChange={(e) => setFundForm((f) => ({ ...f, notes: e.target.value }))}
            className={inputClass}
            style={inputStyle}
          />

          {fundFormError && <p className="text-sm text-red-500">{fundFormError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleFundSubmit}
              disabled={fundSaving}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--ac)', color: '#fff' }}
            >
              {fundSaving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={closeFundForm}
              className="flex-1 rounded-xl py-2.5 text-sm"
              style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && ungroupedFunds.length === 0 && !groupFormOpen && !fundFormOpen && (
        <div className="py-8 text-center">
          <p className="text-4xl mb-2">🏦</p>
          <p className="text-sm" style={{ color: 'var(--text-sub)' }}>
            No hay grupos ni metas aún
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
            Crea un grupo para organizar tus metas de ahorro
          </p>
        </div>
      )}

      {/* Groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const groupFunds = funds.filter((f) => f.group_id === group.id)
          const totalMonthly = groupMonthlyTotal(group.id)
          const isCollapsed = collapsedGroups.has(group.id)
          const asState = asignarState[group.id]

          return (
            <div
              key={group.id}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border-card)' }}
            >
              {/* Group header */}
              <div
                className="px-4 py-3 cursor-pointer select-none"
                style={{ background: 'var(--bg-elevated)' }}
                onClick={() => toggleCollapse(group.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {group.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditGroup(group)
                      }}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'var(--bg-app)', color: 'var(--text-sub)' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteGroup(group.id, group.name)
                      }}
                      className="text-xs px-2 py-1 rounded-lg text-red-500"
                      style={{ background: 'rgba(239,68,68,0.1)' }}
                    >
                      Eliminar
                    </button>
                    <span
                      className="text-xs ml-1"
                      style={{ color: 'var(--text-dim)' }}
                    >
                      {isCollapsed ? '▶' : '▼'}
                    </span>
                  </div>
                </div>

                {(group.category_name || group.source_account_name) && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-sub)' }}>
                    {group.category_name && `Cat: ${group.category_name}`}
                    {group.category_name && group.source_account_name && ' · '}
                    {group.source_account_name && `Cta: ${group.source_account_name}`}
                  </p>
                )}

                {totalMonthly > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs font-semibold" style={{ color: 'var(--ac)' }}>
                      Total: ${totalMonthly.toFixed(2)}/mes
                    </p>
                    {group.category_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAsignarGroup(group, totalMonthly)
                        }}
                        disabled={asState?.saving}
                        className="text-xs px-3 py-1 rounded-lg font-semibold disabled:opacity-40"
                        style={{ background: 'var(--ab)', color: 'var(--ac)' }}
                      >
                        {asState?.saving
                          ? '…'
                          : `Asignar $${totalMonthly.toFixed(2)}`}
                      </button>
                    )}
                  </div>
                )}

                {asState?.msg && (
                  <p
                    className={`text-xs mt-1 ${
                      asState.msg.includes('Error') ? 'text-red-500' : 'text-green-500'
                    }`}
                  >
                    {asState.msg}
                  </p>
                )}
              </div>

              {/* Group fund rows */}
              {!isCollapsed && (
                <div style={{ background: 'var(--bg-card)' }}>
                  {groupFunds.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        Sin metas en este grupo.{' '}
                        <button
                          onClick={() => openAddFund(group.id)}
                          className="underline"
                          style={{ color: 'var(--ac)' }}
                        >
                          Agregar
                        </button>
                      </p>
                    </div>
                  ) : (
                    groupFunds.map((fund) => (
                      <FundRow
                        key={fund.id}
                        fund={fund}
                        isPayOpen={payingFundId === fund.id}
                        payForm={payForm}
                        paySaving={paySaving}
                        payFormError={payFormError}
                        onPayFormChange={setPayForm}
                        onOpenPay={openPay}
                        onClosePay={closePay}
                        onConfirmPay={handleConfirmPay}
                        onEdit={openEditFund}
                        onDelete={handleDeleteFund}
                        onResetCycle={handleResetCycle}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Ungrouped funds */}
        {ungroupedFunds.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border-card)' }}
          >
            <div className="px-4 py-2" style={{ background: 'var(--bg-elevated)' }}>
              <p
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: 'var(--text-dim)' }}
              >
                Sin grupo
              </p>
            </div>
            <div style={{ background: 'var(--bg-card)' }}>
              {ungroupedFunds.map((fund) => (
                <FundRow
                  key={fund.id}
                  fund={fund}
                  isPayOpen={payingFundId === fund.id}
                  payForm={payForm}
                  paySaving={paySaving}
                  payFormError={payFormError}
                  onPayFormChange={setPayForm}
                  onOpenPay={openPay}
                  onClosePay={closePay}
                  onConfirmPay={handleConfirmPay}
                  onEdit={openEditFund}
                  onDelete={handleDeleteFund}
                  onResetCycle={handleResetCycle}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
