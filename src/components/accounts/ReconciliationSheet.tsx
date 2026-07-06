"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import type { AccountWithBalance } from "@/types/account";
import type { CategoryGroupWithCategories } from "@/types/category";
import { AppSelect } from "@/components/ui/AppSelect";
import { todayLocalDateString } from "@/lib/zbb/date";

interface Props {
  account: AccountWithBalance | null;
  onClose: () => void;
  onDone: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ReconciliationSheet({ account, onClose, onDone }: Props) {
  const today = todayLocalDateString();

  const [date, setDate] = useState(today);
  const [bankBalanceInput, setBankBalanceInput] = useState("");
  const [appBalance, setAppBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [groups, setGroups] = useState<CategoryGroupWithCategories[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingBalance(true);
    setAppBalance(null);
    fetch(`/api/reconciliation/balance?account_id=${account.id}&date=${date}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json.app_balance !== undefined) setAppBalance(json.app_balance); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingBalance(false); });
    return () => { cancelled = true; };
  }, [account, date]);

  useEffect(() => {
    if (!account) return;
    fetch("/api/categories/groups")
      .then((r) => r.json())
      .then((json) => setGroups(json.data ?? []))
      .catch(() => {});
  }, [account]);

  if (!account) return null;

  const bankBalance = parseFloat(bankBalanceInput);
  const bankBalanceValid = bankBalanceInput !== "" && !isNaN(bankBalance) && isFinite(bankBalance);
  const difference = bankBalanceValid && appBalance !== null ? bankBalance - appBalance : null;
  const balanced = difference === 0;
  const needsAdjustment = difference !== null && difference !== 0;
  const isOnBudget = !account.is_tracking_only;
  const userGroups = groups.filter((g) => !g.is_system);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!account) return;

    if (!bankBalanceValid) {
      setError("Ingresa un saldo bancario válido");
      return;
    }
    if (needsAdjustment && isOnBudget && !categoryId) {
      setError("Selecciona una categoría para el ajuste");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: account.id,
          date,
          bank_balance: bankBalance,
          category_id: categoryId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al conciliar");
      } else {
        setDone(true);
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2
          size={52}
          strokeWidth={1.5}
          style={{ color: "var(--color-positive)" }}
        />
        <p
          className="text-xl font-extrabold"
          style={{ color: "var(--text-main)" }}
        >
          ¡Cuenta conciliada!
        </p>
        <p className="text-sm" style={{ color: "var(--text-sub)" }}>
          Todas las transacciones hasta el{" "}
          <strong style={{ color: "var(--text-main)" }}>{date}</strong> han sido
          marcadas como conciliadas.
        </p>
        <button
          onClick={() => { onDone(); onClose(); }}
          className="mt-2 w-full py-3.5 rounded-2xl text-sm font-bold"
          style={{ background: "var(--ac)", color: "#fff" }}
        >
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          Fecha de conciliación
        </label>
        <input
          type="date"
          value={date}
          max={today}
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

      {/* Bank balance input */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          Saldo real en el banco
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
            value={bankBalanceInput}
            onChange={(e) => setBankBalanceInput(e.target.value)}
            placeholder="0.00"
            autoFocus
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

      {/* Balance summary */}
      <div
        className="rounded-2xl px-4 py-4 flex flex-col gap-3"
        style={{ background: "var(--bg-elevated)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-sub)" }}>
            Saldo en la app
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "var(--text-main)" }}
          >
            {loadingBalance
              ? "Calculando..."
              : appBalance !== null
              ? formatCurrency(appBalance)
              : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-sub)" }}>
            Saldo bancario
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "var(--text-main)" }}
          >
            {bankBalanceValid ? formatCurrency(bankBalance) : "—"}
          </span>
        </div>

        <div
          className="h-px w-full"
          style={{ background: "var(--border-card)" }}
        />

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
            Diferencia
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              color:
                difference === null
                  ? "var(--text-dim)"
                  : balanced
                  ? "var(--color-positive)"
                  : "var(--color-negative)",
            }}
          >
            {difference === null
              ? "—"
              : balanced
              ? "Cuadrado ✓"
              : formatCurrency(difference)}
          </span>
        </div>
      </div>

      {/* Adjustment category — only when there's a discrepancy */}
      {needsAdjustment && (
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: "var(--text-sub)" }}>
            Se creará una transacción de ajuste por{" "}
            <strong style={{ color: "var(--text-main)" }}>
              {formatCurrency(difference!)}
            </strong>{" "}
            para cuadrar la diferencia.
          </p>

          {isOnBudget && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Categoría del ajuste
              </label>
              <AppSelect
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Seleccionar categoría"
                options={userGroups.flatMap((g) =>
                  g.categories
                    .filter((c) => !c.is_system && !c.is_archived)
                    .map((c) => ({ value: c.id, label: c.name, sub: g.name }))
                )}
              />
            </div>
          )}
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
        disabled={submitting || !bankBalanceValid || appBalance === null}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
        style={{ background: "var(--ac)", color: "#fff" }}
      >
        {submitting ? "Conciliando..." : balanced ? "Conciliar cuenta" : "Conciliar con ajuste"}
      </button>
    </form>
  );
}
