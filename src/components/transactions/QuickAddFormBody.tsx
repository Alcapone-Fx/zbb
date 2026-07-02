"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { AccountWithBalance } from "@/types/account";
import type { CategoryGroupWithCategories } from "@/types/category";
import type { CreateTransactionInput } from "@/types/transaction";

interface Props {
  onClose: () => void;
}

type TxType = "expense" | "income" | "transfer";

const TYPE_LABELS: Record<TxType, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
};

export function QuickAddFormBody({ onClose }: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [groups, setGroups] = useState<CategoryGroupWithCategories[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [type, setType] = useState<TxType>("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState("");
  const [transferToAccountId, setTransferToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [payee, setPayee] = useState("");
  const [payeeSuggestions, setPayeeSuggestions] = useState<
    { payee: string; category_id: string | null }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [memo, setMemo] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [nextMonth, setNextMonth] = useState(false);
  const [makeRecurring, setMakeRecurring] = useState(false);
  const [recurFrequency, setRecurFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [recurStartDate, setRecurStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const payeeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories/groups").then((r) => r.json()),
    ])
      .then(([accsJson, groupsJson]) => {
        const on = accsJson.on_budget ?? [];
        const off = accsJson.off_budget ?? [];
        const allAccs: AccountWithBalance[] = [...on, ...off];
        setAccounts(allAccs);
        if (allAccs.length > 0) setAccountId(allAccs[0].id);
        setGroups(groupsJson.data ?? []);
      })
      .catch(() => {
        setError("No se pudieron cargar cuentas y categorías");
      })
      .finally(() => setLoadingData(false));
  }, []);

  function onPayeeChange(value: string) {
    setPayee(value);
    setShowSuggestions(false);
    if (payeeDebounceRef.current) clearTimeout(payeeDebounceRef.current);
    if (value.trim().length < 2) {
      setPayeeSuggestions([]);
      return;
    }
    payeeDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/transactions/payees?q=${encodeURIComponent(value.trim())}`
        );
        const json = await res.json();
        setPayeeSuggestions(json.data ?? []);
        setShowSuggestions((json.data ?? []).length > 0);
      } catch {
        // Autocomplete failure is non-fatal
      }
    }, 300);
  }

  function selectSuggestion(suggestion: { payee: string; category_id: string | null }) {
    setPayee(suggestion.payee);
    if (suggestion.category_id) setCategoryId(suggestion.category_id);
    setPayeeSuggestions([]);
    setShowSuggestions(false);
  }

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isOnBudget = selectedAccount ? !selectedAccount.is_tracking_only : true;
  const userGroups = groups.filter((g) => !g.is_system);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("El monto debe ser mayor que cero");
      return;
    }

    if (!accountId) {
      setError("Selecciona una cuenta");
      return;
    }

    setSubmitting(true);

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (makeRecurring && type !== "transfer") {
        // Create a scheduled transaction template instead of an immediate transaction
        const scheduledBody = {
          account_id: accountId,
          category_id: categoryId || null,
          type,
          amount: parsedAmount,
          payee: payee.trim() || null,
          memo: memo.trim() || null,
          frequency: recurFrequency,
          start_date: recurStartDate,
        };
        const res = await fetch("/api/scheduled-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scheduledBody),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Error al guardar");
          return;
        }
        router.refresh();
        onClose();
        return;
      }

      const body: CreateTransactionInput = {
        date,
        type,
        account_id: accountId,
        amount: parsedAmount,
        category_id: categoryId || null,
        payee: payee.trim() || null,
        memo: memo.trim() || null,
        tags,
        next_month: type === "income" ? nextMonth : false,
        ...(type === "transfer"
          ? { transfer_to_account_id: transferToAccountId }
          : {}),
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Error al guardar");
      } else {
        router.refresh();
        onClose();
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 rounded-xl animate-pulse"
            style={{ background: "var(--bg-elevated)" }}
          />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* 1. Type selector */}
      <div className="flex gap-2">
        {(["expense", "income", "transfer"] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategoryId("");
            }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: type === t ? "var(--ab)" : "var(--bg-elevated)",
              color: type === t ? "var(--ac)" : "var(--text-sub)",
              border: type === t ? "1px solid var(--aB)" : "1px solid transparent",
            }}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 2. Amount — large display, no label */}
      <div className="flex items-center justify-center gap-2 py-4">
        <span className="text-3xl font-bold" style={{ color: "var(--text-dim)" }}>$</span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          autoFocus
          required
          className="text-5xl font-extrabold tabular-nums text-center outline-none bg-transparent w-48"
          style={{ color: amount ? "var(--text-main)" : "var(--text-dim)" }}
        />
      </div>

      {/* 3. Date + Account (2-column grid) / Transfer: date row then Origen+Destino */}
      {type !== "transfer" ? (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          />
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setCategoryId("");
            }}
            required
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                Origen
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                Destino
              </label>
              <select
                value={transferToAccountId}
                onChange={(e) => setTransferToAccountId(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <option value="">Seleccionar</option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* 4. Category — expense: required; income: optional label + not required; transfer: separate block */}
      {type !== "transfer" && isOnBudget && (
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            {type === "income" ? "Categoría (opcional)" : "Categoría"}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required={type === "expense" && isOnBudget}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          >
            <option value="">
              {type === "income" ? "Dinero a Asignar" : "Seleccionar categoría"}
            </option>
            {userGroups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.categories
                  .filter((c) => !c.is_system && !c.is_archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* Transfer + on-budget category */}
      {type === "transfer" && (
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-dim)" }}
          >
            Categoría (si alguna cuenta está en presupuesto)
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-main)",
              border: "1px solid var(--border-card)",
            }}
          >
            <option value="">Sin categoría</option>
            {userGroups.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {g.categories
                  .filter((c) => !c.is_system && !c.is_archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* 5. Payee with autocomplete — no label, placeholder varies by type */}
      <div className="relative">
        <input
          type="text"
          value={payee}
          onChange={(e) => onPayeeChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={
            type === "expense"
              ? "¿Dónde gastaste?"
              : type === "income"
              ? "¿De dónde vino?"
              : "Descripción"
          }
          maxLength={255}
          autoComplete="nope"
          autoCorrect="off"
          className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-main)",
            border: "1px solid var(--border-card)",
          }}
        />
        {showSuggestions && payeeSuggestions.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 z-10 rounded-xl overflow-hidden mt-1"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-card)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}
          >
            {payeeSuggestions.map((s) => (
              <button
                key={s.payee}
                type="button"
                onMouseDown={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--text-main)" }}
              >
                {s.payee}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Opciones avanzadas — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 w-full py-2 text-xs font-semibold"
          style={{ color: "var(--text-dim)" }}
        >
          <ChevronDown
            size={14}
            className={showAdvanced ? "rotate-180" : ""}
            style={{ transition: "transform 0.2s" }}
          />
          Opciones avanzadas
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-3 pt-1">
            {/* Nota (memo) */}
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Nota opcional..."
              maxLength={1000}
              autoComplete="nope"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />

            {/* Tags */}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="etiquetas separadas por coma"
              className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-main)",
                border: "1px solid var(--border-card)",
              }}
            />

            {/* Asignar al mes siguiente (income only) */}
            {type === "income" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    Asignar al mes siguiente
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                    El ingreso se cuenta en el presupuesto del mes próximo
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={nextMonth}
                  onClick={() => setNextMonth((v) => !v)}
                  className="relative w-12 h-6 rounded-full transition-colors shrink-0"
                  style={{
                    background: nextMonth ? "var(--ac)" : "var(--bg-elevated)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      transform: nextMonth ? "translateX(24px)" : "translateX(0)",
                    }}
                  />
                </button>
              </div>
            )}

            {/* Hacer recurrente (not available for transfers) */}
            {type !== "transfer" && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-card)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      Hacer recurrente
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                      Programa esta transacción para que se repita
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={makeRecurring}
                    onClick={() => setMakeRecurring((v) => !v)}
                    className="relative w-12 h-6 rounded-full transition-colors shrink-0"
                    style={{
                      background: makeRecurring ? "var(--ac)" : "var(--bg-elevated)",
                      border: "1px solid var(--border-card)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
                      style={{
                        background: "#fff",
                        transform: makeRecurring ? "translateX(24px)" : "translateX(0)",
                      }}
                    />
                  </button>
                </div>

                {makeRecurring && (
                  <div
                    className="flex flex-col gap-3 mt-4 pt-4"
                    style={{ borderTop: "1px solid var(--border-card)" }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Frecuencia
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["daily", "weekly", "monthly", "yearly"] as const).map((f) => {
                          const labels = {
                            daily: "Diaria",
                            weekly: "Semanal",
                            monthly: "Mensual",
                            yearly: "Anual",
                          };
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setRecurFrequency(f)}
                              className="py-2 rounded-xl text-xs font-bold transition-all"
                              style={{
                                background: recurFrequency === f ? "var(--ab)" : "var(--bg-elevated)",
                                color: recurFrequency === f ? "var(--ac)" : "var(--text-sub)",
                                border:
                                  recurFrequency === f
                                    ? "1px solid var(--aB)"
                                    : "1px solid transparent",
                              }}
                            >
                              {labels[f]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--text-dim)" }}
                      >
                        Fecha de inicio
                      </label>
                      <input
                        type="date"
                        value={recurStartDate}
                        onChange={(e) => setRecurStartDate(e.target.value)}
                        required={makeRecurring}
                        className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                        style={{
                          background: "var(--bg-elevated)",
                          color: "var(--text-main)",
                          border: "1px solid var(--border-card)",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p
          className="text-sm rounded-xl px-4 py-3"
          style={{ background: "rgba(248,113,113,0.1)", color: "var(--color-negative)" }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity disabled:opacity-50"
        style={{ background: "var(--ac)", color: "#fff" }}
      >
        {submitting
          ? "Guardando..."
          : makeRecurring && type !== "transfer"
          ? "Guardar recurrente"
          : "Guardar transacción"}
      </button>
    </form>
  );
}
