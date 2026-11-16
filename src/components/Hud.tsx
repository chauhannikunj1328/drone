"use client";
import { ArrowDownToLine } from "lucide-react";

// Flight HUD overlay in the "Air Dropper" style (Phenomenon Studio, Dribbble): tick ladders on both edges,
// a horizon gauge and a compass gauge, and a diamond marker for the nearest landing spot.
// Purely visual, never takes touches. The same HUD exists in the native app (ios/Skyhand/FlyView.swift).
// Concept only: tilt and heading come from the simulation.

export function TickLadder({ side, height, mark }: { side: "left" | "right"; height: number; mark?: number }) {
  const n = 20, w = 24;
  return (
    <svg width={w} height={height} aria-hidden style={{ display: "block" }}>
      {Array.from({ length: n + 1 }, (_, i) => {
        const y = 1 + (i / n) * (height - 2), long = i % 5 === 0, len = long ? 20 : 11;
        const x1 = side === "left" ? 0 : w - len, x2 = side === "left" ? len : w;
        return <line key={i} x1={x1} x2={x2} y1={y} y2={y} stroke="#fff" strokeOpacity={long ? .85 : .5} strokeWidth="1" />;
      })}
      {mark !== undefined && <rect x={side === "left" ? 0 : w - 24} y={1 + mark * (height - 2) - 1.5} width="24" height="3" rx="1.5" fill="#fff" />}
    </svg>
  );
}

export function HorizonGauge({ tilt, size }: { tilt: number; size: number }) {
  const r = size / 2;
  return (
    <div role="img" aria-label={`Horizon, tilt ${Math.round(tilt)} degrees`} style={{ width: size, height: size, borderRadius: 9999, position: "relative", overflow: "hidden",
      background: "rgba(30,30,32,.5)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)", border: "1px solid rgba(255,255,255,.18)" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0, transform: `rotate(${tilt}deg)` }}>
        {[-3, -2, -1, 1, 2, 3].map((k) => <line key={k} x1={r - 7} x2={r + 7} y1={r + k * (size / 14)} y2={r + k * (size / 14)} stroke="#fff" strokeOpacity=".5" />)}
        <path d={`M2 ${r} H${r - 14} L${r - 8} ${r - 6} L${r - 2} ${r + 6} L${r + 5} ${r - 4} L${r + 10} ${r} H${size - 2}`} fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="0" x2={size} y1={r} y2={r} stroke="#ff453a" strokeWidth="1" />
      </svg>
      <span className="num" style={{ position: "absolute", left: 8, top: r - 7, fontSize: 10, lineHeight: "14px", color: "#fff" }}>{Math.round(tilt)}°</span>
    </div>
  );
}

export function CompassGauge({ heading, size }: { heading: number; size: number }) {
  const r = size / 2, cx = r, cy = r;
  const cone = (a0: number, a1: number, rad: number) => {
    const p = (a: number) => [cx + rad * Math.sin((a * Math.PI) / 180), cy - rad * Math.cos((a * Math.PI) / 180)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${cx} ${cy} L${x0} ${y0} A${rad} ${rad} 0 0 1 ${x1} ${y1} Z`;
  };
  return (
    <div role="img" aria-label={`Heading ${Math.round(heading)} degrees`} style={{ width: size, height: size, borderRadius: 9999, position: "relative", overflow: "hidden",
      background: "rgba(30,30,32,.5)", backdropFilter: "blur(20px) saturate(160%)", WebkitBackdropFilter: "blur(20px) saturate(160%)", border: "1px solid rgba(255,255,255,.18)" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: "absolute", inset: 0 }}>
        <defs><linearGradient id={`cone${size}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d89ff" stopOpacity=".85" /><stop offset="1" stopColor="#7d89ff" stopOpacity="0" /></linearGradient></defs>
        <path d={cone(-25, 25, r - 3)} fill={`url(#cone${size})`} />
        <g transform={`rotate(${-heading} ${cx} ${cy})`}>
          {[["N", 0], ["E", 90], ["S", 180], ["W", 270]].map(([t, a]) => (
            <text key={t as string} x={cx} y={cy - r + 11} textAnchor="middle" fontSize="9" fontWeight="600" fill={t === "N" ? "#ff453a" : "#fff"} transform={`rotate(${a} ${cx} ${cy})`}>{t}</text>
          ))}
        </g>
        <rect x={cx - 3.5} y={cy - 3.5} width="7" height="7" fill="#fff" transform={`rotate(45 ${cx} ${cy})`} />
      </svg>
      <span className="num" style={{ position: "absolute", left: 0, right: 0, top: r + 6, textAlign: "center", fontSize: 10, lineHeight: "14px", color: "#fff" }}>{Math.round(heading)}°</span>
    </div>
  );
}

export function LandingMarker({ dist, name }: { dist: number; name: string }) {
  return (
    <div role="img" aria-label={`Nearest landing spot, ${name}, ${dist} metres`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
      <div style={{ width: 30, height: 30, background: "#fff", transform: "rotate(45deg)", display: "grid", placeItems: "center", borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,.35)" }}>
        <span style={{ transform: "rotate(-45deg)", color: "var(--live, #4f5bd5)", display: "grid" }}><ArrowDownToLine size={14} strokeWidth={2.4} /></span>
      </div>
      <span className="t-cap hud-text num" style={{ color: "#fff", whiteSpace: "nowrap", marginTop: 4 }}>Land · {dist} m</span>
    </div>
  );
}

export interface HudProps {
  w: number; h: number;            // size of the video area
  heading: number; tilt: number;   // degrees
  landing?: { dist: number; name: string };
  gauge?: number;                  // gauge diameter
  // Where each gauge sits inside the video area (CSS offsets). Chosen per layout so nothing covers a control.
  horizonAt: React.CSSProperties; compassAt: React.CSSProperties;
  insetL?: number; insetR?: number; top?: number; bottom?: number; // keep ladders clear of safe areas and bars
}

export function Hud({ w, h, heading, tilt, landing, gauge = 64, horizonAt, compassAt, insetL = 6, insetR = 6, top = 72, bottom = 72 }: HudProps) {
  const ladderH = Math.max(80, h - top - bottom);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
      <div style={{ position: "absolute", left: insetL, top }}><TickLadder side="left" height={ladderH} mark={0.35} /></div>
      <div style={{ position: "absolute", right: insetR, top }}><TickLadder side="right" height={ladderH} mark={0.6} /></div>
      {landing && <div style={{ position: "absolute", left: "36%", top: "34%" }}><LandingMarker dist={landing.dist} name={landing.name} /></div>}
      <div style={{ position: "absolute", ...horizonAt }}><HorizonGauge tilt={tilt} size={gauge} /></div>
      <div style={{ position: "absolute", ...compassAt }}><CompassGauge heading={heading} size={gauge} /></div>
    </div>
  );
}
