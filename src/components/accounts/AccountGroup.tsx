"use client";

import type { AccountWithBalance } from "@/types/account";
import { AccountCard } from "./AccountCard";

interface Props {
  title: string;
  totalLabel: string;
  accounts: AccountWithBalance[];
  isOffBudget?: boolean;
  onEdit: (account: AccountWithBalance) => void;
}

export function AccountGroup({
  title,
  totalLabel,
  accounts,
  isOffBudget,
  onEdit,
}: Props) {
  if (accounts.length === 0) return null;

  return (
    <div className="mb-5">
      {/* Section label */}
      <div className="flex items-center justify-between px-5 mb-2">
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.8px",
            color: "var(--text-dim)",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <span
          className="tabular-nums"
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-sub)" }}
        >
          {totalLabel}
        </span>
      </div>

      {isOffBudget ? (
        /* Off-budget: bare list directly on page background */
        <div className="px-5">
          {accounts.map((account, i) => (
            <div
              key={account.id}
              style={i === accounts.length - 1 ? { borderBottom: "none" } : undefined}
            >
              <AccountCard
                account={account}
                isOffBudget
                onEdit={onEdit}
              />
            </div>
          ))}
        </div>
      ) : (
        /* On-budget: card wrapper */
        <div
          className="mx-4 rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-card)" }}
        >
          {accounts.map((account, i) => (
            <div
              key={account.id}
              style={i === accounts.length - 1 ? { borderBottom: "none" } : undefined}
            >
              <AccountCard
                account={account}
                onEdit={onEdit}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
