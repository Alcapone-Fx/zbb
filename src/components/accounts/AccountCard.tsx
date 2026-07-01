"use client";

import { useState, useRef, useEffect } from "react";
import {
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  Landmark,
  Pencil,
  Archive,
  CheckCircle2,
} from "lucide-react";
import type { AccountWithBalance, AccountType } from "@/types/account";

const TYPE_ICONS: Record<AccountType, React.FC<{ size: number; strokeWidth: number; color?: string }>> = {
  checking:    (p) => <Building2 {...p} />,
  savings:     (p) => <PiggyBank {...p} />,
  credit_card: (p) => <CreditCard {...p} />,
  cash:        (p) => <Banknote {...p} />,
  investment:  (p) => <TrendingUp {...p} />,
  liability:   (p) => <Landmark {...p} />,
};

const TYPE_LABELS: Record<AccountType, string> = {
  checking:    "Corriente",
  savings:     "Ahorro",
  credit_card: "Tarjeta de Crédito",
  cash:        "Efectivo",
  investment:  "Inversión",
  liability:   "Deuda",
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
  isOffBudget?: boolean;
  onEdit: (account: AccountWithBalance) => void;
  onArchive: (account: AccountWithBalance) => void;
  onReconcile: (account: AccountWithBalance) => void;
  archiving: boolean;
}

export function AccountCard({ account, isOffBudget, onEdit, onArchive, onReconcile, archiving }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = TYPE_ICONS[account.type];

  const isNegative =
    account.type === "liability" ? account.balance > 0 : account.balance < 0;

  const displayBalance =
    account.type === "liability" ? -account.balance : account.balance;

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

  const iconBg = isOffBudget
    ? "rgba(52,211,153,0.08)"
    : "var(--ab)";
  const iconColor = isOffBudget ? "#34D399" : "var(--ac)";

  const rowPadding = isOffBudget
    ? "14px 0"
    : "13px 18px";

  const borderBottom = isOffBudget
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(255,255,255,0.05)";

  return (
    <div
      ref={menuRef}
      className="relative flex items-center gap-3 cursor-pointer"
      style={{ padding: rowPadding, borderBottom }}
      onClick={() => setMenuOpen((o) => !o)}
    >
      <div
        className="flex items-center justify-center w-11 h-11 shrink-0"
        style={{
          background: iconBg,
          borderRadius: isOffBudget ? "50%" : "11px",
        }}
      >
        <Icon size={16} strokeWidth={1.8} color={iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold truncate"
          style={{ color: "var(--text-main)" }}
        >
          {account.name}
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-dim)" }}
        >
          {TYPE_LABELS[account.type]}
        </p>
      </div>

      <span
        className="text-sm font-bold tabular-nums shrink-0"
        style={{ color: isNegative ? "var(--color-negative)" : "var(--color-positive)" }}
      >
        {formatCurrency(displayBalance)}
      </span>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 rounded-xl py-1 w-44 shadow-lg"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-card)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setMenuOpen(false); onEdit(account); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--text-sub)" }}
          >
            <Pencil size={14} />
            Editar nombre
          </button>
          <button
            onClick={() => { setMenuOpen(false); onReconcile(account); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--text-sub)" }}
          >
            <CheckCircle2 size={14} />
            Conciliar
          </button>
          <button
            onClick={() => { setMenuOpen(false); onArchive(account); }}
            disabled={archiving}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--text-sub)" }}
          >
            <Archive size={14} />
            Archivar
          </button>
        </div>
      )}
    </div>
  );
}
