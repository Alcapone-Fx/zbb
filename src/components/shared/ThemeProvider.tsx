"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme.store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, accent } = useThemeStore();

  useEffect(() => {
    const html = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = mode === "dark" || (mode === "system" && prefersDark);
    html.classList.toggle("dark", isDark);
    html.dataset.accent = accent;
  }, [mode, accent]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return <>{children}</>;
}
