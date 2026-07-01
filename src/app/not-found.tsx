import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: "var(--bg-app)", color: "var(--text-main)" }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: "var(--bg-elevated)" }}
      >
        🔍
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold">Página no encontrada</h1>
        <p className="text-base max-w-xs" style={{ color: "var(--text-sub)" }}>
          La página que buscas no existe.
        </p>
      </div>
      <Link
        href="/budget"
        className="px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-80 active:opacity-70"
        style={{ background: "var(--ac)" }}
      >
        Ir al presupuesto
      </Link>
    </div>
  );
}
