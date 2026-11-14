"use client";
// Command-centre building blocks (standard design, after DJI FlightHub 2 patterns; see 17-flighthub2-analysis.md).
// Greyscale only: status is carried by fill, pattern, border and label, never colour.
import type { CSSProperties, ReactNode } from "react";
import { MapArt } from "./art";

export function Panel({ title, right, children, style, pad = 14 }: { title?: ReactNode; right?: ReactNode; children: ReactNode; style?: CSSProperties; pad?: number }) {
  return (
    <section className="fh-panel" style={style}>
      {title && <header className="fh-panel-h"><span>{title}</span>{right}</header>}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

export function Sparkline({ data, w = 84, h = 26, fill = true }: { data: number[]; w?: number; h?: number; fill?: boolean }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} aria-hidden style={{ display: "block" }}>
      {fill && <path d={`${d} L${w} ${h} L0 ${h} Z`} fill="rgba(255,255,255,.08)" />}
      <path d={d} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill="#fff" />
    </svg>
  );
}

export function Bars7({ data, w = 120, h = 40 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data, 1); const bw = w / data.length;
  return <svg width={w} height={h} aria-hidden>{data.map((v, i) => <rect key={i} x={i * bw + 2} y={h - (v / max) * (h - 2)} width={bw - 4} height={(v / max) * (h - 2)} rx="2" fill={i === data.length - 1 ? "#fff" : "rgba(255,255,255,.35)"} />)}</svg>;
}

export function BigStat({ label, value, unit, spark, sub }: { label: string; value: string; unit?: string; spark?: number[]; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div className="fh-label">{label}</div>
        <div className="fh-num">{value}{unit && <span className="fh-unit"> {unit}</span>}</div>
        {sub && <div className="fh-label" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {spark && <Sparkline data={spark} />}
    </div>
  );
}

// Ring chart. Segments are told apart by fill style, not colour.
export type RingSeg = { label: string; value: number; style: "solid" | "light" | "hatch" | "dash" };
export function Ring({ segs, size = 112, center, sub }: { segs: RingSeg[]; size?: number; center: string; sub: string }) {
  const r = size / 2 - 9, c = 2 * Math.PI * r, total = segs.reduce((a, b) => a + b.value, 0) || 1;
  let off = 0;
  const stroke = (st: RingSeg["style"]) => st === "solid" ? "#fff" : st === "light" ? "rgba(255,255,255,.55)" : st === "hatch" ? "url(#ringHatch)" : "rgba(255,255,255,.25)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${center} ${sub}`}>
      <defs><pattern id="ringHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="rgba(255,255,255,.18)" /><line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeWidth="2" /></pattern></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="12" />
      {segs.filter((s) => s.value > 0).map((s) => {
        const len = (s.value / total) * c - 2; const el = (
          <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke(s.style)} strokeWidth="12" strokeDasharray={s.style === "dash" ? `3 3` : `${len} ${c}`}
            strokeDashoffset={-off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={s.style === "dash" ? { strokeDasharray: `${len} ${c}` } : undefined} />);
        off += (s.value / total) * c; return el;
      })}
      <text x="50%" y="48%" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff">{center}</text>
      <text x="50%" y="64%" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.6)" letterSpacing=".06em">{sub.toUpperCase()}</text>
    </svg>
  );
}
export function Swatch({ st }: { st: RingSeg["style"] }) {
  const bg = st === "solid" ? "#fff" : st === "light" ? "rgba(255,255,255,.55)" : st === "hatch" ? "repeating-linear-gradient(45deg,#fff 0 2px,rgba(255,255,255,.18) 2px 4px)" : "transparent";
  return <span style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: st === "dash" ? "1.5px dashed rgba(255,255,255,.7)" : "none", flex: "none" }} />;
}

export function Key({ k, on, wide, label }: { k: string; on?: boolean; wide?: boolean; label?: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <kbd className={`fh-key${on ? " on" : ""}`} style={{ minWidth: wide ? 64 : 34 }}>{k}</kbd>
      {label && <span className="fh-label" style={{ fontSize: 9 }}>{label}</span>}
    </span>
  );
}

// Dark map: our greyscale illustration map, inverted for the dark command-centre theme.
export function DarkMap({ distance = 0, heading = 0, zones = true, compact = false, bare = true }: { distance?: number; heading?: number; zones?: boolean; compact?: boolean; bare?: boolean }) {
  return <div style={{ position: "absolute", inset: 0, filter: "invert(1) brightness(.78) contrast(1.05)" }}><MapArt distance={distance} heading={heading} zones={zones} compact={compact} bare={bare} /></div>;
}

export function MapTools({ heading = 0, onRecenter }: { heading?: number; onRecenter?: () => void }) {
  return (
    <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 6, zIndex: 3 }}>
      <div className="fh-tool" title={`Heading ${Math.round(heading)}°`} style={{ height: 44, flexDirection: "column", gap: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 800, transform: `rotate(${-heading}deg)` }}>N</span><span style={{ fontSize: 9 }}>{String(Math.round(heading)).padStart(3, "0")}°</span>
      </div>
      <button className="fh-tool" title="2D / 3D (mock)">3D</button>
      <button className="fh-tool" title="Recenter on drone" onClick={onRecenter}>◎</button>
      <button className="fh-tool" title="Zoom in">+</button>
      <button className="fh-tool" title="Zoom out">−</button>
    </div>
  );
}
