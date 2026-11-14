"use client";
// Greyscale illustrations for the high-fidelity wireframe: camera scene, map, drone pictures, system bars.
// Pure black, white and grey. No photos, no colour.
import type { BrandId } from "@/lib/data";
import type { Platform } from "@/lib/layout";

/* ---------- Live camera scene (stands in for the video feed) ---------- */
export function Scene({ heading = 0, height = 0, gimbal = 0, zoom = 1, view = 0, wide = false, dim = false }: {
  heading?: number; height?: number; gimbal?: number; zoom?: number; view?: number; wide?: boolean; dim?: boolean;
}) {
  // Pan with heading (or 360 view), lift the horizon as the drone climbs, tilt down with the gimbal.
  const pan = (((wide ? view : heading) % 360) / 360) * 1600;
  const lift = Math.min(160, height * 2.2) - gimbal * 3.2;
  const z = Math.max(1, zoom);
  const strip = (dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      {/* far ridge */}
      <path d="M0 420 L120 360 L230 395 L360 300 L470 370 L600 330 L720 380 L860 290 L990 360 L1110 320 L1240 385 L1380 310 L1500 360 L1600 420 L1600 520 L0 520 Z" fill="url(#ridgeFar)" />
      {/* mid hills */}
      <path d="M0 470 C160 420 260 450 380 430 C520 405 640 470 780 445 C940 415 1060 470 1200 440 C1330 415 1460 470 1600 470 L1600 600 L0 600 Z" fill="url(#ridgeMid)" />
      {/* tree line */}
      {Array.from({ length: 60 }).map((_, i) => {
        const x = i * 27 + ((i * 37) % 11); const h = 26 + ((i * 53) % 22);
        return <path key={i} d={`M${x} ${505} l${9} -${h} l${9} ${h} Z`} fill="#3a3a3a" />;
      })}
      <rect x="0" y="503" width="1600" height="12" fill="#3a3a3a" />
      {/* lake */}
      <path d="M980 560 C1080 540 1260 545 1360 570 C1420 590 1340 625 1200 628 C1060 630 940 610 930 590 C925 575 950 566 980 560 Z" fill="url(#lake)" />
      <path d="M1010 582 h120 M1160 596 h110 M1060 610 h90" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      {/* path */}
      <path d="M260 900 C320 760 420 650 560 590 C640 556 720 540 800 532" stroke="#d8d8d8" strokeWidth="26" fill="none" strokeLinecap="round" opacity=".55" />
      {/* foreground trees */}
      <g fill="#6a6a6a">{[[180, 600], [260, 585], [1420, 610], [1330, 590]].map(([x, y]) => <g key={x}><circle cx={x} cy={y - 34} r="26" /><rect x={x - 3} y={y - 12} width="6" height="22" fill="#4a4a4a" /></g>)}</g>
      {/* people on a picnic blanket (subject) */}
      <g transform="translate(700 640)">
        <path d="M-44 30 L92 30 L74 52 L-62 52 Z" fill="#e9e9e9" opacity=".9" /><ellipse cx="15" cy="54" rx="80" ry="5" fill="rgba(0,0,0,.18)" />
        <circle cx="-10" cy="0" r="9" fill="#111" /><rect x="-18" y="9" width="16" height="30" rx="7" fill="#111" />
        <circle cx="30" cy="4" r="8" fill="#111" /><rect x="23" y="12" width="14" height="26" rx="6" fill="#111" />
        <circle cx="60" cy="18" r="6" fill="#111" /><rect x="55" y="24" width="10" height="16" rx="5" fill="#111" />
      </g>
    </g>
  );
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden style={{ position: "absolute", inset: 0, filter: dim ? "brightness(.55)" : undefined }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d7d7d" /><stop offset=".55" stopColor="#c9c9c9" /><stop offset="1" stopColor="#e8e8e8" /></linearGradient>
        <linearGradient id="ridgeFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a6a6a6" /><stop offset="1" stopColor="#bdbdbd" /></linearGradient>
        <linearGradient id="ridgeMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6e6e6e" /><stop offset="1" stopColor="#575757" /></linearGradient>
        <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a8a8a" /><stop offset="1" stopColor="#5a5a5a" /></linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfcfcf" /><stop offset="1" stopColor="#9a9a9a" /></linearGradient>
        <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".45" /></radialGradient>
      </defs>
      <g transform={`translate(800 450) scale(${z}) translate(-800 -450)`}>
        <g transform={`translate(0 ${lift})`}>
          <rect x="-200" y="-400" width="2000" height="1000" fill="url(#sky)" />
          <g fill="#f4f4f4" opacity=".7">
            <ellipse cx={(300 - pan * 0.3 + 3200) % 1600} cy="150" rx="120" ry="22" /><ellipse cx={(1100 - pan * 0.3 + 3200) % 1600} cy="210" rx="160" ry="26" />
          </g>
          <rect x="-200" y="500" width="2000" height="900" fill="url(#ground)" />
          {strip(-pan)}{strip(1600 - pan)}
        </g>
      </g>
      <rect width="1600" height="900" fill="url(#vig)" />
    </svg>
  );
}

/* ---------- Map (stands in for the satellite or street map) ---------- */
export function MapArt({ distance = 0, heading = 0, compact = false, zones = false, label }: { distance?: number; heading?: number; compact?: boolean; zones?: boolean; label?: string }) {
  const dx = Math.min(320, distance * 1.6), rad = ((heading - 90) * Math.PI) / 180;
  const hx = 400, hy = 300; const px = hx + Math.cos(rad) * dx * 0.2 + dx * 0.8, py = hy - Math.sin(-rad) * dx * 0.15 - dx * 0.3;
  return (
    <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden style={{ position: "absolute", inset: 0 }}>
      <rect width="800" height="600" fill="#ececec" />
      {/* park */}
      <path d="M180 120 C300 80 470 100 560 170 C640 240 610 380 520 430 C420 485 260 470 190 400 C120 330 100 170 180 120 Z" fill="#d9d9d9" />
      {Array.from({ length: 40 }).map((_, i) => <circle key={i} cx={210 + ((i * 71) % 340)} cy={150 + ((i * 47) % 260)} r="5" fill="#c4c4c4" />)}
      {/* river */}
      <path d="M-20 520 C140 470 260 560 420 520 C560 485 640 540 820 500" stroke="#bfbfbf" strokeWidth="34" fill="none" />
      {/* roads */}
      <g stroke="#fff" strokeLinecap="round" fill="none">
        <path d="M0 60 H800 M0 250 C200 240 300 260 800 230 M640 0 V600 M90 0 C110 200 70 400 120 600" strokeWidth="16" />
        <path d="M0 60 H800 M0 250 C200 240 300 260 800 230 M640 0 V600 M90 0 C110 200 70 400 120 600" strokeWidth="14" stroke="#fafafa" />
        <path d="M300 0 V120 M450 600 V470 M640 360 H800 M640 140 H800" strokeWidth="8" />
      </g>
      {/* blocks */}
      <g fill="#dedede">{[[660, 20, 60, 30], [730, 20, 60, 30], [660, 90, 120, 40], [660, 160, 50, 60], [720, 160, 70, 60], [660, 270, 130, 80], [660, 380, 60, 90], [730, 380, 60, 90], [140, 20, 140, 30], [320, 20, 120, 30]].map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="4" />)}</g>
      {!compact && <text x="300" y="300" fontSize="18" fill="#8a8a8a" fontWeight="600" letterSpacing="2">CITY PARK</text>}
      {zones && <g><circle cx="690" cy="440" r="110" fill="url(#mapHatch)" stroke="#141414" strokeWidth="3" strokeDasharray="10 6" />
        {!compact && <text x="640" y="445" fontSize="16" fill="#141414" fontWeight="700">No-fly area</text>}</g>}
      <defs><pattern id="mapHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="rgba(0,0,0,.05)" /><line x1="0" y1="0" x2="0" y2="10" stroke="rgba(0,0,0,.25)" strokeWidth="2" /></pattern></defs>
      {/* flight path */}
      <path d={`M${hx} ${hy} Q ${(hx + px) / 2 - 30} ${(hy + py) / 2 - 40} ${px} ${py}`} stroke="#141414" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
      {/* home */}
      <g transform={`translate(${hx} ${hy})`}><circle r="16" fill="#141414" /><text y="6" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff">H</text></g>
      {/* pilot */}
      <g transform={`translate(${hx - 40} ${hy + 30})`}><circle r="9" fill="#fff" stroke="#141414" strokeWidth="4" /></g>
      {/* drone */}
      <g transform={`translate(${px} ${py}) rotate(${heading})`}><circle r="26" fill="rgba(0,0,0,.08)" /><path d="M0 -18 L13 14 L0 6 L-13 14 Z" fill="#141414" stroke="#fff" strokeWidth="3" strokeLinejoin="round" /></g>
      {label && <text x="24" y="580" fontSize="16" fill="#757575" fontWeight="600">{label}</text>}
    </svg>
  );
}

/* ---------- Drone pictures (greyscale product renders, per brand silhouette) ---------- */
export function DroneArt({ brand, size = 120, view = "top" }: { brand: BrandId; size?: number; view?: "top" | "hero" }) {
  const id = `g${brand}${view}`;
  const prop = (x: number, y: number, r = 34) => (
    <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
      <circle r={r} fill="rgba(0,0,0,.05)" stroke="#bdbdbd" strokeWidth="1.5" strokeDasharray="3 4" />
      <ellipse rx={r * .9} ry="4" fill="#4a4a4a" transform="rotate(20)" /><circle r="7" fill="#262626" />
    </g>
  );
  const body = (() => {
    switch (brand) {
      case "antigravity":
        return <g>{[[-58, -48], [58, -48], [-58, 48], [58, 48]].map(([x, y]) => <g key={x + "" + y}><path d={`M0 0 L${x} ${y}`} stroke="#3a3a3a" strokeWidth="9" strokeLinecap="round" />{prop(x, y, 30)}</g>)}
          <ellipse rx="34" ry="44" fill={`url(#${id})`} /><circle cy="-30" r="11" fill="#111" stroke="#9e9e9e" strokeWidth="2" /><circle cy="30" r="11" fill="#111" stroke="#9e9e9e" strokeWidth="2" /></g>;
      case "parrot":
        return <g>{[[-66, -36], [66, -36], [-66, 36], [66, 36]].map(([x, y]) => <g key={x + "" + y}><path d={`M${x * .25} 0 L${x} ${y}`} stroke="#3a3a3a" strokeWidth="7" strokeLinecap="round" />{prop(x, y, 30)}</g>)}
          <rect x="-22" y="-56" width="44" height="112" rx="20" fill={`url(#${id})`} /><rect x="-10" y="-62" width="20" height="14" rx="5" fill="#111" /></g>;
      case "autel":
        return <g>{[[-74, -60], [74, -60], [-74, 60], [74, 60]].map(([x, y]) => <g key={x + "" + y}><path d={`M0 0 L${x} ${y}`} stroke="#333" strokeWidth="12" strokeLinecap="round" />{prop(x, y, 36)}</g>)}
          <rect x="-36" y="-50" width="72" height="100" rx="22" fill={`url(#${id})`} /><rect x="-20" y="-64" width="40" height="22" rx="8" fill="#111" /></g>;
      case "skydio":
        return <g>{[[-70, -46], [70, -46], [-70, 46], [70, 46]].map(([x, y]) => <g key={x + "" + y}><path d={`M0 0 L${x} ${y}`} stroke="#2a2a2a" strokeWidth="10" strokeLinecap="round" />{prop(x, y, 32)}</g>)}
          <path d="M-30 -50 L30 -50 L40 40 L0 56 L-40 40 Z" fill={`url(#${id})`} />{[[-20, -38], [20, -38], [-28, 30], [28, 30], [0, 46]].map(([x, y]) => <circle key={x + "" + y} cx={x} cy={y} r="5" fill="#111" />)}</g>;
      default: // DJI Mavic-style folding arms
        return <g>{[[-70, -54], [70, -54], [-64, 56], [64, 56]].map(([x, y]) => <g key={x + "" + y}><path d={`M${x * .3} ${y * .3} L${x} ${y}`} stroke="#3a3a3a" strokeWidth="9" strokeLinecap="round" />{prop(x, y, 32)}</g>)}
          <path d="M-26 -58 C-18 -66 18 -66 26 -58 L32 50 C20 62 -20 62 -32 50 Z" fill={`url(#${id})`} /><rect x="-14" y="-72" width="28" height="18" rx="6" fill="#111" /><circle cy="-63" r="5" fill="#555" /></g>;
    }
  })();
  return (
    <svg width={size} height={size * (view === "hero" ? .62 : .8)} viewBox={view === "hero" ? "-120 -80 240 150" : "-120 -100 240 200"} aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f8f8f" /><stop offset=".5" stopColor="#5e5e5e" /><stop offset="1" stopColor="#2e2e2e" /></linearGradient></defs>
      {view === "hero" && <ellipse cy="64" rx="90" ry="8" fill="rgba(0,0,0,.12)" />}
      {body}
    </svg>
  );
}

/* ---------- Media thumbnail (small scene crop) ---------- */
export function Thumb({ seed = 0, w = 64, h = 48, video = false }: { seed?: number; w?: number; h?: number; video?: boolean }) {
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 10, overflow: "hidden", flex: "none", background: "var(--grey-300)" }}>
      <Scene heading={seed * 47} height={10 + (seed % 3) * 12} />
      {video && <span style={{ position: "absolute", left: 4, bottom: 3, fontSize: 9, fontWeight: 700, color: "#fff", textShadow: "0 1px 2px #000" }}>0:{String(12 + seed * 7).slice(-2)}</span>}
    </div>
  );
}

/* ---------- System bars ---------- */
export function StatusBar({ platform, dark = false, landscape = false }: { platform: Platform; dark?: boolean; landscape?: boolean }) {
  if (platform === "laptop" || (platform === "iphone" && landscape)) return null;
  const c = dark ? "#fff" : "#141414";
  const h = platform === "iphone" ? 54 : platform === "tablet" ? 24 : 30;
  const pad = platform === "iphone" ? "18px 34px 0 46px" : "0 20px";
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, display: "flex", alignItems: platform === "iphone" ? "flex-start" : "center", justifyContent: "space-between", padding: pad, color: c, zIndex: 3, pointerEvents: "none", fontWeight: 600, fontSize: platform === "iphone" ? 17 : 13 }}>
      <span className="num">9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill={c} /><rect x="5" y="5" width="3" height="6" rx="1" fill={c} /><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill={c} /><rect x="15" y="0" width="3" height="11" rx="1" fill={c} /></svg>
        <svg width="16" height="11" viewBox="0 0 16 11"><path d="M8 10.5 L5.6 8 A3.4 3.4 0 0 1 10.4 8 Z" fill={c} /><path d="M3.3 5.8 A6.6 6.6 0 0 1 12.7 5.8" stroke={c} strokeWidth="1.8" fill="none" /><path d="M1 3.4 A10 10 0 0 1 15 3.4" stroke={c} strokeWidth="1.8" fill="none" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" stroke={c} strokeOpacity=".4" fill="none" /><rect x="2.5" y="2.5" width="16" height="7" rx="2" fill={c} /><rect x="24" y="4" width="1.5" height="4" rx=".75" fill={c} fillOpacity=".4" /></svg>
      </span>
    </div>
  );
}

export function HomeIndicator({ dark = false }: { dark?: boolean }) {
  return <div style={{ position: "absolute", left: "50%", bottom: 8, width: 134, height: 5, marginLeft: -67, borderRadius: 9999, background: dark ? "#fff" : "#141414", opacity: .9, zIndex: 70, pointerEvents: "none" }} />;
}

export function Island({ landscape = false }: { landscape?: boolean }) {
  return landscape
    ? <div style={{ position: "absolute", left: 11, top: "50%", width: 37, height: 126, marginTop: -63, borderRadius: 9999, background: "#000", zIndex: 70, pointerEvents: "none" }} />
    : <div style={{ position: "absolute", top: 11, left: "50%", width: 126, height: 37, marginLeft: -63, borderRadius: 9999, background: "#000", zIndex: 70, pointerEvents: "none" }} />;
}

/* Signal bars and battery for the flight HUD */
export function Bars({ level, size = 14 }: { level: 0 | 1 | 2 | 3 | 4; size?: number }) {
  return <svg width={size * 1.3} height={size} viewBox="0 0 18 14" aria-hidden>{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 4.7} y={10 - i * 3.2} width="3.2" height={4 + i * 3.2} rx="1" fill="currentColor" opacity={i < level ? 1 : .3} />)}</svg>;
}
export function Battery({ pct, size = 14 }: { pct: number; size?: number }) {
  const w = Math.max(0, Math.min(1, pct / 100)) * 18;
  return <svg width={size * 1.9} height={size} viewBox="0 0 27 14" aria-hidden><rect x=".75" y=".75" width="22.5" height="12.5" rx="3.5" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" fill="none" />
    <rect x="3" y="3" width={w} height="8" rx="1.5" fill="currentColor" />{pct <= 25 && <path d="M3 3 L21 11" stroke="currentColor" strokeWidth="0" />}<rect x="24.5" y="5" width="2" height="4" rx="1" fill="currentColor" opacity=".55" /></svg>;
}
