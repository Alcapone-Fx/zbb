function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ""}`}
      style={{ background: "var(--bg-elevated)", ...style }}
    />
  );
}

function CategoryRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <Bone style={{ width: "40%", height: 13 }} />
      <div className="flex gap-4">
        <Bone style={{ width: 52, height: 13 }} />
        <Bone style={{ width: 52, height: 13 }} />
      </div>
    </div>
  );
}

function GroupBlock() {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-3"
      style={{ border: "1px solid var(--border-card)" }}
    >
      {/* Group header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "var(--bg-elevated)" }}
      >
        <Bone style={{ width: "35%", height: 13 }} />
        <Bone style={{ width: 60, height: 13 }} />
      </div>
      <CategoryRow />
      <CategoryRow />
      <CategoryRow />
    </div>
  );
}

export default function BudgetLoading() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <Bone style={{ width: 140, height: 22, marginBottom: 10 }} />
        {/* Month nav */}
        <div className="flex items-center gap-3 mt-3">
          <Bone style={{ width: 28, height: 28, borderRadius: 8 }} />
          <Bone style={{ width: 100, height: 16 }} />
          <Bone style={{ width: 28, height: 28, borderRadius: 8 }} />
        </div>
      </div>

      <div className="px-4 pb-8">
        {/* "Dinero a asignar" card */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-card)" }}
        >
          <Bone style={{ width: 130, height: 12, marginBottom: 8 }} />
          <Bone style={{ width: 80, height: 28 }} />
        </div>

        <GroupBlock />
        <GroupBlock />
        <GroupBlock />
      </div>
    </div>
  );
}
