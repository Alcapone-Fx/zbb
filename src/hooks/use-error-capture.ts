"use client";

import { useEffect } from "react";

export interface CapturedError {
  type: "console" | "runtime" | "promise";
  message: string;
  stack?: string;
  timestamp: string;
}

const MAX_ERRORS = 20;
// Module-level ring buffer — intentionally outside React state to avoid re-renders
const capturedErrors: CapturedError[] = [];

function addError(error: CapturedError) {
  capturedErrors.push(error);
  if (capturedErrors.length > MAX_ERRORS) {
    capturedErrors.shift();
  }
}

export function getCapturedErrors(): CapturedError[] {
  return [...capturedErrors];
}

export function useErrorCapture() {
  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args);
      const errObj = args.find((a) => a instanceof Error) as Error | undefined;
      addError({
        type: "console",
        message: args
          .map((a) => (a instanceof Error ? a.message : String(a)))
          .join(" "),
        stack: errObj?.stack,
        timestamp: new Date().toISOString(),
      });
    };

    const handleError = (event: ErrorEvent) => {
      addError({
        type: "runtime",
        message: `${event.message} (${event.filename}:${event.lineno}:${event.colno})`,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      addError({
        type: "promise",
        message:
          reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection"),
        stack: reason instanceof Error ? reason.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);
}
