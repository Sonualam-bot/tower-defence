import { useEffect, useRef } from 'react';
import type { GameEngine } from '../engine/GameEngine';

/** Hosts the canvas, keeps it sized to its container and forwards pointer input. */
export function GameCanvas({ engine }: { engine: GameEngine }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    engine.attach(canvas);
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      engine.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      engine.detach();
    };
  }, [engine]);

  const local = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top] as const;
  };

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
        onPointerMove={(e) => engine.pointerMove(...local(e))}
        onPointerLeave={() => engine.pointerLeave()}
        onPointerDown={(e) => {
          const [x, y] = local(e);
          engine.pointerMove(x, y);
          engine.pointerDown(x, y, e.shiftKey);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          engine.deselect();
        }}
      />
    </div>
  );
}
