function Bone({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="animate-pulse rounded-xl"
      style={{ background: "var(--bg-elevated)", ...style }}
    />
  );
}

function AccountRow() {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Bone style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
        <div>
          <Bone style={{ width: 110, height: 13, marginBottom: 6 }} />
          <Bone style={{ width: 70, height: 11 }} />
        </div>
      </div>
      <Bone style={{ width: 60, height: 15 }} />
    </div>
  );
}

function AccountGroup({ label, rows = 3 }: { label?: boolean; rows?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-3"
      style={{ border: "1px solid var(--border-card)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--bg-elevated)" }}
      >
        <Bone style={{ width: label ? 120 : 90, height: 12 }} />
        <Bone style={{ width: 70, height: 12 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <AccountRow key={i} />
      ))}
    </div>
  );
}

export default function AccountsLoading() {
  return (
    <div>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{ background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)" }}
      >
        <Bone style={{ width: 100, height: 22, marginBottom: 8 }} />
        {/* Mini stats */}
        <div className="flex gap-3 mt-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1">
              <Bone style={{ width: "60%", height: 10, marginBottom: 6 }} />
              <Bone style={{ width: "80%", height: 16 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8 mt-3">
        <AccountGroup rows={3} />
        <AccountGroup rows={2} />
      </div>
    </div>
  );
}
