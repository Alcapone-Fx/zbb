"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function FAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Agregar transacción"
        className="fixed z-30 flex items-center justify-center w-14 h-14 transition-transform hover:scale-[1.07] active:scale-95"
        style={{
          bottom: "82px",
          right: "20px",
          background: "var(--ac)",
          borderRadius: "18px",
          boxShadow: "0 4px 28px var(--a-shadow)",
        }}
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </button>

      {/* Stub modal — Quick Add form built in M05 */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full animate-[slideUp_0.32s_cubic-bezier(0.34,1.2,0.64,1)]"
            style={{
              background: "var(--bg-surface)",
              borderRadius: "24px 24px 0 0",
              padding: "0 20px 40px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-4">
              <div
                className="w-9 h-1"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: "2px",
                }}
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-extrabold"
                style={{ color: "var(--text-main)" }}
              >
                Nueva Transacción
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-xl"
                style={{ color: "var(--text-dim)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Placeholder — Quick Add form is implemented in M05 */}
            <div
              className="flex items-center justify-center h-40 rounded-2xl text-sm font-semibold"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--text-dim)",
                border: "1px dashed var(--aB)",
              }}
            >
              Formulario disponible en M05
            </div>
          </div>
        </div>
      )}
    </>
  );
}
