export default function SettingsPage() {
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
        Configuración
      </h1>
      <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
        Perfil, tema y metas de presupuesto — implementado en M09
      </p>
    </div>
  );
}
