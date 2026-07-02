function Bone({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ background: "var(--bg-elevated)", ...style }}
    />
  );
}

function CategoryRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Bone style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
      <Bone style={{ flex: 1, height: 13 }} />
      <Bone style={{ width: 24, height: 24, borderRadius: 8 }} />
    </div>
  );
}

function GroupBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-3"
      style={{ border: "1px solid var(--border-card)" }}
    >
      {/* Group header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: "var(--bg-elevated)" }}
      >
        <Bone style={{ width: 20, height: 20, borderRadius: 6 }} />
        <Bone style={{ flex: 1, height: 14 }} />
        <Bone style={{ width: 28, height: 28, borderRadius: 8 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <CategoryRow key={i} />
      ))}
    </div>
  );
}

export default function CategoriesLoading() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <Bone style={{ width: 180, height: 22, marginBottom: 8 }} />
        <Bone style={{ width: 220, height: 13 }} />
      </div>

      <div className="px-4 pb-8 mt-3">
        <GroupBlock rows={3} />
        <GroupBlock rows={4} />
        <GroupBlock rows={2} />
      </div>
    </div>
  );
}
