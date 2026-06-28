"use client";

import { useState, useRef, useEffect } from "react";
import {
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  Landmark,
  MoreVertical,
  Pencil,
  Archive,
} from "lucide-react";
import type { AccountWithBalance, AccountType } from "@/types/account";

const TYPE_ICONS: Record<AccountType, React.FC<{ size: number; strokeWidth: number }>> = {
  checking: (p) => <Building2 {...p} />,
  savings: (p) => <PiggyBank {...p} />,
  credit_card: (p) => <CreditCard {...p} />,
  cash: (p) => <Banknote {...p} />,
  investment: (p) => <TrendingUp {...p} />,
  liability: (p) => <Landmark {...p} />,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface Props {
  account: AccountWithBalance;
  onEdit: (account: AccountWithBalance) => void;
  onArchive: (account: AccountWithBalance) => void;
  archiving: boolean;
}

export function AccountCard({ account, onEdit, onArchive, archiving }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = TYPE_ICONS[account.type];

  const isNegative =
    account.type === "liability" ? account.balance > 0 : account.balance < 0;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const displayBalance =
    account.type === "liability" ? -account.balance : account.balance;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--border-row)" }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
        style={{ background: "var(--bg-elevated)" }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-main)" }}
        >
          {account.name}
        </p>
      </div>

      <span
        className="text-sm font-bold tabular-nums shrink-0"
        style={{ color: isNegative ? "var(--color-negative)" : "var(--text-main)" }}
      >
        {isNegative && account.type !== "liability" ? "" : ""}
        {formatCurrency(displayBalance)}
      </span>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Opciones de cuenta"
          className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors"
          style={{ color: "var(--text-dim)" }}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-9 z-50 rounded-xl py-1 w-44 shadow-lg"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-card)",
            }}
          >
            <button
              onClick={() => { setMenuOpen(false); onEdit(account); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--text-sub)" }}
            >
              <Pencil size={14} />
              Editar nombre
            </button>
            <button
              onClick={() => { setMenuOpen(false); onArchive(account); }}
              disabled={archiving}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors disabled:opacity-50"
              style={{ color: "var(--text-sub)" }}
            >
              <Archive size={14} />
              Archivar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
