"use client";

import { useEffect, useRef } from "react";

export default function BackgroundGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const CELL = 40;
    const RADIUS = 140;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (event) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    });
    window.addEventListener("mouseleave", () => {
      mouseRef.current = { x: -9999, y: -9999 };
    });

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      const cols = Math.ceil(W / CELL) + 1;
      const rows = Math.ceil(H / CELL) + 1;

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const x = c * CELL;
          const y = r * CELL;
          const centerX = x + CELL / 2;
          const centerY = y + CELL / 2;
          const dx = centerX - mx;
          const dy = centerY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / RADIUS);

          if (influence > 0) {
            const fillAlpha = influence * influence * 0.18;
            ctx.fillStyle = `rgba(255,255,255,${fillAlpha})`;
            ctx.fillRect(x, y, CELL, CELL);
          }
        }
      }

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;

      for (let c = 0; c <= cols; c += 1) {
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, H);
      }
      for (let r = 0; r <= rows; r += 1) {
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(W, r * CELL);
      }
      ctx.stroke();

      if (mx > 0) {
        const startCol = Math.floor((mx - RADIUS) / CELL);
        const endCol = Math.ceil((mx + RADIUS) / CELL);
        const startRow = Math.floor((my - RADIUS) / CELL);
        const endRow = Math.ceil((my + RADIUS) / CELL);

        for (let r = startRow; r <= endRow; r += 1) {
          for (let c = startCol; c <= endCol; c += 1) {
            const x = c * CELL;
            const y = r * CELL;
            const cx2 = x + CELL / 2;
            const cy2 = y + CELL / 2;
            const dist = Math.sqrt((cx2 - mx) ** 2 + (cy2 - my) ** 2);
            const inf = Math.max(0, 1 - dist / RADIUS);

            if (inf > 0) {
              ctx.strokeStyle = `rgba(255,255,255,${0.15 + inf * 0.65})`;
              ctx.lineWidth = 0.5 + inf * 1.0;
              ctx.strokeRect(x, y, CELL, CELL);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,0,0,0.55) 0%, transparent 100%)",
        }}
      />
    </>
  );
}
