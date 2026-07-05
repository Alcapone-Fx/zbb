"use client";

import {
  Building2,
  PiggyBank,
  CreditCard,
  Banknote,
  TrendingUp,
  Landmark,
  Pencil,
} from "lucide-react";
import type { AccountWithBalance, AccountType } from "@/types/account";
import { MaskedAmount } from "@/components/shared/MaskedAmount";

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
}

export function AccountCard({ account, isOffBudget, onEdit }: Props) {
  const Icon = TYPE_ICONS[account.type];

  const isNegative =
    account.type === "liability" ? account.balance > 0 : account.balance < 0;

  const displayBalance =
    account.type === "liability" ? -account.balance : account.balance;

  const iconBg = isOffBudget
    ? "rgba(52,211,153,0.08)"
    : "var(--ab)";
  const iconColor = isOffBudget ? "#34D399" : "var(--ac)";

  const rowPadding = isOffBudget
    ? "6px 0"
    : "6px 12px";

  const borderBottom = isOffBudget
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(255,255,255,0.05)";

  return (
    <div
      className="flex items-center gap-3"
      style={{ padding: rowPadding, borderBottom, minHeight: "56px" }}
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

      <span className="text-sm font-bold tabular-nums shrink-0">
        <MaskedAmount
          value={formatCurrency(displayBalance)}
          style={{ color: isNegative ? "var(--color-negative)" : "var(--color-positive)" }}
        />
      </span>

      <button
        onClick={() => onEdit(account)}
        aria-label={`Editar cuenta ${account.name}`}
        className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl transition-colors hover:bg-white/10"
        style={{ color: "var(--text-dim)" }}
      >
        <Pencil size={15} />
      </button>
    </div>
  );
}
