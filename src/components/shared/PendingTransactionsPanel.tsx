"use client";

import { X } from "lucide-react";

interface PendingTransactionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PendingTransactionsPanel({
  isOpen,
  onClose,
}: PendingTransactionsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-[fadeIn_0.3s_ease]"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-14 pb-4"
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
            Revisa y confirma las transacciones programadas
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

      {/* Loading skeleton — M06 fills real content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-4 animate-pulse"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-card)",
            }}
          >
            <div
              className="h-4 w-2/3 rounded-full mb-3"
              style={{ background: "var(--bg-elevated)" }}
            />
            <div
              className="h-3 w-1/3 rounded-full"
              style={{ background: "var(--bg-elevated)" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
