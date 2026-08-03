"use client";

import { MaskedAmount } from "@/components/shared/MaskedAmount";

interface Props {
  /**
   * `dineroAAsignar` — on-budget cash not reserved by any category. The same
   * figure /budget shows, deliberately: it is one quantity, framed there as a
   * chore ("assign this") and here as an opportunity ("you can save this").
   */
  amount: number;
  /**
   * Cash actually reachable from the primary account right now: its balance
   * net of what is owed on the other on-budget accounts. `null` when no
   * account is marked primary.
   *
   * This does NOT feed `amount` — it qualifies it. `amount` answers "how much
   * is unclaimed", this answers "how much of that can I move today". The two
   * differ whenever on-budget money sits outside the primary account, which is
   * exactly what a single primary-scoped figure got wrong (CONVENTIONS.md
   * 2026-08-02).
   */
  liquidCash: number | null;
  primaryAccountName: string | null;
  /** Non-primary on-budget accounts holding cash, for the shortfall hint. */
  otherFundedAccounts: string[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function AvailableToSaveKPI({
  amount,
  liquidCash,
  primaryAccountName,
  otherFundedAccounts,
}: Props) {
  const isPositive = amount >= 0;
  const color = isPositive ? "var(--color-positive)" : "var(--color-negative)";
  const bgColor = isPositive ? "rgba(34,197,94,0.08)" : "rgba(248,113,113,0.08)";

  // Rounding noise from summed transaction amounts would otherwise trip the
  // shortfall warning over a one-cent gap.
  const covered = liquidCash !== null && liquidCash >= amount - 0.01;
  const showLiquidity =
    isPositive && amount > 0.01 && primaryAccountName !== null && liquidCash !== null;

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
        {isPositive
          ? "Dinero en tus cuentas On-Budget que aún no está reservado en ninguna categoría."
          : "Tienes más reservado en categorías que dinero en tus cuentas On-Budget. Ajusta lo asignado antes de mover nada a ahorro."}
      </p>

      {/* Where that money physically is. Only worth saying when there is
          something to move and an account to move it from. */}
      {showLiquidity && (
        <p
          className="text-[10px] mt-1.5 leading-relaxed"
          style={{ color: covered ? "var(--text-sub)" : "var(--color-warning)" }}
        >
          {covered ? (
            <>
              ✓ Están líquidos en <strong>{primaryAccountName}</strong>.
            </>
          ) : (
            <>
              ⚠ Solo <MaskedAmount value={formatCurrency(Math.max(0, liquidCash))} /> está en{" "}
              <strong>{primaryAccountName}</strong>, ya descontando lo que debes en tarjetas
              {otherFundedAccounts.length > 0 && <> — el resto está en {joinNames(otherFundedAccounts)}</>}.
            </>
          )}
        </p>
      )}

      {primaryAccountName === null && (
        <p className="text-[10px] mt-1.5" style={{ color: "var(--text-dim)" }}>
          Marca tu cuenta principal (editar cuenta) para ver cuánto de esto tienes a la mano.
        </p>
      )}
    </div>
  );
}
