"use client";

import { useState, useEffect } from "react";
import { X, Archive, CheckCircle2 } from "lucide-react";
import type { AccountWithBalance } from "@/types/account";
import { ConfirmSheet } from "@/components/shared/ConfirmSheet";

interface Props {
  account: AccountWithBalance | null;
  onClose: () => void;
  onSaved: () => void;
  onArchive?: () => Promise<void>;
  onReconcile?: () => void;
}

export function EditAccountModal({ account, onClose, onSaved, onArchive, onReconcile }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const [isTrackingOnly, setIsTrackingOnly] = useState(false);
  const [isEmergencyFund, setIsEmergencyFund] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [savingBudgetType, setSavingBudgetType] = useState(false);
  const [savingEmergencyFund, setSavingEmergencyFund] = useState(false);
  const [savingPrimary, setSavingPrimary] = useState(false);

  useEffect(() => {
    if (account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(account.name);
      setIsTrackingOnly(account.is_tracking_only);
      setIsEmergencyFund(account.is_emergency_fund);
      setIsPrimary(account.is_primary);
      setError(null);
      setArchiveError(null);
    }
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name: name.trim() }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al guardar");
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetBudgetType(newIsTrackingOnly: boolean) {
    if (!account || savingBudgetType) return;
    setSavingBudgetType(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_budget_type", is_tracking_only: newIsTrackingOnly }),
      });
      if (res.ok) {
        setIsTrackingOnly(newIsTrackingOnly);
        // If switching to on-budget, clear the emergency fund flag locally
        if (!newIsTrackingOnly) {
          setIsEmergencyFund(false);
        } else {
          // If switching to off-budget, the primary toggle no longer applies
          setIsPrimary(false);
        }
        onSaved();
      }
    } catch {
      // silently ignore — UI stays at previous state
    } finally {
      setSavingBudgetType(false);
    }
  }

  async function handleSetEmergencyFund(newIsEmergencyFund: boolean) {
    if (!account || savingEmergencyFund) return;
    setSavingEmergencyFund(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_emergency_fund", is_emergency_fund: newIsEmergencyFund }),
      });
      if (res.ok) {
        setIsEmergencyFund(newIsEmergencyFund);
        onSaved();
      }
    } catch {
      // silently ignore — UI stays at previous state
    } finally {
      setSavingEmergencyFund(false);
    }
  }

  async function handleSetPrimary(newIsPrimary: boolean) {
    if (!account || savingPrimary) return;
    setSavingPrimary(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_primary", is_primary: newIsPrimary }),
      });
      if (res.ok) {
        setIsPrimary(newIsPrimary);
        onSaved();
      }
    } catch {
      // silently ignore — UI stays at previous state
    } finally {
      setSavingPrimary(false);
    }
  }

  async function handleArchive() {
    if (!onArchive) return;
    setArchiveError(null);
    setArchiving(true);
    try {
      await onArchive();
      onClose();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Error al archivar");
    } finally {
      setArchiving(false);
    }
  }

  if (!account) return null;

  const isCreditCard = account.type === "credit_card";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end"
      style={{ background: "rgba(0,0,0,0.72)" }}
      onClick={onClose}
    >
      <div
        className="w-full animate-[slideUp_0.32s_cubic-bezier(0.34,1.2,0.64,1)]"
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
          <h2
            className="text-xl font-extrabold"
            style={{ color: "var(--text-main)" }}
          >
            Editar Cuenta
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              maxLength={100}
              required
              autoFocus
              autoComplete="nope"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
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
            disabled={submitting || !name.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: "var(--ac)", color: "#fff" }}
          >
            {submitting ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>

        {/* Budget type toggle — hidden for credit_card */}
        {!isCreditCard && (
          <div
            className="mt-5 pt-4 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--border-card)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Tipo de presupuesto
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingBudgetType}
                onClick={() => { if (isTrackingOnly) handleSetBudgetType(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={
                  !isTrackingOnly
                    ? {
                        background: "var(--ab)",
                        color: "var(--ac)",
                        border: "1px solid var(--aB)",
                      }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-sub)",
                        border: "1px solid transparent",
                      }
                }
              >
                On Budget
              </button>
              <button
                type="button"
                disabled={savingBudgetType}
                onClick={() => { if (!isTrackingOnly) handleSetBudgetType(true); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={
                  isTrackingOnly
                    ? {
                        background: "var(--ab)",
                        color: "var(--ac)",
                        border: "1px solid var(--aB)",
                      }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-sub)",
                        border: "1px solid transparent",
                      }
                }
              >
                Off Budget
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--text-sub)" }}>
              {!isTrackingOnly
                ? "Los movimientos de esta cuenta afectan tu presupuesto."
                : "Solo seguimiento — no afecta el presupuesto ni el Dinero a Asignar."}
            </p>
          </div>
        )}

        {/* Primary account toggle — shown only for on-budget, non-credit-card accounts */}
        {!isCreditCard && !isTrackingOnly && (
          <div
            className="mt-5 pt-4 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--border-card)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Cuenta principal
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingPrimary}
                onClick={() => { if (!isPrimary) handleSetPrimary(true); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={
                  isPrimary
                    ? {
                        background: "var(--ab)",
                        color: "var(--ac)",
                        border: "1px solid var(--aB)",
                      }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-sub)",
                        border: "1px solid transparent",
                      }
                }
              >
                Marcar como principal
              </button>
              {isPrimary && (
                <button
                  type="button"
                  disabled={savingPrimary}
                  onClick={() => handleSetPrimary(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-sub)",
                    border: "1px solid transparent",
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-sub)" }}>
              {isPrimary
                ? "Esta es tu cuenta principal — en Cuentas verás cuánto tienes disponible para ahorrar o invertir."
                : "Márcala como tu cuenta de operaciones principal para ver ahí cuánto te queda disponible para ahorrar o invertir."}
            </p>
          </div>
        )}

        {/* Emergency fund toggle — shown only for off-budget accounts */}
        {isTrackingOnly && (
          <div
            className="mt-5 pt-4 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--border-card)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
              Fondo de Emergencia
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingEmergencyFund}
                onClick={() => { if (!isEmergencyFund) handleSetEmergencyFund(true); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={
                  isEmergencyFund
                    ? {
                        background: "var(--ab)",
                        color: "var(--ac)",
                        border: "1px solid var(--aB)",
                      }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-sub)",
                        border: "1px solid transparent",
                      }
                }
              >
                Incluir
              </button>
              <button
                type="button"
                disabled={savingEmergencyFund}
                onClick={() => { if (isEmergencyFund) handleSetEmergencyFund(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                style={
                  !isEmergencyFund
                    ? {
                        background: "var(--ab)",
                        color: "var(--ac)",
                        border: "1px solid var(--aB)",
                      }
                    : {
                        background: "var(--bg-elevated)",
                        color: "var(--text-sub)",
                        border: "1px solid transparent",
                      }
                }
              >
                Excluir
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--text-sub)" }}>
              Incluye esta cuenta en el cálculo del Fondo de Emergencia.
            </p>
          </div>
        )}

        {/* Secondary actions */}
        {(onReconcile || onArchive) && (
          <div
            className="mt-5 pt-4 flex flex-col gap-2"
            style={{ borderTop: "1px solid var(--border-card)" }}
          >
            {onReconcile && (
              <button
                type="button"
                onClick={() => { onReconcile(); onClose(); }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-sub)",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "var(--ac)" }} />
                Conciliar cuenta
              </button>
            )}

            {onArchive && (
              <>
                {archiveError && (
                  <p
                    className="text-sm rounded-xl px-4 py-3"
                    style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
                  >
                    {archiveError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmArchive(true)}
                  disabled={archiving}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: "rgba(248,113,113,0.08)",
                    color: "var(--color-negative)",
                  }}
                >
                  <Archive size={16} />
                  {archiving ? "Archivando..." : "Archivar cuenta"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmSheet
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Archivar cuenta"
        description={`¿Archivar "${account.name}"? Dejará de aparecer en las listas activas, pero su historial se conserva.`}
        confirmLabel="Archivar"
        destructive
        onConfirm={handleArchive}
      />
    </div>
  );
}
