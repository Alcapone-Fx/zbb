"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/stores/privacy.store";

export function PrivacyToggle() {
  const hidden = usePrivacyStore((s) => s.hidden);
  const toggle = usePrivacyStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      aria-label={hidden ? "Mostrar montos" : "Ocultar montos"}
      className="fixed z-30 flex items-center justify-center w-10 h-10 transition-transform hover:scale-[1.07] active:scale-95"
      style={{
        top: "calc(12px + env(safe-area-inset-top, 0px))",
        right: "max(16px, env(safe-area-inset-right, 16px))",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-card)",
        borderRadius: "14px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.24)",
      }}
    >
      {hidden ? (
        <EyeOff size={18} style={{ color: "var(--text-sub)" }} />
      ) : (
        <Eye size={18} style={{ color: "var(--text-sub)" }} />
      )}
    </button>
  );
}
