"use client";

import { useState } from "react";
import { X, Building2, PiggyBank, CreditCard, Banknote, TrendingUp, Landmark } from "lucide-react";
import type { AccountType, CreateAccountInput } from "@/types/account";
import { ACCOUNT_TYPE_LABELS, TRACKING_ONLY_DEFAULTS } from "@/types/account";

const TYPE_ICONS: Record<AccountType, React.FC<{ size: number }>> = {
  checking: (p) => <Building2 {...p} />,
  savings: (p) => <PiggyBank {...p} />,
  credit_card: (p) => <CreditCard {...p} />,
  cash: (p) => <Banknote {...p} />,
  investment: (p) => <TrendingUp {...p} />,
  liability: (p) => <Landmark {...p} />,
};

const ACCOUNT_TYPES: AccountType[] = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "liability",
];

const TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  checking:    "Cuenta bancaria del día a día. Sus movimientos afectan tu presupuesto.",
  savings:     "Cuenta de ahorro bancaria. Sus movimientos afectan tu presupuesto.",
  credit_card: "Deuda rotatoria. Las compras reducen tu disponible; la app crea una categoría de pago automática.",
  cash:        "Dinero en cartera o caja chica. Sus movimientos afectan tu presupuesto.",
  investment:  "Acciones, fondos, CETES. Solo seguimiento — no afecta tu presupuesto.",
  liability:   "Hipoteca, crédito auto u otro préstamo fijo. Solo seguimiento — no afecta tu presupuesto.",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultTrackingOnly?: boolean;
}

export function CreateAccountModal({ open, onClose, onCreated, defaultTrackingOnly }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [startingBalance, setStartingBalance] = useState("");
  const [isTrackingOnly, setIsTrackingOnly] = useState(defaultTrackingOnly ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTypeChange(t: AccountType) {
    setType(t);
    setIsTrackingOnly(TRACKING_ONLY_DEFAULTS[t]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const amount = parseFloat(startingBalance || "0");
    if (isNaN(amount)) {
      setError("El saldo inicial debe ser un número válido");
      setSubmitting(false);
      return;
    }

    const body: CreateAccountInput = {
      name: name.trim(),
      type,
      is_tracking_only: isTrackingOnly,
      starting_balance: amount,
    };

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al crear la cuenta");
      } else {
        handleClose();
        onCreated();
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setName("");
    setType("checking");
    setStartingBalance("");
    setIsTrackingOnly(defaultTrackingOnly ?? false);
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={handleClose}
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
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div
            className="w-9 h-1"
            style={{ background: "rgba(255,255,255,0.12)", borderRadius: "2px" }}
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-extrabold"
            style={{ color: "var(--text-main)" }}
          >
            Nueva Cuenta
          </h2>
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Account name */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Nombre de la cuenta
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cuenta Nómina BBVA"
              maxLength={100}
              required
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />
          </div>

          {/* Account type */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              Tipo de cuenta
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const Icon = TYPE_ICONS[t];
                const selected = t === type;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: selected ? "var(--ab)" : "var(--bg-elevated)",
                      color: selected ? "var(--ac)" : "var(--text-sub)",
                      border: selected
                        ? "1px solid var(--aB)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon size={18} />
                    <span className="text-center leading-tight text-[11px]">
                      {ACCOUNT_TYPE_LABELS[t]}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Inline description for selected type */}
            <p
              className="text-xs leading-relaxed px-1 transition-all"
              style={{ color: "var(--text-sub)" }}
            >
              {TYPE_DESCRIPTIONS[type]}
            </p>
          </div>

          {/* Tracking only toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                Solo seguimiento
              </p>
              <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                No afecta el presupuesto
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isTrackingOnly}
              onClick={() => setIsTrackingOnly((v) => !v)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{
                background: isTrackingOnly ? "var(--ac)" : "var(--bg-elevated)",
                border: "1px solid var(--border-card)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                style={{
                  background: "#fff",
                  transform: isTrackingOnly ? "translateX(24px)" : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* Starting balance */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--text-dim)" }}
            >
              {type === "liability" ? "Saldo adeudado" : "Saldo inicial"}
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
                min="0"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl pl-8 pr-4 py-3 text-sm font-medium outline-none transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              />
            </div>
            {type === "liability" && (
              <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                Ingresa el monto que debes actualmente
              </p>
            )}
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
            disabled={submitting || !name.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: "var(--ac)", color: "#fff" }}
          >
            {submitting ? "Creando..." : "Agregar Cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
