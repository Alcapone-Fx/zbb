import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { FAB } from "@/components/shared/FAB";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { PendingTransactionsPanel } from "@/components/shared/PendingTransactionsPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden at lg+ */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

      {/* FAB — always visible */}
      <FAB />

      {/* Pending transactions panel — M06 drives isOpen/onClose */}
      <PendingTransactionsPanel isOpen={false} onClose={() => {}} />
    </>
  );
}
