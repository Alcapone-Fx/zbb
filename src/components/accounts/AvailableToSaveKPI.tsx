"use client";

import { MaskedAmount } from "@/components/shared/MaskedAmount";

interface Props {
  amount: number;
  primaryAccountName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function AvailableToSaveKPI({ amount, primaryAccountName }: Props) {
  const isPositive = amount >= 0;
  const color = isPositive ? "var(--color-positive)" : "var(--color-negative)";
  const bgColor = isPositive ? "rgba(34,197,94,0.08)" : "rgba(248,113,113,0.08)";

  return (
    <div className="mx-5 mb-3 px-4 py-3 rounded-2xl" style={{ background: bgColor }}>
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
        style={{ color: "var(--text-dim)" }}
      >
        Disponible para ahorrar/invertir
      </p>
      <p className="text-2xl font-extrabold tabular-nums tracking-tight">
        <MaskedAmount value={formatCurrency(amount)} style={{ color }} />
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--text-sub)" }}>
        Ingresos de {primaryAccountName} este mes menos todo lo asignado a tus categorías. Es una
        proyección: puede variar si gastas más de lo previsto.
      </p>
    </div>
  );
}
