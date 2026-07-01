"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useFeedbackStore } from "@/stores/feedback.store";
import { useShakeDetection } from "@/hooks/use-shake-detection";
import { useErrorCapture } from "@/hooks/use-error-capture";
import { FeedbackSheet } from "./FeedbackSheet";

export function FeedbackProvider() {
  const { open } = useFeedbackStore();
  const isCapturingRef = useRef(false);
  const [iosToastVisible, setIosToastVisible] = useState(false);

  useErrorCapture();

  const captureAndOpen = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      open(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("[Feedback] html2canvas failed:", err);
      open(null);
    } finally {
      isCapturingRef.current = false;
    }
  }, [open]);

  const { needsIOSPermission, requestIOSPermission } = useShakeDetection(captureAndOpen);

  // Show iOS permission toast once
  useEffect(() => {
    if (needsIOSPermission) {
      setIosToastVisible(true);
    }
  }, [needsIOSPermission]);

  // Desktop keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        captureAndOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [captureAndOpen]);

  async function handleIOSToastClick() {
    setIosToastVisible(false);
    await requestIOSPermission();
  }

  return (
    <>
      <FeedbackSheet />

      {/* iOS permission toast */}
      {iosToastVisible && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg cursor-pointer select-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-card)",
            boxShadow: "var(--a-shadow)",
            maxWidth: "calc(100vw - 40px)",
          }}
          onClick={handleIOSToastClick}
          role="button"
          aria-label="Habilitar shake para reportar feedback"
        >
          <span className="text-xl">📳</span>
          <div>
            <p
              className="text-sm font-semibold leading-tight"
              style={{ color: "var(--text-main)" }}
            >
              Agita para reportar un bug
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Toca aquí para habilitar
            </p>
          </div>
          <button
            className="ml-auto p-1"
            style={{ color: "var(--text-dim)" }}
            onClick={(e) => {
              e.stopPropagation();
              setIosToastVisible(false);
              localStorage.setItem("shake-permission", "dismissed");
            }}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
