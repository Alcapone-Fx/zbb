"use client";

import { useRef, useState } from "react";
import { X, Pencil, Eraser, Undo2, Trash2, Bug, Lightbulb, ExternalLink } from "lucide-react";
import { useFeedbackStore } from "@/stores/feedback.store";
import { getCapturedErrors } from "@/hooks/use-error-capture";
import { AnnotationCanvas, type AnnotationCanvasHandle, type DrawMode } from "./AnnotationCanvas";

type Step = "annotate" | "form" | "success";
type FeedbackType = "bug" | "feature";

const COLORS = [
  { value: "#FF3B30", label: "Rojo" },
  { value: "#FFD60A", label: "Amarillo" },
  { value: "#0A84FF", label: "Azul" },
] as const;

export function FeedbackSheet() {
  const { isOpen, screenshot, close } = useFeedbackStore();

  const [step, setStep] = useState<Step>("annotate");
  const [drawMode, setDrawMode] = useState<DrawMode>("pen");
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [strokeCount, setStrokeCount] = useState(0);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<AnnotationCanvasHandle>(null);

  function handleClose() {
    close();
    // Reset state after animation
    setTimeout(() => {
      setStep("annotate");
      setDrawMode("pen");
      setColor(COLORS[0].value);
      setStrokeCount(0);
      setFeedbackType("bug");
      setTitle("");
      setDescription("");
      setSubmitting(false);
      setIssueUrl(null);
      setError(null);
    }, 300);
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      setError("El título y la descripción son requeridos.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const screenshotBase64 = canvasRef.current?.getCompositeImage() ?? screenshot ?? undefined;
    const capturedErrors = getCapturedErrors();

    const isPWA =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          title: title.trim(),
          description: description.trim(),
          screenshotBase64,
          pathname: window.location.pathname,
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          pwaMode: isPWA,
          capturedErrors,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al enviar el feedback.");
      }

      const json = await res.json();
      setIssueUrl(json.issueUrl);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative w-full animate-[slideUp_0.28s_cubic-bezier(0.34,1.1,0.64,1)]"
        style={{
          background: "var(--bg-surface)",
          borderRadius: "24px 24px 0 0",
          maxHeight: "94dvh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)" }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          {step === "form" ? (
            <button
              onClick={() => setStep("annotate")}
              className="text-sm font-semibold flex items-center gap-1"
              style={{ color: "var(--ac)" }}
            >
              ← Volver
            </button>
          ) : (
            <h2
              className="text-[17px] font-extrabold tracking-[-0.3px]"
              style={{ color: "var(--text-main)" }}
            >
              {step === "success" ? "" : "Reportar feedback"}
            </h2>
          )}
          {step === "form" && (
            <h2
              className="text-[17px] font-extrabold tracking-[-0.3px]"
              style={{ color: "var(--text-main)" }}
            >
              Reportar feedback
            </h2>
          )}
          <button
            onClick={handleClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-xl transition-colors"
            style={{ color: "var(--text-dim)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Step: annotate ── */}
        {step === "annotate" && (
          <div>
            {screenshot ? (
              <>
                <div className="px-5 pb-2">
                  <p
                    className="text-xs mb-2"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Dibuja para marcar el área del problema (opcional)
                  </p>
                  <div
                    className="rounded-xl overflow-hidden border"
                    style={{
                      borderColor: "var(--border-card)",
                      maxHeight: "48dvh",
                      overflowY: "hidden",
                    }}
                  >
                    <AnnotationCanvas
                      ref={canvasRef}
                      screenshot={screenshot}
                      mode={drawMode}
                      color={color}
                      onStrokesChange={setStrokeCount}
                    />
                  </div>
                </div>

                {/* Annotation toolbar */}
                <div
                  className="mx-5 mb-4 rounded-2xl flex items-center justify-between px-3 py-2"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  {/* Mode buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setDrawMode("pen")}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background:
                          drawMode === "pen"
                            ? "rgba(255,255,255,0.12)"
                            : "transparent",
                        color:
                          drawMode === "pen"
                            ? "var(--text-main)"
                            : "var(--text-dim)",
                      }}
                      aria-label="Lápiz"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDrawMode("eraser")}
                      className="p-2 rounded-lg transition-colors"
                      style={{
                        background:
                          drawMode === "eraser"
                            ? "rgba(255,255,255,0.12)"
                            : "transparent",
                        color:
                          drawMode === "eraser"
                            ? "var(--text-main)"
                            : "var(--text-dim)",
                      }}
                      aria-label="Borrador"
                    >
                      <Eraser size={16} />
                    </button>
                  </div>

                  {/* Color swatches */}
                  <div className="flex items-center gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          setColor(c.value);
                          setDrawMode("pen");
                        }}
                        aria-label={c.label}
                        className="rounded-full transition-transform"
                        style={{
                          width: 20,
                          height: 20,
                          background: c.value,
                          outline:
                            color === c.value && drawMode === "pen"
                              ? "2px solid white"
                              : "2px solid transparent",
                          outlineOffset: 2,
                          transform:
                            color === c.value && drawMode === "pen"
                              ? "scale(1.15)"
                              : "scale(1)",
                        }}
                      />
                    ))}
                  </div>

                  {/* Undo / Clear */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => canvasRef.current?.undo()}
                      disabled={strokeCount === 0}
                      className="p-2 rounded-lg transition-opacity"
                      style={{
                        color: "var(--text-dim)",
                        opacity: strokeCount === 0 ? 0.35 : 1,
                      }}
                      aria-label="Deshacer"
                    >
                      <Undo2 size={16} />
                    </button>
                    <button
                      onClick={() => canvasRef.current?.clear()}
                      disabled={strokeCount === 0}
                      className="p-2 rounded-lg transition-opacity"
                      style={{
                        color: "var(--text-dim)",
                        opacity: strokeCount === 0 ? 0.35 : 1,
                      }}
                      aria-label="Limpiar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div
                className="mx-5 mb-4 rounded-2xl py-8 flex flex-col items-center gap-2"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-dim)",
                }}
              >
                <span className="text-3xl">📷</span>
                <p className="text-sm">Screenshot no disponible</p>
              </div>
            )}

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setStep("form")}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-opacity"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-sub)",
                }}
              >
                {strokeCount > 0 ? "Sin anotación" : "Saltar"}
              </button>
              <button
                onClick={() => setStep("form")}
                className="flex-[2] py-3 rounded-2xl text-sm font-bold transition-opacity"
                style={{ background: "var(--ac)", color: "#fff" }}
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: form ── */}
        {step === "form" && (
          <div className="px-5 pb-5 flex flex-col gap-4">
            {/* Type selector */}
            <div>
              <p
                className="text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ color: "var(--text-dim)" }}
              >
                Tipo
              </p>
              <div className="flex gap-3">
                {(
                  [
                    { value: "bug", label: "Bug", Icon: Bug },
                    { value: "feature", label: "Sugerencia", Icon: Lightbulb },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setFeedbackType(value)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background:
                        feedbackType === value
                          ? "var(--ac)"
                          : "var(--bg-elevated)",
                      color:
                        feedbackType === value
                          ? "#fff"
                          : "var(--text-sub)",
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                style={{ color: "var(--text-dim)" }}
              >
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Describe brevemente el problema o idea"
                maxLength={80}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                className="text-xs font-semibold uppercase tracking-wide block mb-1.5"
                style={{ color: "var(--text-dim)" }}
              >
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pasos para reproducir, qué esperabas que pasara, qué pasó en su lugar..."
                maxLength={2000}
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-card)",
                }}
              />
              <p
                className="text-right text-[11px] mt-1"
                style={{ color: "var(--text-dim)" }}
              >
                {description.length}/2000
              </p>
            </div>

            {error && (
              <p
                className="text-sm rounded-xl px-3 py-2"
                style={{ background: "rgba(255,59,48,0.12)", color: "#FF3B30" }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !description.trim()}
              className="w-full py-3.5 rounded-2xl text-sm font-bold transition-opacity"
              style={{
                background: "var(--ac)",
                color: "#fff",
                opacity:
                  submitting || !title.trim() || !description.trim() ? 0.55 : 1,
              }}
            >
              {submitting ? "Enviando…" : "Enviar feedback"}
            </button>
          </div>
        )}

        {/* ── Step: success ── */}
        {step === "success" && (
          <div className="px-5 pb-8 flex flex-col items-center gap-4 text-center">
            <span className="text-6xl mt-4">✅</span>
            <div>
              <p
                className="text-[18px] font-extrabold tracking-[-0.3px]"
                style={{ color: "var(--text-main)" }}
              >
                ¡Gracias por tu feedback!
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>
                El issue fue creado en GitHub.
              </p>
            </div>
            {issueUrl && (
              <a
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold"
                style={{ background: "var(--bg-elevated)", color: "var(--ac)" }}
              >
                Ver en GitHub <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={handleClose}
              className="text-sm"
              style={{ color: "var(--text-dim)" }}
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
