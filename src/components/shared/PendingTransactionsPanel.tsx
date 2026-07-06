"use client";

import { useState } from "react";
import { X, Check, SkipForward, Edit2, Repeat } from "lucide-react";
import type { ScheduledTransaction } from "@/types/scheduled-transaction";
import { FREQUENCY_LABELS } from "@/types/scheduled-transaction";
import { todayLocalDateString } from "@/lib/zbb/date";

interface Props {
  isOpen: boolean;
  items: ScheduledTransaction[];
  onClose: () => void;
  onAllDone: () => void;
}

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

interface ItemCardProps {
  item: ScheduledTransaction;
  onDone: () => void;
}

function PendingItemCard({ item, onDone }: ItemCardProps) {
  const [mode, setMode] = useState<"idle" | "editing">("idle");
  const [editAmount, setEditAmount] = useState(
    Math.abs(item.amount).toFixed(2)
  );
  const [loading, setLoading] = useState<"confirm" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isExpense = item.amount < 0;
  const amountColor = isExpense ? "var(--color-negative)" : "var(--color-positive)";
  const typeLabel = isExpense ? "Gasto" : "Ingreso";

  async function handleConfirm() {
    setError(null);
    setLoading("confirm");
    try {
      const body: Record<string, unknown> = { today: todayLocalDateString() };
      if (mode === "editing") {
        const parsed = parseFloat(editAmount);
        if (isNaN(parsed) || parsed <= 0) {
          setError("Monto inválido");
          setLoading(null);
          return;
        }
        body.amount = parsed;
      }
      const res = await fetch(
        `/api/scheduled-transactions/${item.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error al confirmar");
      } else {
        onDone();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  async function handleSkip() {
    setError(null);
    setLoading("skip");
    try {
      const res = await fetch(
        `/api/scheduled-transactions/${item.id}/skip`,
        { method: "POST" }
      );
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error al saltar");
      } else {
        onDone();
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-card)",
      }}
    >
      {/* Top row: payee + amount */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-bold truncate"
            style={{ color: "var(--text-main)" }}
          >
            {item.payee ?? typeLabel}
          </p>
          {item.category_name && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-sub)" }}>
              {item.category_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-3 shrink-0">
          <Repeat size={12} style={{ color: "var(--text-dim)" }} />
          <span
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {FREQUENCY_LABELS[item.frequency]}
          </span>
        </div>
      </div>

      {/* Meta: account + due date */}
      <p className="text-xs mb-3" style={{ color: "var(--text-dim)" }}>
        {item.account_name} · Vence {formatDate(item.next_due_date)}
      </p>

      {/* Amount display / edit */}
      {mode === "editing" ? (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-sub)" }}>
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            autoFocus
            className="flex-1 rounded-xl px-3 py-2 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          />
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ color: "var(--text-sub)", background: "var(--bg-elevated)" }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <p
          className="text-[22px] font-extrabold tabular-nums mb-3"
          style={{ color: amountColor }}
        >
          {formatCurrency(item.amount)}
        </p>
      )}

      {error && (
        <p
          className="text-xs rounded-lg px-3 py-2 mb-3"
          style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
          style={{ background: "var(--ac)", color: "#fff" }}
        >
          <Check size={14} />
          {loading === "confirm" ? "..." : "Confirmar"}
        </button>

        {mode !== "editing" && (
          <button
            type="button"
            onClick={() => setMode("editing")}
            disabled={loading !== null}
            className="flex items-center justify-center gap-1 p-2.5 rounded-xl transition-opacity disabled:opacity-50"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-sub)",
              border: "1px solid var(--border-card)",
            }}
            aria-label="Editar monto"
          >
            <Edit2 size={14} />
          </button>
        )}

        <button
          type="button"
          onClick={handleSkip}
          disabled={loading !== null}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-dim)",
            border: "1px solid var(--border-card)",
          }}
        >
          <SkipForward size={14} />
          {loading === "skip" ? "..." : "Saltar"}
        </button>
      </div>
    </div>
  );
}

export function PendingTransactionsPanel({ isOpen, items: initialItems, onClose, onAllDone }: Props) {
  const [remaining, setRemaining] = useState<ScheduledTransaction[]>(initialItems);

  function markDone(id: string) {
    const next = remaining.filter((i) => i.id !== id);
    setRemaining(next);
    if (next.length === 0) {
      onAllDone();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-[fadeIn_0.3s_ease]"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-4 shrink-0"
        style={{
          background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)",
        }}
      >
        <div>
          <h1
            className="text-[22px] font-extrabold tracking-[-0.5px]"
            style={{ color: "var(--text-main)" }}
          >
            Transacciones Pendientes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-sub)" }}>
            {remaining.length === 1
              ? "1 transacción programada por confirmar"
              : `${remaining.length} transacciones programadas por confirmar`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar panel"
          className="p-2 rounded-xl"
          style={{ color: "var(--text-dim)" }}
        >
          <X size={20} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-8">
        {remaining.map((item) => (
          <PendingItemCard
            key={item.id}
            item={item}
            onDone={() => markDone(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
