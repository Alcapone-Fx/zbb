"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-colors text-left"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-card)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(248,113,113,0.12)" }}
      >
        <LogOut size={18} style={{ color: "#F87171" }} />
      </div>
      <span className="text-sm font-semibold" style={{ color: "#F87171" }}>
        {loading ? "Cerrando sesión..." : "Cerrar sesión"}
      </span>
    </button>
  );
}
