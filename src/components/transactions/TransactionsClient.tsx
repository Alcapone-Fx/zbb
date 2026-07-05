"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import type { TransactionWithDetails } from "@/types/transaction";
import type { AccountWithBalance, AccountsResponse } from "@/types/account";
import type { CategoryGroupWithCategories } from "@/types/category";
import { TransactionRow, formatCurrency } from "./TransactionRow";
import { EditTransactionSheet } from "./EditTransactionSheet";
import { ScheduledTransactionsTab } from "./ScheduledTransactionsTab";
import { AppSelect } from "@/components/ui/AppSelect";
import { MaskedAmount } from "@/components/shared/MaskedAmount";

interface TransactionGroup {
  category_id: string | null;
  category_name: string | null;
  category_group_name: string | null;
  transactions: TransactionWithDetails[];
  subtotal: number;
}

function groupByCategory(txs: TransactionWithDetails[]): TransactionGroup[] {
  const map = new Map<string, TransactionGroup>();
  for (const tx of txs) {
    const key = tx.category_id ?? "__none__";
    if (!map.has(key)) {
      map.set(key, {
        category_id: tx.category_id,
        category_name: tx.category_name,
        category_group_name: tx.category_group_name,
        transactions: [],
        subtotal: 0,
      });
    }
    const g = map.get(key)!;
    g.transactions.push(tx);
    g.subtotal += tx.amount;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.category_name && b.category_name) return 1;
    if (a.category_name && !b.category_name) return -1;
    return (a.category_name ?? "").localeCompare(b.category_name ?? "");
  });
}

function buildExportUrl(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v);
  }
  return `/api/transactions/export?${q.toString()}`;
}

export function TransactionsClient() {
  const [activeTab, setActiveTab] = useState<"historial" | "programadas">("historial");
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroupWithCategories[]>([]);

  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const [filterType, setFilterType] = useState<string>("");
  const [filterAccount, setFilterAccount] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<TransactionWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Initial data load — fetch transactions, accounts and category groups in parallel
  useEffect(() => {
    const now = new Date();
    const initFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const initTo = now.toISOString().split("T")[0];

    async function load() {
      try {
        const [txRes, accRes, grpRes] = await Promise.all([
          fetch(`/api/transactions?date_from=${initFrom}&date_to=${initTo}`),
          fetch("/api/accounts"),
          fetch("/api/categories/groups"),
        ]);

        const [txJson, accJson, grpJson] = (await Promise.all([
          txRes.json(),
          accRes.json(),
          grpRes.json(),
        ])) as [
          { data?: TransactionWithDetails[]; error?: string },
          AccountsResponse & { error?: string },
          { data?: CategoryGroupWithCategories[]; error?: string },
        ];

        if (!txRes.ok) {
          setApiError(txJson.error ?? "Error al cargar movimientos");
        } else {
          setTransactions(txJson.data ?? []);
        }

        if (accRes.ok) {
          setAccounts([...(accJson.on_budget ?? []), ...(accJson.off_budget ?? [])]);
        }

        if (grpRes.ok) {
          setCategoryGroups(grpJson.data ?? []);
        }
      } catch {
        setApiError("Error de conexión");
      } finally {
        setInitialLoading(false);
      }
    }

    void load();
  }, []);

  const fetchTransactions = useCallback(
    async (params?: {
      from?: string;
      to?: string;
      type?: string;
      account?: string;
      category?: string;
    }) => {
      setLoading(true);
      setApiError(null);
      const from = params?.from ?? dateFrom;
      const to = params?.to ?? dateTo;
      const type = params?.type ?? filterType;
      const account = params?.account ?? filterAccount;
      const category = params?.category ?? filterCategory;

      const q = new URLSearchParams({ date_from: from, date_to: to });
      if (type) q.set("type", type);
      if (account) q.set("account_id", account);
      if (category) q.set("category_id", category);

      try {
        const res = await fetch(`/api/transactions?${q.toString()}`);
        const json = (await res.json()) as { data?: TransactionWithDetails[]; error?: string };
        if (!res.ok) {
          setApiError(json.error ?? "Error al cargar movimientos");
        } else {
          setTransactions(json.data ?? []);
        }
      } catch {
        setApiError("Error de conexión");
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, filterType, filterAccount, filterCategory]
  );

  function applyFilters() {
    fetchTransactions({
      from: dateFrom,
      to: dateTo,
      type: filterType,
      account: filterAccount,
      category: filterCategory,
    });
  }

  async function handleDelete(tx: TransactionWithDetails) {
    if (
      !window.confirm(
        tx.transfer_pair_id
          ? "¿Eliminar esta transferencia? Se eliminarán ambas partes."
          : "¿Eliminar esta transacción?"
      )
    )
      return;

    setDeleteError(null);
    setDeletingId(tx.id);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setDeleteError(json.error ?? "Error al eliminar");
      } else {
        setTransactions((prev) =>
          prev.filter(
            (t) =>
              t.id !== tx.id &&
              t.id !== tx.transfer_pair_id &&
              t.transfer_pair_id !== tx.id
          )
        );
      }
    } catch {
      setDeleteError("Error de conexión");
    } finally {
      setDeletingId(null);
    }
  }

  const txGroups = useMemo(() => groupByCategory(transactions), [transactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expenses += tx.amount;
    }
    return { income, expenses, balance: income + expenses };
  }, [transactions]);

  const allCategories = useMemo(
    () =>
      categoryGroups
        .filter((g) => !g.is_system)
        .flatMap((g) =>
          g.categories.filter((c) => !c.is_system && !c.is_archived)
        ),
    [categoryGroups]
  );

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const exportUrl = buildExportUrl({
    date_from: dateFrom,
    date_to: dateTo,
    type: filterType || undefined,
    account_id: filterAccount || undefined,
    category_id: filterCategory || undefined,
  });

  if (initialLoading) {
    return (
      <div
        className="px-5 pt-14 pb-6 min-h-screen"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <p className="mt-6 text-sm" style={{ color: "var(--text-dim)" }}>
          Cargando...
        </p>
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
        <div className="flex items-start justify-between">
          <h1
            className="text-[22px] font-extrabold tracking-[-0.5px]"
            style={{ color: "var(--text-main)" }}
          >
            Movimientos
          </h1>
          {activeTab === "historial" && (
            <a
              href={exportUrl}
              download
              aria-label="Exportar CSV"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-70"
              style={{ background: "var(--bg-elevated)", color: "var(--text-sub)" }}
            >
              <Download size={14} />
              CSV
            </a>
          )}
        </div>

        {/* Period KPIs — only shown in historial tab */}
        {activeTab === "historial" && (
          <div className="flex gap-4 mt-4">
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Ingresos
              </p>
              <p className="text-lg font-extrabold tabular-nums">
                <MaskedAmount value={formatCurrency(totals.income)} style={{ color: "var(--color-positive)" }} />
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Gastos
              </p>
              <p className="text-lg font-extrabold tabular-nums">
                <MaskedAmount value={formatCurrency(totals.expenses)} style={{ color: "var(--color-negative)" }} />
              </p>
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-dim)" }}
              >
                Balance
              </p>
              <p className="text-lg font-extrabold tabular-nums">
                <MaskedAmount
                  value={formatCurrency(totals.balance)}
                  style={{
                    color:
                      totals.balance >= 0
                        ? "var(--color-positive)"
                        : "var(--color-negative)",
                  }}
                />
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-card)" }}
      >
        {(["historial", "programadas"] as const).map((tab) => {
          const labels = { historial: "Historial", programadas: "Programadas" };
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: activeTab === tab ? "var(--ab)" : "transparent",
                color: activeTab === tab ? "var(--ac)" : "var(--text-sub)",
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Programadas tab */}
      {activeTab === "programadas" && (
        <ScheduledTransactionsTab
          initialAccounts={accounts}
          initialGroups={categoryGroups}
        />
      )}

      {/* Filter bar + list — historial only */}
      {activeTab === "historial" && (
      <>
      <div
        className="px-5 py-3"
        style={{ borderBottom: "1px solid var(--border-card)" }}
      >
        {/* Date range */}
        <div className="flex gap-2 items-center mb-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-xs font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          />
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>
            —
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-xs font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          />
        </div>

        {/* More filters toggle */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold mb-2"
          style={{ color: "var(--text-sub)" }}
        >
          {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Más filtros
        </button>

        {filtersOpen && (
          <div className="flex flex-col gap-2 mb-2">
            {/* Type filter */}
            <AppSelect
              value={filterType}
              onChange={setFilterType}
              placeholder="Todos los tipos"
              options={[
                { value: 'expense', label: 'Gastos' },
                { value: 'income', label: 'Ingresos' },
                { value: 'transfer', label: 'Transferencias' },
                { value: 'adjustment', label: 'Ajustes' },
              ]}
            />

            {/* Account filter */}
            <AppSelect
              value={filterAccount}
              onChange={setFilterAccount}
              placeholder="Todas las cuentas"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />

            {/* Category filter */}
            <AppSelect
              value={filterCategory}
              onChange={setFilterCategory}
              placeholder="Todas las categorías"
              options={allCategories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        )}

        <button
          type="button"
          onClick={applyFilters}
          disabled={loading}
          className="w-full py-2 rounded-xl text-xs font-bold transition-opacity disabled:opacity-50"
          style={{ background: "var(--ac)", color: "#fff" }}
        >
          {loading ? "Cargando..." : "Aplicar filtros"}
        </button>
      </div>

      {/* Error states */}
      {(apiError || deleteError) && (
        <div
          className="mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
        >
          {apiError ?? deleteError}
        </div>
      )}

      {/* Transaction list grouped by category */}
      <div className="pb-24">
        {txGroups.length === 0 && !loading && (
          <div
            className="flex flex-col items-center justify-center py-16 px-8 text-center"
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-dim)" }}
            >
              Sin movimientos para este período
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-sub)" }}>
              Usa el botón + para registrar una transacción
            </p>
          </div>
        )}

        {txGroups.map((group) => {
          const key = group.category_id ?? "__none__";
          const collapsed = collapsedGroups.has(key);
          const isNegative = group.subtotal < 0;

          return (
            <div key={key}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between px-5 py-2.5"
                style={{
                  background: "var(--bg-elevated)",
                  borderBottom: "1px solid var(--border-card)",
                }}
              >
                <div className="text-left">
                  <p
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {group.category_group_name
                      ? `${group.category_group_name} · `
                      : ""}
                    {group.category_name ?? "Sin categoría"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">
                    <MaskedAmount
                      value={formatCurrency(group.subtotal)}
                      style={{
                        color: isNegative
                          ? "var(--color-negative)"
                          : "var(--color-positive)",
                      }}
                    />
                  </span>
                  {collapsed ? (
                    <ChevronDown size={14} style={{ color: "var(--text-dim)" }} />
                  ) : (
                    <ChevronUp size={14} style={{ color: "var(--text-dim)" }} />
                  )}
                </div>
              </button>

              {/* Rows */}
              {!collapsed && (
                <div>
                  {group.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        opacity: deletingId === tx.id ? 0.4 : 1,
                        transition: "opacity 0.2s",
                      }}
                    >
                      <TransactionRow
                        tx={tx}
                        onEdit={setEditTarget}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit sheet */}
      {editTarget && (
        <EditTransactionSheet
          tx={editTarget}
          groups={categoryGroups}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchTransactions();
          }}
        />
      )}
      </>
      )}
    </>
  );
}
