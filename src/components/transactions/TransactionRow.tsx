"use client";

import { CheckCircle2, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";
import type { TransactionWithDetails } from "@/types/transaction";
import { TRANSACTION_TYPE_LABELS } from "@/types/transaction";
import { MaskedAmount } from "@/components/shared/MaskedAmount";

interface Props {
  tx: TransactionWithDetails;
  onEdit: (tx: TransactionWithDetails) => void;
  onDelete: (tx: TransactionWithDetails) => void;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TransactionRow({ tx, onEdit, onDelete }: Props) {
  const isPositive = tx.amount >= 0;
  const isTransfer = tx.type === "transfer";
  const isSystem =
    tx.type === "adjustment" || tx.type === "opening_balance";

  const title = tx.payee || tx.memo || TRANSACTION_TYPE_LABELS[tx.type];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border-card)" }}
    >
      {/* Reconciled / transfer indicator */}
      <div className="flex-shrink-0 w-5 flex justify-center">
        {tx.is_reconciled && (
          <CheckCircle2 size={14} style={{ color: "var(--color-positive)" }} />
        )}
        {isTransfer && !tx.is_reconciled && (
          <ArrowLeftRight size={14} style={{ color: "var(--text-dim)" }} />
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-main)" }}
        >
          {title}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-sub)" }}>
          {tx.account_name}
          {tx.memo && tx.payee ? ` · ${tx.memo}` : ""}
        </p>
        {tx.tags.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {tx.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: "var(--ab)",
                  color: "var(--ac)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <p
          className="text-sm font-bold tabular-nums"
          style={{
            color: isPositive
              ? "var(--color-positive)"
              : isSystem
              ? "var(--text-sub)"
              : "var(--color-negative)",
          }}
        >
          {isPositive ? "+" : ""}
          <MaskedAmount value={formatCurrency(tx.amount)} />
        </p>
        {tx.next_month && (
          <p className="text-[10px] font-semibold" style={{ color: "var(--ac)" }}>
            Mes sig.
          </p>
        )}
      </div>

      {/* Actions */}
      {!isSystem && (
        <div className="flex-shrink-0 flex gap-1">
          <button
            onClick={() => onEdit(tx)}
            aria-label="Editar"
            className="p-2.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--text-dim)" }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(tx)}
            aria-label="Eliminar"
            className="p-2.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--text-dim)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
