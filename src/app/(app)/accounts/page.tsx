"use client";

import { useState, useEffect, useCallback } from "react";
import type { AccountWithBalance, AccountsResponse } from "@/types/account";
import { AccountGroup } from "@/components/accounts/AccountGroup";
import { CreateAccountModal } from "@/components/accounts/CreateAccountModal";
import { EditAccountModal } from "@/components/accounts/EditAccountModal";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-419", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function groupTotal(accounts: AccountWithBalance[]): number {
  return accounts.reduce((sum, a) => {
    if (a.type === "liability") return sum - a.balance;
    return sum + a.balance;
  }, 0);
}

export default function AccountsPage() {
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createTrackingOnly, setCreateTrackingOnly] = useState(false);

  const [editTarget, setEditTarget] = useState<AccountWithBalance | null>(null);

  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

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
    fetchAccounts();
  }, [fetchAccounts]);

  function openCreateForGroup(trackingOnly: boolean) {
    setCreateTrackingOnly(trackingOnly);
    setArchiveError(null);
    setCreateOpen(true);
  }

  async function handleArchive(account: AccountWithBalance) {
    setArchiveError(null);
    setArchivingId(account.id);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setArchiveError(json.error ?? "Error al archivar");
      } else {
        await fetchAccounts();
      }
    } catch {
      setArchiveError("Error de conexión");
    } finally {
      setArchivingId(null);
    }
  }

  const netWorth = data?.net_worth ?? 0;
  const netWorthNegative = netWorth < 0;

  if (loading) {
    return (
      <div
        className="px-5 pt-14 pb-6 min-h-screen"
        style={{
          background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)",
        }}
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
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5"
        style={{
          background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)",
        }}
      >
        <h1
          className="text-[22px] font-extrabold tracking-[-0.5px]"
          style={{ color: "var(--text-main)" }}
        >
          Cuentas
        </h1>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-dim)" }}>
            Patrimonio Neto
          </p>
          <p
            className="text-3xl font-extrabold tracking-tight mt-0.5"
            style={{ color: netWorthNegative ? "var(--color-negative)" : "var(--color-positive)" }}
          >
            {formatCurrency(netWorth)}
          </p>
        </div>

        {apiError && (
          <div
            className="mt-3 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
          >
            {apiError}
          </div>
        )}

        {archiveError && (
          <div
            className="mt-3 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
          >
            {archiveError}
          </div>
        )}
      </div>

      {/* Account groups */}
      <div className="pt-2 pb-6">
        <AccountGroup
          title="En Presupuesto"
          totalLabel={formatCurrency(groupTotal(data?.on_budget ?? []))}
          accounts={data?.on_budget ?? []}
          archivingId={archivingId}
          onEdit={setEditTarget}
          onArchive={handleArchive}
          onAdd={() => openCreateForGroup(false)}
        />

        <AccountGroup
          title="Seguimiento"
          totalLabel={formatCurrency(groupTotal(data?.off_budget ?? []))}
          accounts={data?.off_budget ?? []}
          archivingId={archivingId}
          onEdit={setEditTarget}
          onArchive={handleArchive}
          onAdd={() => openCreateForGroup(true)}
        />
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
      />
    </>
  );
}
