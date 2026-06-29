"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { TransactionWithDetails, UpdateTransactionInput } from "@/types/transaction";
import type { CategoryGroupWithCategories } from "@/types/category";

interface Props {
  tx: TransactionWithDetails | null;
  groups: CategoryGroupWithCategories[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditTransactionSheet({ tx, groups, onClose, onSaved }: Props) {
  const [date, setDate] = useState(tx?.date ?? "");
  const [amount, setAmount] = useState(tx ? String(Math.abs(tx.amount)) : "");
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? "");
  const [payee, setPayee] = useState(tx?.payee ?? "");
  const [memo, setMemo] = useState(tx?.memo ?? "");
  const [tagInput, setTagInput] = useState((tx?.tags ?? []).join(", "));
  const [nextMonth, setNextMonth] = useState(tx?.next_month ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tx) return null;

  const isTransfer = tx.type === "transfer";
  const isIncome = tx.type === "income";

  const userGroups = groups.filter((g) => !g.is_system);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("El monto debe ser mayor que cero");
      setSubmitting(false);
      return;
    }

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const body: UpdateTransactionInput = {
      date,
      amount: parsedAmount,
      category_id: categoryId || null,
      payee: payee.trim() || null,
      memo: memo.trim() || null,
      tags,
      next_month: isIncome ? nextMonth : false,
    };

    try {
      const res = await fetch(`/api/transactions/${tx!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al guardar");
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-h-[92dvh] overflow-y-auto animate-[slideUp_0.32s_cubic-bezier(0.34,1.2,0.64,1)]"
        style={{
          background: "var(--bg-surface)",
          borderRadius: "24px 24px 0 0",
          padding: "0 20px 48px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div
            className="w-9 h-1"
            style={{ background: "rgba(255,255,255,0.12)", borderRadius: "2px" }}
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold" style={{ color: "var(--text-main)" }}>
            Editar Transacción
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={20} />
          </button>
        </div>

        {tx.is_reconciled && (
          <div
            className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: "rgba(251,191,36,0.1)",
              color: "rgb(251,191,36)",
            }}
          >
            <AlertTriangle size={16} />
            <span>Esta transacción pertenece a un mes conciliado.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />
          </div>

          {/* Amount */}
          {!isTransfer && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Monto
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: "var(--text-sub)" }}
                >
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
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-card)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Category */}
          {!isTransfer && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Categoría
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <option value="">Sin categoría</option>
                {userGroups.map((g) => (
                  <optgroup key={g.id} label={g.name}>
                    {g.categories
                      .filter((c) => !c.is_system && !c.is_archived)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Payee */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Beneficiario
            </label>
            <input
              type="text"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              placeholder="Opcional"
              maxLength={255}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Nota
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Opcional"
              maxLength={1000}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="viaje, fijo, variable"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />
          </div>

          {/* Next month (income only) */}
          {isIncome && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                  Asignar al mes siguiente
                </p>
                <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                  El ingreso se cuenta en el presupuesto del mes próximo
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={nextMonth}
                onClick={() => setNextMonth((v) => !v)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{
                  background: nextMonth ? "var(--ac)" : "var(--bg-elevated)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                  style={{
                    background: "#fff",
                    transform: nextMonth ? "translateX(24px)" : "translateX(0)",
                  }}
                />
              </button>
            </div>
          )}

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
            {submitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
