"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type DrawMode = "pen" | "eraser";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  mode: DrawMode;
}

export interface AnnotationCanvasHandle {
  getCompositeImage: () => string;
  hasAnnotations: () => boolean;
  undo: () => void;
  clear: () => void;
}

interface Props {
  screenshot: string;
  mode: DrawMode;
  color: string;
  onStrokesChange?: (count: number) => void;
  className?: string;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, Props>(
  ({ screenshot, mode, color, onStrokesChange, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentStrokeRef = useRef<Point[]>([]);
    const isDrawingRef = useRef(false);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [imgSize, setImgSize] = useState({ w: 800, h: 600 });
    // Trigger re-render for undo/clear
    const [, tick] = useState(0);

    const redraw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (imgRef.current) {
        ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      }

      const renderStroke = (points: Point[], stroke: Stroke | { color: string; width: number; mode: DrawMode }) => {
        if (points.length < 2) return;
        ctx.save();
        if (stroke.mode === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.strokeStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.strokeStyle = stroke.color;
        }
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      };

      for (const stroke of strokesRef.current) {
        renderStroke(stroke.points, stroke);
      }

      if (currentStrokeRef.current.length >= 2) {
        renderStroke(currentStrokeRef.current, {
          color,
          width: mode === "eraser" ? 20 : 3,
          mode,
        });
      }
    }, [color, mode]);

    useEffect(() => {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = screenshot;
    }, [screenshot]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
      redraw();
    }, [imgSize, redraw]);

    useEffect(() => {
      redraw();
    }, [redraw]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const getPos = (e: PointerEvent): Point => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left) * (canvas.width / rect.width),
          y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
      };

      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        isDrawingRef.current = true;
        currentStrokeRef.current = [getPos(e)];
        canvas.setPointerCapture(e.pointerId);
      };

      const onMove = (e: PointerEvent) => {
        if (!isDrawingRef.current) return;
        e.preventDefault();
        currentStrokeRef.current.push(getPos(e));
        redraw();
      };

      const onUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (currentStrokeRef.current.length > 1) {
          strokesRef.current.push({
            points: [...currentStrokeRef.current],
            color,
            width: mode === "eraser" ? 20 : 3,
            mode,
          });
          onStrokesChange?.(strokesRef.current.length);
        }
        currentStrokeRef.current = [];
        redraw();
        tick((n) => n + 1);
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      return () => {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
      };
    }, [mode, color, redraw, onStrokesChange]);

    useImperativeHandle(ref, () => ({
      getCompositeImage: () => canvasRef.current?.toDataURL("image/png") ?? "",
      hasAnnotations: () => strokesRef.current.length > 0,
      undo: () => {
        strokesRef.current.pop();
        redraw();
        onStrokesChange?.(strokesRef.current.length);
        tick((n) => n + 1);
      },
      clear: () => {
        strokesRef.current = [];
        currentStrokeRef.current = [];
        redraw();
        onStrokesChange?.(0);
        tick((n) => n + 1);
      },
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          touchAction: "none",
          cursor: mode === "eraser" ? "cell" : "crosshair",
          display: "block",
          width: "100%",
          height: "auto",
        }}
      />
    );
  }
);

AnnotationCanvas.displayName = "AnnotationCanvas";
