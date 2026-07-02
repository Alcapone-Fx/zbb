function Bone({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ background: "var(--bg-elevated)", ...style }}
    />
  );
}

function TxRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Bone style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
      <div className="flex-1">
        <Bone style={{ width: "50%", height: 13, marginBottom: 6 }} />
        <Bone style={{ width: "35%", height: 11 }} />
      </div>
      <Bone style={{ width: 56, height: 15 }} />
    </div>
  );
}

function DateGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mb-1">
      {/* Date separator */}
      <div className="px-4 py-2">
        <Bone style={{ width: 80, height: 11 }} />
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid var(--border-card)" }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <TxRow key={i} />
        ))}
      </div>
    </div>
  );
}

export default function TransactionsLoading() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <Bone style={{ width: 150, height: 22, marginBottom: 8 }} />
        {/* Date filter */}
        <div className="flex gap-2 mt-3">
          <Bone style={{ width: 100, height: 32, borderRadius: 20 }} />
          <Bone style={{ width: 100, height: 32, borderRadius: 20 }} />
        </div>
      </div>

      {/* Filter row */}
      <div className="px-4 py-3 flex gap-2">
        <Bone style={{ flex: 1, height: 36, borderRadius: 12 }} />
        <Bone style={{ width: 36, height: 36, borderRadius: 12 }} />
      </div>

      <div className="px-4 pb-8">
        <DateGroup rows={3} />
        <DateGroup rows={2} />
        <DateGroup rows={4} />
      </div>
    </div>
  );
}
