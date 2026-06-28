"use client";

import { Plus } from "lucide-react";
import type { AccountWithBalance } from "@/types/account";
import { AccountCard } from "./AccountCard";

interface Props {
  title: string;
  totalLabel: string;
  accounts: AccountWithBalance[];
  archivingId: string | null;
  onEdit: (account: AccountWithBalance) => void;
  onArchive: (account: AccountWithBalance) => void;
  onAdd: () => void;
}

export function AccountGroup({
  title,
  totalLabel,
  accounts,
  archivingId,
  onEdit,
  onArchive,
  onAdd,
}: Props) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-5 py-3">
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--text-dim)" }}
        >
          {title}
        </span>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color: "var(--text-sub)" }}
        >
          {totalLabel}
        </span>
      </div>

      {accounts.length > 0 ? (
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-card)" }}
        >
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={onEdit}
              onArchive={onArchive}
              archiving={archivingId === account.id}
            />
          ))}
        </div>
      ) : (
        <p
          className="mx-5 text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          Sin cuentas todavía.
        </p>
      )}

      <button
        onClick={onAdd}
        className="flex items-center gap-2 mx-5 mt-2 text-sm font-semibold transition-opacity hover:opacity-70"
        style={{ color: "var(--ac)" }}
      >
        <Plus size={15} strokeWidth={2.5} />
        Agregar cuenta
      </button>
    </div>
  );
}
