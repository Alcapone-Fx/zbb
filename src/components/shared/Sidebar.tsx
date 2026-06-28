"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Wallet, BarChart2, Sparkles, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/budget",    label: "Presupuesto", Icon: LayoutGrid },
  { href: "/accounts",  label: "Cuentas",     Icon: Wallet     },
  { href: "/dashboard", label: "Dashboard",   Icon: BarChart2  },
  { href: "/helpers",   label: "Helpers",     Icon: Sparkles   },
  { href: "/settings",  label: "Configuración", Icon: Settings2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 w-60 z-20 flex flex-col pt-8 pb-6 px-3"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
      aria-label="Menú lateral"
    >
      {/* Logo */}
      <div className="px-3 mb-8">
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ color: "var(--ac)" }}
        >
          Balancr
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                active
                  ? "text-[var(--ac)] bg-[var(--ab)]"
                  : "text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/[0.04]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
