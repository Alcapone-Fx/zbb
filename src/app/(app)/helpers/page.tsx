export default function HelpersPage() {
  return (
    <div
      className="px-5 pt-14 pb-6"
      style={{
        background: "linear-gradient(180deg, #162240 0%, var(--bg-app) 100%)",
      }}
    >
      <h1
        className="text-[22px] font-extrabold tracking-[-0.5px]"
        style={{ color: "var(--text-main)" }}
      >
        Helpers
      </h1>
      <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
        Herramientas de microplanificación — implementado en M10
      </p>
    </div>
  );
}
