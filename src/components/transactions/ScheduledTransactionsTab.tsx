"use client";

import { useState, useEffect } from "react";
import { Repeat, Edit2, Pause, Play, Trash2 } from "lucide-react";
import type { ScheduledTransaction } from "@/types/scheduled-transaction";
import { FREQUENCY_LABELS } from "@/types/scheduled-transaction";
import type { AccountWithBalance } from "@/types/account";
import type { CategoryGroupWithCategories } from "@/types/category";
import { EditScheduledSheet } from "./EditScheduledSheet";

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.abs(v));
}

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

interface Props {
  initialAccounts: AccountWithBalance[];
  initialGroups: CategoryGroupWithCategories[];
}

export function ScheduledTransactionsTab({ initialAccounts, initialGroups }: Props) {
  const [items, setItems] = useState<ScheduledTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ScheduledTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reload: setLoading(true) first to show skeleton, then re-fetch
  function refetch() {
    setLoading(true);
    setError(null);
    fetch("/api/scheduled-transactions")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) setError(json.error ?? "Error al cargar");
        else setItems(json.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Error de conexión");
        setLoading(false);
      });
  }

  // Initial fetch — all state updates in .then() so linter is happy
  useEffect(() => {
    let cancelled = false;
    fetch("/api/scheduled-transactions")
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) setError(json.error ?? "Error al cargar");
        else setItems(json.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Error de conexión");
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function toggleActive(item: ScheduledTransaction) {
    setActionLoading(item.id + "-toggle");
    try {
      const res = await fetch(`/api/scheduled-transactions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, is_active: !item.is_active } : i
          )
        );
      }
    } catch {
      // Non-fatal
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(item: ScheduledTransaction) {
    if (!window.confirm(`¿Eliminar "${item.payee ?? "esta transacción programada"}"?`)) return;
    setActionLoading(item.id + "-delete");
    try {
      const res = await fetch(`/api/scheduled-transactions/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch {
      // Non-fatal
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl animate-pulse"
            style={{ background: "var(--bg-surface)" }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="mx-5 mt-4 px-4 py-2.5 rounded-xl text-sm"
        style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
      >
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <Repeat size={32} style={{ color: "var(--text-dim)", marginBottom: 12 }} />
        <p className="text-sm font-semibold" style={{ color: "var(--text-dim)" }}>
          Sin transacciones programadas
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>
          Usa el botón + y activa &quot;Hacer recurrente&quot; para programar gastos fijos
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-5 py-4 space-y-3 pb-24">
        {items.map((item) => {
          const isExpense = item.amount < 0;
          const amountColor = isExpense ? "var(--color-negative)" : "var(--color-positive)";
          const today = new Date().toISOString().split("T")[0];
          const isDue = item.next_due_date <= today && item.is_active;

          return (
            <div
              key={item.id}
              className="rounded-2xl p-4"
              style={{
                background: "var(--bg-surface)",
                border: `1px solid ${isDue ? "var(--aB)" : "var(--border-card)"}`,
                opacity: item.is_active ? 1 : 0.55,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p
                      className="text-[15px] font-bold truncate"
                      style={{ color: "var(--text-main)" }}
                    >
                      {item.payee ?? (isExpense ? "Gasto" : "Ingreso")}
                    </p>
                    {isDue && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "var(--ab)", color: "var(--ac)" }}
                      >
                        Pendiente
                      </span>
                    )}
                    {!item.is_active && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: "var(--bg-elevated)", color: "var(--text-dim)" }}
                      >
                        Pausada
                      </span>
                    )}
                  </div>
                  {item.category_name && (
                    <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                      {item.category_name}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
                    {item.account_name} · {FREQUENCY_LABELS[item.frequency]} · Próx. {formatDate(item.next_due_date)}
                  </p>
                </div>
                <p
                  className="text-[17px] font-extrabold tabular-nums ml-3 shrink-0"
                  style={{ color: amountColor }}
                >
                  {formatCurrency(item.amount)}
                </p>
              </div>

              {/* Actions */}
              <div
                className="flex gap-2 mt-3 pt-3"
                style={{ borderTop: "1px solid var(--border-card)" }}
              >
                <button
                  type="button"
                  onClick={() => setEditTarget(item)}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}
                >
                  <Edit2 size={12} />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => toggleActive(item)}
                  disabled={actionLoading === item.id + "-toggle"}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}
                >
                  {item.is_active ? <Pause size={12} /> : <Play size={12} />}
                  {item.is_active ? "Pausar" : "Reanudar"}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={actionLoading === item.id + "-delete"}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-50 ml-auto"
                  style={{ color: "var(--color-negative)" }}
                >
                  <Trash2 size={12} />
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editTarget && (
        <EditScheduledSheet
          item={editTarget}
          accounts={initialAccounts}
          groups={initialGroups}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refetch();
          }}
        />
      )}
    </>
  );
}
