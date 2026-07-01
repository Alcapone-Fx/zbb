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
  { href: "/settings",  label: "Config",      Icon: Settings2  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center px-1"
      style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: "calc(4rem + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-[3px] pt-2 pb-1 px-1 text-[10px] font-bold uppercase tracking-[0.5px] transition-colors",
              active ? "text-[var(--ac)]" : "text-[var(--text-dim)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
