"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ZONE_LABEL, flyLayout, flyOrientation, frameSize, reservedRegions, safeArea, type Orientation, type Platform, type ZoneKey } from "@/lib/layout";
import type { Overlays } from "@/lib/store";
import { HomeIndicator, Island } from "./art";

// A device frame scaled to fit its box, with wireframe overlays (zones, safe area, reserved regions, hit areas, mock tags).
export function Device({ platform, orient, fly, mirror, overlays, label, maxScale = 1, bare = false, half = false, children }: {
  platform: Platform; orient: Orientation; fly: boolean; mirror: boolean; overlays: Overlays; label: string; maxScale?: number; dark?: boolean; bare?: boolean; half?: boolean; children: ReactNode;
}) {
  const o = fly ? flyOrientation(platform, orient) : platform === "laptop" ? "landscape" : orient;
  const { W, H } = frameSize(platform, o);
  const safe = safeArea(platform, o);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const fit = () => setScale(Math.min(maxScale, (el.clientWidth - 8) / (W + 24), (el.clientHeight - (platform === "laptop" ? 64 : 40) + (bare ? 30 : 0)) / (H + 24)));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, [W, H, maxScale, platform, bare]);
  const zones = fly ? flyLayout(platform, orient, mirror, half).zones : {};
  const radius = platform === "laptop" ? 10 : platform === "tablet" ? 28 : 44;
  return (
    <div ref={box} style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {!bare && <div className="t-cap muted" style={{ marginBottom: 8, fontWeight: 500 }}>{label} · {W} x {H} pt{fly && o !== orient ? " · Fly is landscape here" : ""} · {Math.round(scale * 100)}%</div>}
      <div style={{ width: (W + 24) * scale, height: (H + 24) * scale, flex: "none" }}>
        <div className={`${overlays.hit ? "show-hit" : ""} ${overlays.mock ? "" : "hide-mock"}`}
          style={{ width: W + 24, height: H + 24, padding: 12, background: "linear-gradient(145deg, #2a2a2a, #050505 40%, #1a1a1a)", borderRadius: radius + 12, transform: `scale(${scale})`, transformOrigin: "0 0",
            boxShadow: "0 0 0 1.5px #5a5a5a, 0 30px 80px rgba(0,0,0,.28), 0 8px 20px rgba(0,0,0,.18)", position: "relative" }}>
          <div style={{ position: "relative", width: W, height: H, overflow: "hidden", borderRadius: radius, background: "var(--grey-50)" }}>
            {children}
            {platform === "iphone" && <Island landscape={o === "landscape"} />}
            {(platform === "iphone" || platform === "duoClosed" || platform === "duoOpen") && <HomeIndicator dark />}
            {platform === "duoOpen" && <div style={{ position: "absolute", pointerEvents: "none", zIndex: 69, ...(o === "portrait" ? { left: 0, right: 0, top: H / 2 - (half ? 12 : 0.5), height: half ? 24 : 1 } : { top: 0, bottom: 0, left: W / 2 - (half ? 12 : 0.5), width: half ? 24 : 1 }),
              background: half ? `linear-gradient(${o === "portrait" ? "180deg" : "90deg"}, rgba(0,0,0,0), rgba(0,0,0,.35) 50%, rgba(0,0,0,0))` : "rgba(255,255,255,.12)" }} />}
            {platform === "duoClosed" && <div aria-hidden style={{ position: "absolute", right: 18, top: 18, width: 16, height: 16, borderRadius: 9999, background: "#000", boxShadow: "inset 0 0 0 3px #1a1a1a, 0 0 0 1px rgba(255,255,255,.08)", zIndex: 70, pointerEvents: "none" }} />}
            {overlays.safe && <div className="ov-safe" style={{ left: safe.l, top: safe.t, width: W - safe.l - safe.r, height: H - safe.t - safe.b }} />}
            {overlays.reserved && reservedRegions(platform, o, half).map((r, i) => <div key={i} className="ov-res" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>{r.label}</div>)}
            {overlays.zones && fly && (Object.keys(zones) as ZoneKey[]).filter((k) => ZONE_LABEL[k] && k !== "video").map((k) => {
              const r = zones[k]!; return <div key={k} className="ov-zone" style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>{ZONE_LABEL[k]}</div>;
            })}
          </div>
          {platform === "laptop" && <div style={{ position: "absolute", left: -60, right: -60, bottom: -34, height: 22, borderRadius: "0 0 18px 18px", background: "linear-gradient(#d0d0d0, #9a9a9a)", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
            <div style={{ width: 160, height: 8, margin: "0 auto", background: "#8a8a8a", borderRadius: "0 0 10px 10px" }} /></div>}
        </div>
      </div>
    </div>
  );
}
