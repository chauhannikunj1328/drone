"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AlertDef } from "@/lib/data";

// Simple geometric status icons (no maker icons). Shapes carry meaning without colour.
export type IconKind = "info" | "warning" | "critical" | "ready" | "notready" | "offline" | "locked" | "flying" | "returning" | "landed" | "pending" | "pass" | "connecting" | "limited";
export function Icon({ kind, size = 16 }: { kind: IconKind; size?: number }) {
  const s = size, c = s / 2, sw = 1.6;
  const common = { width: s, height: s, viewBox: `0 0 ${s} ${s}`, "aria-hidden": true, className: `ic ic-${kind}` } as const;
  switch (kind) {
    case "info": return <svg {...common}><circle cx={c} cy={c} r={c - 1} fill="none" stroke="currentColor" strokeWidth={sw} /><text x={c} y={c + 4} textAnchor="middle" fontSize={s * 0.6} fontWeight={700} fill="currentColor">i</text></svg>;
    case "warning": case "notready": return <svg {...common}><polygon points={`${c},1.5 ${s - 1.5},${s - 1.5} 1.5,${s - 1.5}`} fill="none" stroke="currentColor" strokeWidth={sw} /><text x={c} y={s - 3.5} textAnchor="middle" fontSize={s * 0.55} fontWeight={700} fill="currentColor">!</text></svg>;
    case "critical": { const k = s * 0.29; const p = [[k,1],[s-k,1],[s-1,k],[s-1,s-k],[s-k,s-1],[k,s-1],[1,s-k],[1,k]].map((q) => q.join(",")).join(" ");
      return <svg {...common}><polygon points={p} fill="currentColor" /><text x={c} y={c + 4} textAnchor="middle" fontSize={s * 0.6} fontWeight={800} fill="var(--grey-0)" style={{ mixBlendMode: "difference" }}>!</text></svg>; }
    case "ready": case "pass": return <svg {...common}><circle cx={c} cy={c} r={c - 1} fill="currentColor" /><path d={`M${s*0.27} ${c} l${s*0.16} ${s*0.16} l${s*0.3} -${s*0.32}`} stroke="var(--grey-0)" strokeWidth={2} fill="none" style={{ mixBlendMode: "difference" }} /></svg>;
    case "offline": return <svg {...common}><circle cx={c} cy={c} r={c - 1} fill="none" stroke="currentColor" strokeWidth={sw} strokeDasharray="2 2" /><line x1={2} y1={s - 2} x2={s - 2} y2={2} stroke="currentColor" strokeWidth={sw} /></svg>;
    case "pending": return <svg {...common}><circle cx={c} cy={c} r={c - 1} fill="none" stroke="currentColor" strokeWidth={sw} /></svg>;
    case "connecting": return <svg {...common}><circle cx={c} cy={c} r={c - 1} fill="none" stroke="currentColor" strokeWidth={sw} strokeDasharray="2 3" /></svg>;
    case "locked": case "limited": return <svg {...common}><rect x={s*0.2} y={s*0.45} width={s*0.6} height={s*0.45} fill="currentColor" /><path d={`M${s*0.32} ${s*0.45} v-${s*0.13} a${s*0.18} ${s*0.18} 0 0 1 ${s*0.36} 0 v${s*0.13}`} fill="none" stroke="currentColor" strokeWidth={sw} /></svg>;
    case "flying": return <svg {...common}><path d={`M${c} 1 L${s - 2} ${s - 2} L${c} ${s * 0.7} L2 ${s - 2} Z`} fill="currentColor" /></svg>;
    case "returning": return <svg {...common}><path d={`M${s*0.75} ${s*0.3} A${s*0.33} ${s*0.33} 0 1 0 ${s*0.8} ${s*0.65}`} fill="none" stroke="currentColor" strokeWidth={2} /><path d={`M${s*0.55} ${s*0.15} L${s*0.8} ${s*0.3} L${s*0.55} ${s*0.45}`} fill="currentColor" /></svg>;
    case "landed": return <svg {...common}><path d={`M${c} 2 v${s*0.6}`} stroke="currentColor" strokeWidth={2} /><path d={`M${s*0.25} ${s*0.5} L${c} ${s*0.8} L${s*0.75} ${s*0.5}`} fill="none" stroke="currentColor" strokeWidth={2} /><line x1={2} y1={s-1.5} x2={s-2} y2={s-1.5} stroke="currentColor" strokeWidth={sw} /></svg>;
  }
}

const capture = (e: React.PointerEvent<HTMLElement>) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } };

export function Mock({ label = "Mock" }: { label?: string }) { return <span className="mock">{label}</span>; }

export function AlertCard({ a, onAct, extra }: { a: AlertDef; onAct: () => void; extra?: ReactNode }) {
  return (
    <div className={`alert ${a.level}`} role={a.level === "critical" ? "alert" : "status"}>
      <span style={{ flex: "none", display: "grid", placeItems: "center" }}><Icon kind={a.level} size={20} /></span>
      <div style={{ minWidth: 0 }}>
        <div className="t-label" style={{ fontWeight: 700 }}>{a.title}<span className="t-micro" style={{ marginLeft: 6, opacity: .6, textTransform: "uppercase" }}>{a.level}</span></div>
        <div className="t-cap" style={{ opacity: .8 }}>{a.message}</div>
        {extra}
      </div>
      <button className="act" data-hit onClick={onAct}>{a.button}</button>
    </div>
  );
}

// Hold-to-confirm with a visible ring (1.0 s mock). Long press / right click opens an accessible confirm instead.
export function HoldButton({ label, holdLabel, activeLabel, onDone, className = "ctl safety", style, disabled, ms = 1000, size, icon, wide }: {
  label: string; holdLabel?: string; activeLabel?: string; onDone: () => void; className?: string; style?: CSSProperties; disabled?: boolean; ms?: number; size: number; icon?: ReactNode;
  // wide: fills its box (style width) and shows hold progress as a bar instead of a ring
  wide?: boolean;
}) {
  const [p, setP] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const start = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const stop = () => { start.current = null; if (raf.current) cancelAnimationFrame(raf.current); setP(0); };
  const loop = () => {
    if (start.current === null) return;
    const v = Math.min(1, (performance.now() - start.current) / ms); setP(v);
    if (v >= 1) { stop(); onDone(); return; }
    raf.current = requestAnimationFrame(loop);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  const r = size / 2 + 3, circ = 2 * Math.PI * r;
  return (
    <>
      <button data-hit className={className} style={wide ? { width: size, height: size, ...style, overflow: "hidden" } : { ...style, width: size, height: size }} disabled={disabled} aria-label={label}
        onPointerDown={(e) => { if (disabled) return; capture(e); start.current = performance.now(); loop(); }}
        onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop}
        onContextMenu={(e) => { e.preventDefault(); if (!disabled) setConfirm(true); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setConfirm(true); } }}>
        {wide ? <span style={{ position: "absolute", left: 0, bottom: 0, height: 4, width: `${p * 100}%`, background: "currentColor" }} /> : <svg className="ring" width={size + 12} height={size + 12} viewBox={`0 0 ${size + 12} ${size + 12}`}>
          <circle cx={(size + 12) / 2} cy={(size + 12) / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"
            strokeDasharray={`${circ * p} ${circ}`} transform={`rotate(-90 ${(size + 12) / 2} ${(size + 12) / 2})`} />
        </svg>}
        {icon}
        <span>{activeLabel ?? label}</span>
        {!activeLabel && <span style={{ fontSize: 9, fontWeight: 500, opacity: .7, letterSpacing: ".02em" }}>{p > 0 ? "Keep holding" : holdLabel ?? "Hold"}</span>}
      </button>
      {confirm && (
        <div className="sheet-back" style={{ alignItems: "center", position: "fixed" }} onClick={() => setConfirm(false)}>
          <div className="sheet center" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Confirm ${label}`}>
            <div className="t-title">{label}?</div>
            <p className="t-body muted">Confirm instead of holding (accessible alternative).</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setConfirm(false); onDone(); }}>{label}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Floating-style stick pad: drag inside the pad. Values -1..1.
export function Stick({ rect, label, locked, onMove }: { rect: { x: number; y: number; w: number; h: number }; label: string; locked?: boolean; onMove: (x: number, y: number) => void }) {
  const [k, setK] = useState({ x: 0, y: 0 });
  const set = (x: number, y: number) => { setK({ x, y }); onMove(x, y); };
  const handle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return;
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * 2 - 1, y = ((e.clientY - b.top) / b.height) * 2 - 1;
    const m = Math.hypot(x, y); const f = m > 1 ? 1 / m : 1;
    set(+(x * f).toFixed(2), +(y * f).toFixed(2));
  };
  return (
    <div data-hit className={`stick${locked ? " locked" : ""}`} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      role="slider" aria-label={label} aria-valuenow={k.y}
      onPointerDown={(e) => { capture(e); handle(e); }}
      onPointerMove={(e) => { if (e.buttons) handle(e); }} onPointerUp={() => set(0, 0)} onPointerCancel={() => set(0, 0)}>
      <svg width={rect.w} height={rect.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden>
        <g stroke="rgba(255,255,255,.45)" strokeWidth="1.5" strokeLinecap="round">
          <line x1={rect.w / 2} y1={8} x2={rect.w / 2} y2={18} /><line x1={rect.w / 2} y1={rect.h - 18} x2={rect.w / 2} y2={rect.h - 8} />
          <line x1={8} y1={rect.h / 2} x2={18} y2={rect.h / 2} /><line x1={rect.w - 18} y1={rect.h / 2} x2={rect.w - 8} y2={rect.h / 2} />
        </g>
        <circle cx={rect.w / 2} cy={rect.h / 2} r={rect.w * 0.3} fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="2 5" />
      </svg>
      <div className="knob" style={{ transform: `translate(${k.x * 42}px, ${k.y * 42}px)` }} />
      <div className="t-micro hud-text" style={{ position: "absolute", bottom: -20, width: "100%", textAlign: "center", color: "rgba(255,255,255,.75)" }}>{locked ? "Locked" : label}</div>
    </div>
  );
}

// Vertical slider (gimbal, zoom, A1 Flight Slider). Value 0..1 from bottom; spring returns to rest if springTo set.
export function VSlider({ rect, label, value, onChange, springTo, locked }: { rect: { x: number; y: number; w: number; h: number }; label: string; value: number; onChange: (v: number) => void; springTo?: number; locked?: boolean }) {
  const handle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return;
    const b = e.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, 1 - (e.clientY - b.top) / b.height)));
  };
  return (
    <div data-hit className={`vslider${locked ? " locked" : ""}`} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundImage: locked ? "var(--hatch-dark)" : undefined }}
      role="slider" aria-label={label} aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => { capture(e); handle(e); }} onPointerMove={(e) => { if (e.buttons) handle(e); }}
      onPointerUp={() => { if (springTo !== undefined) onChange(springTo); }}>
      <div className="thumb" style={{ top: (1 - value) * (rect.h - 36) + 3 }} />
      <div className="t-cap" style={{ position: "absolute", top: "50%", left: rect.w + 2, writingMode: "vertical-rl", transform: "translateY(-50%)", whiteSpace: "nowrap", color: "var(--grey-300)", fontSize: 10, pointerEvents: "none" }}>{label}</div>
    </div>
  );
}
