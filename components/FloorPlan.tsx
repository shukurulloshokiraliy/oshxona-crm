"use client";

import { useRef, useState } from "react";
import type { CafeTable } from "@/lib/types";

export interface TableInfo {
  kind: "free" | "busy" | "waiting";
  sub?: string;
}

export function planSize(tables: CafeTable[]) {
  const W = Math.max(480, ...tables.map((t) => t.x + t.w)) + 30;
  const H = Math.max(260, ...tables.map((t) => t.y + t.h)) + 30;
  return { W, H };
}

/**
 * Stollar sxemasi. Koordinatalar foizga o'tkaziladi, shuning uchun
 * har qanday ekran kengligiga moslashadi.
 */
export default function FloorPlan({
  tables,
  info,
  onPick,
  editable = false,
  selectedId,
  onMove,
}: {
  tables: CafeTable[];
  info?: Record<string, TableInfo>;
  onPick?: (t: CafeTable) => void;
  editable?: boolean;
  selectedId?: string | null;
  onMove?: (id: string, x: number, y: number) => void;
}) {
  const { W, H } = planSize(tables);
  const ref = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const start = useRef<{ px: number; py: number; ox: number; oy: number; moved: boolean } | null>(null);

  function down(e: React.PointerEvent, t: CafeTable) {
    if (!editable) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, ox: t.x, oy: t.y, moved: false };
    setDrag({ id: t.id, x: t.x, y: t.y });
    onPick?.(t);
  }

  function move(e: React.PointerEvent, t: CafeTable) {
    if (!editable || !start.current || !ref.current) return;
    const scale = ref.current.clientWidth / W;
    const dx = (e.clientX - start.current.px) / scale;
    const dy = (e.clientY - start.current.py) / scale;
    if (Math.abs(dx) + Math.abs(dy) > 3) start.current.moved = true;
    const snap = (v: number) => Math.round(v / 10) * 10;
    const nx = Math.max(0, Math.min(W - t.w, snap(start.current.ox + dx)));
    const ny = Math.max(0, Math.min(H - t.h, snap(start.current.oy + dy)));
    setDrag({ id: t.id, x: nx, y: ny });
  }

  function up(t: CafeTable) {
    if (!editable) return;
    if (drag && start.current?.moved) onMove?.(t.id, drag.x, drag.y);
    start.current = null;
    setDrag(null);
  }

  return (
    <div className="plan-wrap">
      <div className="plan" ref={ref} style={{ aspectRatio: `${W} / ${H}` }}>
        {tables.map((t) => {
          const pos = drag && drag.id === t.id ? drag : t;
          const st = info?.[t.id];
          const style = {
            left: `${(pos.x / W) * 100}%`,
            top: `${(pos.y / H) * 100}%`,
            width: `${(t.w / W) * 100}%`,
            height: `${(t.h / H) * 100}%`,
          };
          const cls = [
            "tbl",
            t.shape,
            st && st.kind !== "free" ? st.kind : "",
            editable ? "drag" : "",
            editable && selectedId === t.id ? "sel" : "",
          ]
            .filter(Boolean)
            .join(" ");

          if (editable) {
            return (
              <div
                key={t.id}
                className={cls}
                style={style}
                onPointerDown={(e) => down(e, t)}
                onPointerMove={(e) => move(e, t)}
                onPointerUp={() => up(t)}
                onPointerCancel={() => up(t)}
              >
                <span>{t.name}</span>
              </div>
            );
          }
          return (
            <button
              key={t.id}
              className={cls}
              style={style}
              onClick={() => onPick?.(t)}
              aria-label={`Stol ${t.name}`}
            >
              <span>{t.name}</span>
              {st?.sub ? <span className="sub">{st.sub}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
