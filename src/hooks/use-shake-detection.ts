"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const SHAKE_THRESHOLD = 15;
const DEBOUNCE_MS = 2000;

interface UseShakeDetectionReturn {
  needsIOSPermission: boolean;
  requestIOSPermission: () => Promise<boolean>;
}

export function useShakeDetection(
  onShake: () => void
): UseShakeDetectionReturn {
  const lastShakeRef = useRef(0);
  const lastAccelRef = useRef({ x: 0, y: 0, z: 0 });
  const [needsIOSPermission, setNeedsIOSPermission] = useState(false);
  const listenerActiveRef = useRef(false);

  const handleMotion = useCallback(
    (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x ?? 0;
      const y = acc.y ?? 0;
      const z = acc.z ?? 0;
      const delta =
        Math.abs(x - lastAccelRef.current.x) +
        Math.abs(y - lastAccelRef.current.y) +
        Math.abs(z - lastAccelRef.current.z);
      lastAccelRef.current = { x, y, z };

      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current > DEBOUNCE_MS) {
          lastShakeRef.current = now;
          onShake();
        }
      }
    },
    [onShake]
  );

  const startListening = useCallback(() => {
    if (listenerActiveRef.current) return;
    window.addEventListener("devicemotion", handleMotion);
    listenerActiveRef.current = true;
  }, [handleMotion]);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window))
      return;

    const MotionEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    if (typeof MotionEvent.requestPermission === "function") {
      const saved = localStorage.getItem("shake-permission");
      if (saved === "granted") {
        startListening();
      } else {
        setNeedsIOSPermission(true);
      }
    } else {
      startListening();
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      listenerActiveRef.current = false;
    };
  }, [handleMotion, startListening]);

  const requestIOSPermission = useCallback(async (): Promise<boolean> => {
    const MotionEvent = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };
    if (typeof MotionEvent.requestPermission !== "function") return true;
    try {
      const result = await MotionEvent.requestPermission();
      if (result === "granted") {
        localStorage.setItem("shake-permission", "granted");
        setNeedsIOSPermission(false);
        startListening();
        return true;
      }
    } catch {
      // User denied or error
    }
    return false;
  }, [startListening]);

  return { needsIOSPermission, requestIOSPermission };
}
