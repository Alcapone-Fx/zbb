"use client";

import { useState, useEffect } from "react";
import { X, Archive, CheckCircle2 } from "lucide-react";
import type { AccountWithBalance } from "@/types/account";

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

  useEffect(() => {
    if (account) {
      setName(account.name);
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
              autoComplete="off"
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
                  onClick={handleArchive}
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
    </div>
  );
}
