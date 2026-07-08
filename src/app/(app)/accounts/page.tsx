"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { AccountWithBalance, AccountsResponse } from "@/types/account";
import { AccountGroup } from "@/components/accounts/AccountGroup";
import { CreateAccountModal } from "@/components/accounts/CreateAccountModal";
import { EditAccountModal } from "@/components/accounts/EditAccountModal";
import { ReconciliationSheet } from "@/components/accounts/ReconciliationSheet";
import { MaskedAmount } from "@/components/shared/MaskedAmount";
import { useRefreshStore } from "@/stores/refresh.store";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function computeMiniStats(data: AccountsResponse) {
  const onBudgetTotal = data.on_budget.reduce((s, a) =>
    a.type === "liability" ? s - a.balance : s + a.balance, 0);

  const activos = data.off_budget.reduce((s, a) =>
    a.type !== "liability" ? s + a.balance : s, 0);

  const deudasOnBudget = data.on_budget.reduce((s, a) =>
    a.balance < 0 ? s + a.balance : s, 0);
  const deudasOffBudget = data.off_budget.reduce((s, a) =>
    a.type === "liability" ? s - a.balance : s, 0);
  const deudas = deudasOnBudget + deudasOffBudget;

  return { onBudgetTotal, activos, deudas };
}

export default function AccountsPage() {
  const transactionsVersion = useRefreshStore((s) => s.transactionsVersion);
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTrackingOnly, setCreateTrackingOnly] = useState(false);

  const [editTarget, setEditTarget] = useState<AccountWithBalance | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<AccountWithBalance | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (!res.ok) {
        setApiError(json.error ?? "Error al cargar cuentas");
      } else {
        setData(json);
        setApiError(null);
      }
    } catch {
      setApiError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAccounts();
  }, [fetchAccounts, transactionsVersion]);

  async function archiveAccount(account: AccountWithBalance): Promise<void> {
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error ?? "Error al archivar");
    }
    await fetchAccounts();
  }

  const netWorth = data?.net_worth ?? 0;
  const netWorthNegative = netWorth < 0;
  const stats = data ? computeMiniStats(data) : null;

  if (loading) {
    return (
      <div
        className="px-5 pt-14 pb-6 min-h-screen"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <div className="flex flex-col gap-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-2xl animate-pulse"
              style={{ background: "var(--bg-surface)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <h1
          className="font-extrabold"
          style={{ fontSize: "22px", letterSpacing: "-0.5px", color: "var(--text-main)" }}
        >
          Cuentas
        </h1>

        {/* Patrimonio Neto */}
        <div className="mt-3">
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              color: "var(--text-dim)",
              textTransform: "uppercase",
            }}
          >
            Patrimonio Neto
          </p>
          <p
            className="tabular-nums"
            style={{
              fontSize: "40px",
              fontWeight: 800,
              letterSpacing: "-2px",
              lineHeight: 1.1,
              marginTop: "2px",
            }}
          >
            <MaskedAmount
              value={formatCurrency(netWorth)}
              style={{ color: netWorthNegative ? "var(--color-negative)" : "var(--text-main)" }}
            />
          </p>
        </div>

        {/* Mini-stats row */}
        {stats && (
          <div
            className="flex mt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", gap: "0" }}
          >
            <div className="flex-1">
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                On-Budget
              </p>
              <p className="tabular-nums" style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                <MaskedAmount value={formatCurrency(stats.onBudgetTotal)} />
              </p>
            </div>
            <div
              className="flex-1"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: "14px" }}
            >
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                Activos
              </p>
              <p className="tabular-nums" style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-positive)", marginTop: "2px" }}>
                <MaskedAmount value={formatCurrency(stats.activos)} />
              </p>
            </div>
            <div
              className="flex-1"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: "14px" }}
            >
              <p style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-dim)", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                Deudas
              </p>
              <p className="tabular-nums" style={{ fontSize: "13px", fontWeight: 700, marginTop: "2px" }}>
                <MaskedAmount
                  value={formatCurrency(stats.deudas)}
                  style={{ color: stats.deudas < 0 ? "var(--color-negative)" : "var(--text-dim)" }}
                />
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {apiError && (
          <div
            className="mt-3 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
          >
            {apiError}
          </div>
        )}
      </div>

      {/* ── Account groups ── */}
      <div className="pt-4 pb-4">
        <AccountGroup
          title="On-Budget"
          totalLabel={
            <MaskedAmount
              value={formatCurrency(
                (data?.on_budget ?? []).reduce((s, a) =>
                  a.type === "liability" ? s - a.balance : s + a.balance, 0)
              )}
            />
          }
          accounts={data?.on_budget ?? []}
          onEdit={setEditTarget}
        />

        <AccountGroup
          title="Off-Budget / Patrimonio"
          totalLabel={
            <MaskedAmount
              value={formatCurrency(
                (data?.off_budget ?? []).reduce((s, a) =>
                  a.type === "liability" ? s - a.balance : s + a.balance, 0)
              )}
            />
          }
          accounts={data?.off_budget ?? []}
          isOffBudget
          onEdit={setEditTarget}
        />
      </div>

      {/* ── Footer actions ── */}
      <div className="px-5 pb-8 flex flex-col gap-3">
        <Link
          href="/transactions"
          className="flex items-center justify-center w-full py-3.5 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-card)",
            color: "var(--text-sub)",
          }}
        >
          Ver historial de transacciones →
        </Link>

        <button
          onClick={() => {
            setCreateTrackingOnly(false);
            setCreateOpen(true);
          }}
          className="flex items-center justify-center w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity hover:opacity-80"
          style={{
            background: "var(--ab)",
            border: "1px dashed var(--aB)",
            color: "var(--ac)",
          }}
        >
          + Agregar cuenta
        </button>
      </div>

      <CreateAccountModal
        open={createOpen}
        defaultTrackingOnly={createTrackingOnly}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchAccounts}
      />

      <EditAccountModal
        account={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchAccounts}
        onArchive={editTarget ? () => archiveAccount(editTarget) : undefined}
        onReconcile={editTarget ? () => {
          const t = editTarget;
          setEditTarget(null);
          setReconcileTarget(t);
        } : undefined}
      />

      {/* Reconciliation bottom sheet */}
      {reconcileTarget && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setReconcileTarget(null)}
        >
          <div
            className="w-full max-h-[92dvh] overflow-y-auto animate-[slideUp_0.32s_cubic-bezier(0.34,1.2,0.64,1)]"
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-xl font-extrabold"
                  style={{ color: "var(--text-main)" }}
                >
                  Conciliar cuenta
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-sub)" }}>
                  {reconcileTarget.name}
                </p>
              </div>
              <button
                onClick={() => setReconcileTarget(null)}
                aria-label="Cerrar"
                className="w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ color: "var(--text-dim)" }}
              >
                <X size={20} />
              </button>
            </div>
            <ReconciliationSheet
              account={reconcileTarget}
              onClose={() => setReconcileTarget(null)}
              onDone={fetchAccounts}
            />
          </div>
        </div>
      )}
    </>
  );
}
