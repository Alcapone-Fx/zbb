"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { FAB } from "@/components/shared/FAB";
import { PrivacyToggle } from "@/components/shared/PrivacyToggle";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { PendingTransactionsPanel } from "@/components/shared/PendingTransactionsPanel";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import type { ScheduledTransaction } from "@/types/scheduled-transaction";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<ScheduledTransaction[]>([]);

  // Check for due scheduled transactions on mount
  useEffect(() => {
    fetch("/api/scheduled-transactions/pending")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const items: ScheduledTransaction[] = json.data ?? [];
        if (items.length > 0) {
          setPendingItems(items);
          setPendingOpen(true);
        }
      })
      .catch(() => {
        // Non-fatal — just don't open the panel
      });
  }, []);

  function handleAllDone() {
    setPendingOpen(false);
    setPendingItems([]);
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main area — shifts right on desktop to make room for sidebar */}
      <div className="flex flex-col min-h-dvh lg:pl-60">
        {/* Offline banner spans full width */}
        <OfflineBanner />

        {/* Scrollable content — bottom padding clears the mobile nav */}
        <main
          className="flex-1 overflow-y-auto lg:!pb-0"
          style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden at lg+ */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

      {/* FAB — always visible */}
      <FAB />

      {/* Privacy toggle — hide/show financial amounts */}
      <PrivacyToggle />

      {/* Pending transactions panel */}
      <PendingTransactionsPanel
        isOpen={pendingOpen}
        items={pendingItems}
        onClose={() => setPendingOpen(false)}
        onAllDone={handleAllDone}
      />

      {/* Feedback widget — shake to report / Ctrl+Shift+F on desktop */}
      <FeedbackProvider />
    </>
  );
}
