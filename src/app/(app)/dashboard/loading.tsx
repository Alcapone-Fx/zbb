function Bone({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ background: "var(--bg-elevated)", ...style }}
    />
  );
}

function StatCard() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}
    >
      <Bone style={{ width: "55%", height: 11, marginBottom: 10 }} />
      <Bone style={{ width: "70%", height: 22 }} />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <Bone style={{ width: 120, height: 22, marginBottom: 8 }} />
        <Bone style={{ width: 180, height: 13 }} />
        {/* Period tabs */}
        <div className="flex gap-2 mt-4">
          {[80, 70, 90].map((w, i) => (
            <Bone key={i} style={{ width: w, height: 32, borderRadius: 20 }} />
          ))}
        </div>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-3">
        {/* Chart area */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border-card)" }}
        >
          <Bone style={{ width: "100%", height: 220, borderRadius: 16 }} />
        </div>

        {/* Net worth card */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}
        >
          <Bone style={{ width: "40%", height: 11, marginBottom: 10 }} />
          <Bone style={{ width: "60%", height: 28, marginBottom: 6 }} />
          <Bone style={{ width: "45%", height: 11 }} />
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard />
          <StatCard />
          <StatCard />
          <StatCard />
        </div>
      </div>
    </div>
  );
}
