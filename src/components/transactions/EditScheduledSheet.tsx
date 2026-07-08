"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ScheduledTransaction } from "@/types/scheduled-transaction";
import { FREQUENCY_LABELS } from "@/types/scheduled-transaction";
import type { AccountWithBalance } from "@/types/account";
import type { CategoryGroupWithCategories } from "@/types/category";
import { AppSelect } from "@/components/ui/AppSelect";

interface Props {
  item: ScheduledTransaction;
  accounts: AccountWithBalance[];
  groups: CategoryGroupWithCategories[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditScheduledSheet({ item, accounts, groups, onClose, onSaved }: Props) {
  const isExpense = item.amount < 0;

  const [accountId, setAccountId] = useState(item.account_id);
  const [categoryId, setCategoryId] = useState(item.category_id ?? "");
  const [type, setType] = useState<"expense" | "income">(isExpense ? "expense" : "income");
  const [amount, setAmount] = useState(Math.abs(item.amount).toFixed(2));
  const [payee, setPayee] = useState(item.payee ?? "");
  const [memo, setMemo] = useState(item.memo ?? "");
  const [frequency, setFrequency] = useState(item.frequency);
  const [nextDueDate, setNextDueDate] = useState(item.next_due_date);
  const [endDate, setEndDate] = useState(item.end_date ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userGroups = groups.filter((g) => !g.is_system);
  const categorySections = userGroups
    .map((g) => ({
      label: g.name,
      options: g.categories
        .filter((c) => !c.is_system && !c.is_archived)
        .map((c) => ({ value: c.id, label: c.name })),
    }))
    .filter((s) => s.options.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("El monto debe ser mayor que cero");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/scheduled-transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          category_id: categoryId || null,
          type,
          amount: parsedAmount,
          payee: payee.trim() || null,
          memo: memo.trim() || null,
          frequency,
          next_due_date: nextDueDate,
          end_date: endDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al guardar");
      } else {
        onSaved();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full lg:max-w-md rounded-t-3xl lg:rounded-3xl overflow-y-auto max-h-[90dvh]"
        style={{ background: "var(--bg-surface)" }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--border-card)" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-extrabold" style={{ color: "var(--text-main)" }}>
            Editar Programada
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-8 flex flex-col gap-4">
          {/* Type */}
          <div className="flex gap-2">
            {(["expense", "income"] as const).map((t) => {
              const labels = { expense: "Gasto", income: "Ingreso" };
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: type === t ? "var(--ab)" : "var(--bg-elevated)",
                    color: type === t ? "var(--ac)" : "var(--text-sub)",
                    border: type === t ? "1px solid var(--aB)" : "1px solid transparent",
                  }}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Monto
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-xl pl-8 pr-4 py-3 text-sm font-medium outline-none"
                style={{ background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border-card)" }}
              />
            </div>
          </div>

          {/* Account */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Cuenta
            </label>
            <AppSelect
              value={accountId}
              onChange={setAccountId}
              placeholder="Seleccionar cuenta"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Categoría
            </label>
            <AppSelect
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Sin categoría"
              sections={categorySections}
              searchable
            />
          </div>

          {/* Payee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Beneficiario (opcional)
            </label>
            <input
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              maxLength={255}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{ background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border-card)" }}
            />
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Nota (opcional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={1000}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{ background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border-card)" }}
            />
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Frecuencia
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: frequency === f ? "var(--ab)" : "var(--bg-elevated)",
                    color: frequency === f ? "var(--ac)" : "var(--text-sub)",
                    border: frequency === f ? "1px solid var(--aB)" : "1px solid transparent",
                  }}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Next due date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Próxima fecha
            </label>
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{ background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border-card)" }}
            />
          </div>

          {/* End date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Fecha de fin (opcional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{ background: "var(--bg-elevated)", color: "var(--text-main)", border: "1px solid var(--border-card)" }}
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-4 py-3"
              style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: "var(--ac)", color: "#fff" }}
          >
            {submitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
