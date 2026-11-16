"use client";
// Fly cockpit for laptop and iPad landscape (standard design, after the DJI FlightHub 2 Virtual Cockpit).
// Three parts: map (left), live view (right), flight strip (bottom) that changes before and after take-off.
// The brand skin still names the controls. Safety (Pause, Return, Land) sits at the strip's right end, Pause largest.
import { useEffect, useState, type ReactNode } from "react";
import { ArrowDownToLine, Camera, ChevronDown, ChevronLeft, Grid2x2, Home, Layers, Lock, MapPin, Pause, Play, Smartphone, Sparkles, Video, X } from "lucide-react";
import { COUNTRIES } from "@/lib/data";
import { frameSize, safeArea } from "@/lib/layout";
import { activeAlerts, alertAction, checklist, droneOf, inAir, skinOf, startReturn, useProto } from "@/lib/store";
import { Bars, Battery, DroneArt, StatusBar } from "./art";
import { Hud } from "./Hud";
import { DroneView, RealMap } from "./RealMap";
import { world } from "@/lib/world";
import { Key } from "./fh";
import { Handover } from "./Fly";
import { DronePicker } from "./Screens";
import { AlertCard, HoldButton, Icon, Mock, Stick, VSlider } from "./ui";

function Rose({ heading, size = 132 }: { heading: number; size?: number }) {
  const c = size / 2, r = c - 6;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Heading ${Math.round(heading)}°`}>
      <circle cx={c} cy={c} r={r} fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.35)" />
      <g transform={`rotate(${-heading} ${c} ${c})`}>
        {Array.from({ length: 36 }).map((_, i) => { const a = (i * 10 * Math.PI) / 180, l = i % 9 === 0 ? 10 : i % 3 === 0 ? 6 : 3;
          return <line key={i} x1={c + Math.sin(a) * r} y1={c - Math.cos(a) * r} x2={c + Math.sin(a) * (r - l)} y2={c - Math.cos(a) * (r - l)} stroke="#fff" strokeOpacity={i % 9 === 0 ? 1 : .5} strokeWidth={i % 9 === 0 ? 2 : 1} />; })}
        {["N", "E", "S", "W"].map((t, i) => { const a = (i * 90 * Math.PI) / 180; return <text key={t} x={c + Math.sin(a) * (r - 20)} y={c - Math.cos(a) * (r - 20) + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{t}</text>; })}
      </g>
      <path d={`M${c} ${c - 16} L${c + 9} ${c + 10} L${c} ${c + 4} L${c - 9} ${c + 10} Z`} fill="#fff" />
      <path d={`M${c - 5} 1 L${c + 5} 1 L${c} 8 Z`} fill="#fff" />
    </svg>
  );
}
const Stat = ({ k, v, u, big }: { k: string; v: string; u?: string; big?: boolean }) => (
  <div><div className="fh-label">{k}</div><div className="num fh-val" style={{ fontSize: big ? 32 : 20, lineHeight: big ? "40px" : "28px", fontWeight: 600, letterSpacing: "-.02em" }}>{v}<span className="fh-unit">{u ? ` ${u}` : ""}</span></div></div>
);

export function Cockpit() {
  const { s, up, input } = useProto();
  const d = droneOf(s); const m = s.sims[s.droneId]; const skin = skinOf(s); const c = COUNTRIES[s.country];
  const { W, H } = frameSize(s.platform, s.orient);
  const safe = safeArea(s.platform, s.orient);
  const laptop = s.platform === "laptop";
  const flying = inAir(m.phase), paused = m.phase === "paused", returning = m.phase === "returning", landing = m.phase === "landing";
  const locked = s.moving || s.driving || s.link === "lost";
  const alerts = activeAlerts(s); const critical = alerts.find((a) => a.level === "critical");
  const shown = critical ? [critical] : alerts.slice(0, 2);
  const [keys, setKeys] = useState<string[]>([]);
  const [mouselook, setMouselook] = useState(false);
  const [flash, setFlash] = useState(false);
  const [recT, setRecT] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [landAsk, setLandAsk] = useState(false);
  const setSim = (f: (x: typeof m) => void) => up((p) => f(p.sims[p.droneId]));
  const w = world(s); // real map data for the current country
  const fastIdx = skin.modes.length - 1;
  const shoot = () => { setSim((x) => { x.photos += 1; }); setFlash(true); setTimeout(() => setFlash(false), 160); };

  useEffect(() => { if (!m.recording) return; const t = setInterval(() => setRecT((v) => v + 1), 1000); return () => clearInterval(t); }, [m.recording]);

  // Keyboard (laptop, and iPad with a keyboard). Shown on every control.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase(); setKeys((v) => (v.includes(k) ? v : [...v, k]));
      if (k === "w") input.current.ly = -1; if (k === "s") input.current.ly = 1;
      if (k === "a") input.current.lx = -1; if (k === "d") input.current.lx = 1;
      if (k === "arrowup") { input.current.ry = -1; input.current.throttle = true; } if (k === "arrowdown") input.current.ry = 1;
      if (k === "arrowleft") input.current.rx = -1; if (k === "arrowright") input.current.rx = 1;
      if (k === "w" && skin.left === "flightSlider") input.current.slider = 1; if (k === "s" && skin.left === "flightSlider") input.current.slider = -1;
      if (k === " ") { e.preventDefault(); up((p) => { const x = p.sims[p.droneId]; if (x.phase === "flying" || x.phase === "returning") { x.phase = "paused"; if (x.smartMode) x.smartPaused = true; } else if (x.phase === "paused") x.phase = "flying"; }); }
      if (k === "r") up((p) => { if (inAir(p.sims[p.droneId].phase)) p.returnSheet = true; });
      if (k === "x") up((p) => { const x = p.sims[p.droneId]; x.mode = x.mode === fastIdx ? Math.min(1, fastIdx) : fastIdx; p.fastMode = x.mode === fastIdx; });
      if (k === "v") setMouselook((v) => !v);
      if (k === "f") shoot();
    };
    const upk = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(); setKeys((v) => v.filter((x) => x !== k));
      if (k === "w" || k === "s") { input.current.ly = 0; input.current.slider = 0; } if (k === "a" || k === "d") input.current.lx = 0;
      if (k === "arrowup" || k === "arrowdown") { input.current.ry = 0; input.current.throttle = false; } if (k === "arrowleft" || k === "arrowright") input.current.rx = 0;
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", upk);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", upk); };
  }, [input, up, skin.left, fastIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geometry
  const topY = safe.t, topH = 48, dashH = laptop ? 200 : 232, bottomY = H - safe.b;
  const mainY = topY + topH, mainH = bottomY - dashH - mainY;
  const mapW = laptop ? 480 : Math.round(W * 0.34);
  const phaseLabel = m.phase === "grounded" ? "On ground" : paused ? "Hovering" : m.phase === "takeoff" ? "Taking off" : returning ? `Returning to ${m.returnTarget ?? "Home"}` : landing ? "Landing" : "Flying";
  const title = !flying ? "Ready to take off" : m.smartMode ? `${m.smartMode}${m.smartPaused ? " · paused" : ""}` : returning ? "Returning" : `Manual flight · ${skin.modes[m.mode]?.name ?? ""}`;
  const latency = s.link === "strong" ? 48 : s.link === "weak" ? 186 : null;
  const checks = checklist(s); const blocked = checks.some((i) => i.state === "block");
  const lockedWhy = s.moving ? "The phone is moving" : s.driving ? "Driving" : s.link === "lost" ? "No link" : "";

  const leave = () => up((p) => { if (inAir(p.sims[p.droneId].phase) && !p.sims[p.droneId].smartMode) p.leaveCockpit = true; else p.screen = "hangar"; });

  // ---------- top bar ----------
  const top = (
    <div style={{ position: "absolute", left: 0, right: 0, top: topY, height: topH, display: "flex", alignItems: "center", gap: 12, padding: "0 12px", background: "var(--bar, #161616)", borderBottom: "1px solid rgba(255,255,255,.08)", zIndex: 10 }}>
      <button className="fh-tool" aria-label={flying ? "Leave cockpit" : "Back to Hangar"} title="Leave cockpit" onClick={leave}><ChevronLeft size={18} /></button>
      <button aria-label={`${d.nickname}. Change drone`} onClick={() => up((p) => { p.dronePicker = true; })} style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 12px 0 4px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", textAlign: "left" }}>
        <span style={{ width: 34, height: 28, borderRadius: 8, background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center" }}><DroneArt brand={d.brand} size={32} /></span>
        <span style={{ lineHeight: "14px" }}><span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{d.nickname}</span><span className="fh-label">{phaseLabel}</span></span>
        <ChevronDown size={14} style={{ opacity: .7 }} />
      </button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 9999, background: flying ? "#18e888" : "transparent", border: `1.5px solid ${flying ? "#18e888" : "#fff"}` }} />{title}</span>
        <span className="fh-label" style={{ marginLeft: 12 }}>{skin.appCopied} layout</span>
      </div>
      <span className="fh-chip"><MapPin size={12} />{c.code} · max {c.maxAltitude} m</span>
      {skin.readOnlyMode && <span className="fh-chip" style={{ borderStyle: "dashed" }}>{skin.readOnlyMode}</span>}
      <button className="fh-chip" onClick={() => up((p) => { p.screen = "watch"; })}><Grid2x2 size={13} />Watch wall</button>
    </div>
  );

  // ---------- map pane ----------
  const map = (
    <div style={{ position: "absolute", left: 0, top: mainY, width: mapW, height: mainH, overflow: "hidden", borderRight: "1px solid rgba(255,255,255,.08)" }}>
      <RealMap center={w.spot.home} zoom={16.5} drones={w.drones} homes={[w.myHome]} landing={w.landing} noFly={w.noFly} path={w.path} follow={w.me} tools onDrone={(id) => { if (id !== s.droneId) up((p) => { p.handoverTo = id; }); }} />
      <div className="fh-panel" style={{ position: "absolute", left: 16, top: 16, padding: "8px 12px", zIndex: 2 }}>
        <div style={{ fontWeight: 600 }}>{w.spot.place}, {w.spot.city}</div>
        <div className="fh-label">Example location · drone rules not checked</div>
      </div>
      <div className="fh-panel fh-label" style={{ position: "absolute", left: 16, bottom: 16, padding: "4px 12px", display: "flex", gap: 16, zIndex: 2, color: "#d0d0d0", whiteSpace: "nowrap" }}><span>H Home</span><span>↓ Landing spot</span><span>Red: no-fly</span></div>
    </div>
  );

  // ---------- live view ----------
  const lensChips = d.brand === "autel" ? ["Wide", "Zoom", "IR", "NV"] : d.brand === "antigravity" ? ["360", "Front", "Back"] : ["Wide", "Zoom"];
  const live = (
    <div style={{ position: "absolute", left: mapW, right: 0, top: mainY, height: mainH, overflow: "hidden", background: "#000", cursor: mouselook ? "crosshair" : undefined }}
      onMouseMove={(e) => { if (!mouselook || !flying) return; const b = e.currentTarget.getBoundingClientRect(); const ny = (e.clientY - b.top) / b.height; setSim((x) => { x.gimbal = Math.round(Math.max(0, Math.min(90, ny * 90))); }); }}>
      <DroneView at={w.me} heading={d.is360 ? m.view : m.heading} height={m.height} gimbal={m.gimbal} dim={!flying} />
      <Hud w={W - mapW} h={mainH} heading={d.is360 ? m.view : m.heading} tilt={flying ? Math.sin(m.distance / 7) * 3 + 1 : 0}
        landing={flying ? { dist: Math.round(w.nearest.dist), name: w.nearest.name } : undefined} gauge={laptop ? 72 : 64} horizonAt={{ left: "50%", bottom: 20, marginLeft: -(laptop ? 72 : 64) - 4 }} compassAt={{ left: "50%", bottom: 20, marginLeft: 4 }}
        insetL={laptop ? 84 : 76} insetR={laptop ? 92 : 80} top={72} bottom={laptop ? 72 : 60} />
      {flash && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.5)", pointerEvents: "none" }} />}
      <div className="hud-text" style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "8px 12px", display: "flex", gap: 16, fontSize: 12, fontWeight: 600, background: "linear-gradient(rgba(0,0,0,.6), transparent)" }}>
        <span>{m.videoMode ? "VIDEO 4K 30" : "PHOTO 48MP"}</span><span>ISO 100</span><span>1/500</span><span>EV 0</span><span>{skin.slider}: −{m.gimbal}°</span><span style={{ marginLeft: "auto" }}>128 GB free <Mock /></span>
      </div>
      <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8 }}>
        {lensChips.map((l, i) => <button key={l} className={`fh-chip${i === 0 ? " on" : ""}`} style={{ height: 28 }}>{l}</button>)}
      </div>
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 12, justifyItems: "center" }}>
        <button className="fh-tool" title={skin.toggle} onClick={() => setSim((x) => { x.videoMode = !x.videoMode; })}>{d.brand === "autel" ? <Layers size={16} /> : m.videoMode ? <Video size={16} /> : <Camera size={16} />}</button>
        <button aria-label={`${skin.shutter} [F]`} title={`${skin.shutter} [F]`} disabled={!flying} onClick={shoot} style={{ width: 54, height: 54, borderRadius: 9999, border: "3px solid #fff", background: "rgba(0,0,0,.3)", display: "grid", placeItems: "center" }}><span style={{ width: 40, height: 40, borderRadius: 9999, background: "#fff" }} /></button>
        <button aria-label={skin.record} title={skin.record} disabled={!flying} onClick={() => { setRecT(0); setSim((x) => { x.recording = !x.recording; }); }} style={{ width: 44, height: 44, borderRadius: 9999, border: "3px solid #fff", background: "rgba(0,0,0,.3)", display: "grid", placeItems: "center" }}><span style={{ width: m.recording ? 14 : 24, height: m.recording ? 14 : 24, borderRadius: m.recording ? 3 : 9999, background: "#fff" }} /></button>
        {skin.slider2 && <div className="fh-panel" style={{ padding: "8px 4px", display: "grid", gap: 4, textAlign: "center" }}>
          {[7, 4, 2, 1].map((z) => <button key={z} onClick={() => setSim((x) => { x.zoom = z; })} style={{ background: m.zoom === z ? "#fff" : "none", color: m.zoom === z ? "#111" : "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, padding: "4px 8px" }}>{z}x</button>)}
        </div>}
      </div>
      {mouselook && flying && <div style={{ position: "absolute", left: "50%", top: "50%", width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: 9999, border: "2px solid rgba(255,255,255,.8)", pointerEvents: "none" }} />}
      <div style={{ position: "absolute", left: "50%", top: 38, transform: "translateX(-50%)", width: Math.min(460, W - mapW - 140), display: "grid", gap: 8, zIndex: 4 }}>
        {shown.map((a) => <AlertCard key={a.id} a={a} onAct={() => up((p) => alertAction(p, a.id))} />)}
        {locked && flying && <div className="fh-panel" style={{ padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", backgroundImage: "var(--hatch-dark)", fontSize: 14 }}><Lock size={15} /><b>Controls locked.</b><span className="fh-label" style={{ color: "#fff" }}>{lockedWhy}. Pause and Return still work.</span></div>}
      </div>
      <div style={{ position: "absolute", left: 10, right: 80, bottom: 10, display: "flex", gap: 8, overflowX: "auto" }} className="no-scrollbar">
        {m.recording && <span className="fh-chip on">● REC {String(Math.floor(recT / 60)).padStart(2, "0")}:{String(recT % 60).padStart(2, "0")}</span>}
        {skin.tray.map((t) => <button key={t.name} className={`fh-chip${m.smartMode === t.name ? " on" : ""}`} disabled={!!t.disabled || !flying} title={t.disabled ?? t.sub}
          style={t.disabled || !flying ? { backgroundImage: "var(--hatch-dark)", color: "rgba(255,255,255,.45)" } : undefined}
          onClick={() => setSim((x) => { x.smartMode = x.smartMode === t.name ? undefined : t.name; x.smartPaused = false; })}>{t.disabled ? <Lock size={11} /> : <Sparkles size={11} />}{t.name}</button>)}
      </div>
      {laptop && <button className="fh-chip" style={{ position: "absolute", right: 12, bottom: 10, ...(mouselook ? { background: "#fff", color: "#111" } : {}) }} onClick={() => setMouselook((v) => !v)}>Mouselook [V]</button>}
    </div>
  );

  // ---------- flight strip ----------
  const sec = (w: number | string, children: ReactNode, extra?: React.CSSProperties) => <div style={{ width: w, flex: typeof w === "string" ? 1 : "none", padding: "16px 16px", borderLeft: "1px solid rgba(255,255,255,.08)", minWidth: 0, ...extra }}>{children}</div>;
  const health = sec(160, <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Bars level={s.link === "strong" ? 4 : s.link === "weak" ? 1 : 0} size={12} />{latency === null ? "No link" : `${latency} ms`}</span>
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="fh-label" style={{ width: 28 }}>GPS</span>18 <Mock /></span>
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Battery pct={d.battery} size={11} /><b className="num">{Math.round(d.battery)}%</b></span>
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="fh-label" style={{ width: 28 }}>Time</span><span className="num">{m.startedAt && flying ? new Date(Date.now() - m.startedAt).toISOString().slice(14, 19) : "00:00"}</span></span>
  </div>, { borderLeft: "none" });
  const attitude = sec(laptop ? 352 : 330, <div style={{ display: "flex", alignItems: "center", gap: 16, height: "100%" }}>
    <div style={{ display: "grid", gap: 12 }}><Stat k="Speed" v={m.hSpeed.toFixed(1)} u="m/s" /><Stat k="Vertical" v={m.vSpeed.toFixed(1)} u="m/s" /></div>
    <div style={{ display: "grid", justifyItems: "center", gap: 4 }}><span className="num fh-val" style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(m.heading)}°</span><Rose heading={m.heading} size={laptop ? 128 : 120} /></div>
    <div style={{ display: "grid", gap: 8 }}><Stat k="Height" v={m.height.toFixed(1)} u="m" big /><Stat k="To Home" v={m.distance.toFixed(0)} u="m" /></div>
  </div>);

  let controls: ReactNode;
  if (!flying) {
    controls = <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
      <div className="fh-field">Return height <b>{Math.min(60, c.maxAltitude)} m</b></div>
      <div className="fh-field">Max height <b>{c.maxAltitude} m</b></div>
      <div className="fh-field">On signal lost <b>Return</b></div>
      <div className="fh-field">Speed <span className="seg" style={{ minWidth: 0 }}>{skin.modes.map((md, i) => <button key={md.name} className={m.mode === i ? "on" : ""} style={{ minHeight: 26, padding: "0 8px", fontSize: 12 }} onClick={() => setSim((x) => { x.mode = i; })}>{md.name}</button>)}</span></div>
      <button className="fh-field" onClick={() => up((p) => { p.screen = "pf-checklist"; })} style={{ gridColumn: "1 / -1", background: "none", border: "none", padding: 0, color: "inherit", textAlign: "left" }}>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", color: "#fff" }}><Icon kind={blocked ? "critical" : "pass"} size={14} />Pre-flight checks: {blocked ? "not ready" : "ready"}</span><span style={{ textDecoration: "underline" }}>Open</span>
      </button>
    </div>;
  } else if (d.monitorOnly) {
    controls = <div className="fh-label" style={{ display: "flex", gap: 12, alignItems: "center", height: "100%", color: "#fff" }}><Lock size={16} />Skydio X10 is monitor and mission-start only in this concept. Use Pause, Return and Land.</div>;
  } else if (laptop) {
    const L = skin.left === "flightSlider" ? ["Slider up", "Slider down"] : ["Climb", "Descend"];
    const on = (k: string) => keys.includes(k);
    controls = <div style={{ display: "flex", gap: 24, alignItems: "center", height: "100%", opacity: locked ? .4 : 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 8, justifyItems: "center" }}>
        <span /><Key k="W" on={on("w")} label={L[0]} /><span />
        <Key k="A" on={on("a")} label="Turn left" /><Key k="S" on={on("s")} label={L[1]} /><Key k="D" on={on("d")} label="Turn right" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 8, justifyItems: "center" }}>
        <span /><Key k="↑" on={on("arrowup")} label={skin.right === "throttle" ? "Throttle" : "Forward"} /><span />
        <Key k="←" on={on("arrowleft")} label="Left" /><Key k="↓" on={on("arrowdown")} label="Back" /><Key k="→" on={on("arrowright")} label="Right" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <button className="fh-btn" style={s.fastMode || m.mode === fastIdx ? { background: "#fff", color: "#111" } : undefined} onClick={() => setSim((x) => { x.mode = x.mode === fastIdx ? Math.min(1, fastIdx) : fastIdx; })}>{skin.modes[fastIdx].name} [X]</button>
        <span className="fh-label">{skin.stickName || "Keys"} mapped to keyboard</span>
      </div>
    </div>;
  } else {
    // iPad landscape: touch controls copy the skin (sticks, A1 Flight Slider + Throttle Trigger)
    controls = <div style={{ position: "relative", height: "100%" }}>
      {skin.left === "stick" && <Stick rect={{ x: 10, y: 6, w: 140, h: 140 }} label={`Left ${skin.stickName}`} locked={locked} onMove={(x, y) => { input.current.lx = x; input.current.ly = y; }} />}
      {skin.left === "flightSlider" && <VSlider rect={{ x: 50, y: 0, w: 44, h: 160 }} label="Flight Slider" value={(input.current.slider + 1) / 2} springTo={0.5} locked={locked} onChange={(v) => { input.current.slider = v * 2 - 1; up(() => {}); }} />}
      {skin.right === "stick" && <Stick rect={{ x: 190, y: 6, w: 140, h: 140 }} label={`Right ${skin.stickName}`} locked={locked} onMove={(x, y) => { input.current.rx = x; input.current.ry = y; }} />}
      {skin.right === "throttle" && <button className="ctl" style={{ left: 170, top: 20, width: 150, height: 110, borderRadius: 16 }} disabled={locked}
        onPointerDown={() => { input.current.throttle = true; }} onPointerUp={() => { input.current.throttle = false; }} onPointerLeave={() => { input.current.throttle = false; }}><Play size={20} fill="currentColor" style={{ transform: "rotate(-90deg)" }} />Throttle Trigger</button>}
    </div>;
  }

  const actions = !flying ? sec(laptop ? 208 : 220, <div style={{ position: "relative", height: "100%", display: "grid", placeItems: "center" }}>
    {d.brand === "antigravity" && !unlocked
      ? <button className="fh-btn primary" style={{ width: "100%", minHeight: 120, flexDirection: "column" }} onClick={() => setUnlocked(true)}><Lock size={22} />Push Flight Slider up twice</button>
      : <div style={{ position: "relative", width: 150, height: 150 }}>
          <HoldButton wide label="Take off" holdLabel={locked ? lockedWhy : "Hold 1 s"} size={150} className={laptop ? "ctl" : "ctl pause"} disabled={locked} style={{ left: 0, top: 0, borderRadius: laptop ? 8 : 14, ...(laptop ? { background: "#2a2a2a", border: "1px solid #3c3c3c", color: "#fff", fontSize: 14 } : {}) }} icon={<ArrowDownToLine size={28} style={{ transform: "rotate(180deg)" }} />}
            onDone={() => up((p) => { const x = p.sims[p.droneId]; x.phase = "takeoff"; x.startedAt = Date.now(); x.alertsSeen = []; })} />
        </div>}
  </div>, { padding: "12px 16px" }) : sec(laptop ? 232 : 240, <div style={{ display: "grid", gap: 8, height: "100%", alignContent: "center" }}>
    <div style={{ display: "flex", gap: 8 }}>
      {returning
        ? <button className="fh-btn" style={{ flex: 1, minHeight: 56 }} onClick={() => up((p) => alertAction(p, "A5"))}><X size={15} />Cancel return</button>
        : <div style={{ position: "relative", flex: 1, height: 56 }}><HoldButton wide label="Return [R]" holdLabel="Hold" size={56} className="ctl safety" disabled={landing || s.driving} style={{ left: 0, top: 0, width: "100%", borderRadius: 8, flexDirection: "row", gap: 8 }} icon={<Home size={16} />} onDone={() => up((p) => { p.returnSheet = true; })} /></div>}
      <div style={{ position: "relative", flex: 1, height: 56 }}><HoldButton wide label="Land" holdLabel="Hold" activeLabel={landing ? "Landing" : undefined} size={56} className={`ctl safety${landing ? " active" : ""}`} disabled={landing || locked} style={{ left: 0, top: 0, width: "100%", borderRadius: 8, flexDirection: "row", gap: 8 }} icon={<ArrowDownToLine size={16} />} onDone={() => setLandAsk(true)} /></div>
    </div>
    <button aria-label={paused ? "Resume [Space]" : "Pause [Space]"} disabled={landing} onClick={() => setSim((x) => { if (x.phase === "flying" || x.phase === "returning" || x.phase === "takeoff") { x.phase = "paused"; if (x.smartMode) x.smartPaused = true; } else if (x.phase === "paused") x.phase = "flying"; })}
      style={{ minHeight: 72, borderRadius: 8, border: paused ? "2px solid #e00000" : "none", background: paused ? "#2a0d0d" : "#e00000", color: "#fff", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
      {paused ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />}{paused ? "Resume" : "Pause"}<span style={{ fontSize: 12, fontWeight: 600, opacity: .6 }}>[Space]</span>
    </button>
  </div>, { padding: "12px 16px" });

  const strip = (
    <div style={{ position: "absolute", left: 0, right: 0, top: bottomY - dashH, height: dashH, display: "flex", background: "#121212", borderTop: "1px solid rgba(255,255,255,.1)", zIndex: 8 }}>
      {health}{attitude}{sec("1", <><div className="fh-label" style={{ textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>{flying ? (laptop ? "Keyboard controls" : `${skin.appCopied} controls`) : "Before take-off"}</div>{controls}</>)}{actions}
    </div>
  );

  return (
    <div className={`fh desk cockpit${laptop ? "" : " touch"}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
      {s.platform === "tablet" && <StatusBar platform="tablet" dark />}
      {top}{map}{live}{strip}

      {/* Return target */}
      {s.returnSheet && (
        <div className="sheet-back" onClick={() => up((p) => { p.returnSheet = false; })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Return to">
            <div className="t-title">Return to</div>
            <div className="t-cap muted" style={{ marginBottom: 12 }}>{d.nickname} is {m.distance.toFixed(0)} m away at {m.height.toFixed(0)} m</div>
            <div className="group">
              {([["Home", "Where the drone first got GPS", <Home key="h" size={16} />], ["Launch point", "Where it took off", <ArrowDownToLine key="l" size={16} />], ["My position", s.perms.location === "denied" ? "Location is off for Skyhand" : s.moving ? "Not available while moving" : "Where this device is now", <Smartphone key="m" size={16} />], [`Landing spot: ${w.nearest.name}`, `${w.nearest.note} · ${Math.round(w.nearest.dist)} m from the drone`, <MapPin key="ls" size={16} />]] as [string, string, ReactNode][]).map(([t, h, ic]) => {
                const off = t === "My position" && (s.moving || s.perms.location === "denied");
                return <button key={t} className="row" disabled={off} style={{ opacity: off ? .5 : 1 }} onClick={() => up((p) => startReturn(p, t))}><span className="ico">{ic}</span><span style={{ flex: 1 }}><span className="t-label" style={{ display: "block", fontWeight: 600 }}>{t}</span><span className="t-cap muted">{h}</span></span></button>;
              })}
            </div>
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => up((p) => { p.returnSheet = false; })}>Cancel</button>
          </div>
        </div>
      )}
      {/* Land confirm (after the 1 s hold) */}
      {landAsk && (
        <div className="sheet-back" style={{ alignItems: "center" }}>
          <div className="sheet center" role="dialog" aria-label="Land here">
            <div className="t-title">Land here?</div>
            <p className="t-body muted" style={{ fontSize: 14 }}>{d.nickname} will land straight down from {m.height.toFixed(0)} m. Check the ground is clear.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="btn" style={{ flex: 1 }} onClick={() => setLandAsk(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setLandAsk(false); setSim((x) => { x.phase = "landing"; x.smartMode = undefined; }); }}>Land</button></div>
          </div>
        </div>
      )}
      {/* Leave the cockpit mid-flight (FlightHub asks whether to return) */}
      {s.leaveCockpit && (
        <div className="sheet-back" style={{ alignItems: "center" }}>
          <div className="sheet center" role="dialog" aria-label="Leave the cockpit">
            <div className="t-title">Leave the cockpit?</div>
            <p className="t-body muted" style={{ fontSize: 14 }}>{d.nickname} is in the air. Choose what it does while you are away.</p>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-block" onClick={() => up((p) => { startReturn(p, "Home"); p.leaveCockpit = false; p.screen = "hangar"; })}><Home size={16} />Return home and leave</button>
              <button className="btn btn-block" onClick={() => up((p) => { const x = p.sims[p.droneId]; x.phase = "paused"; p.leaveCockpit = false; p.screen = "hangar"; })}><Pause size={16} />Hover and leave</button>
              <button className="btn btn-ghost btn-block" onClick={() => up((p) => { p.leaveCockpit = false; })}>Stay</button>
            </div>
          </div>
        </div>
      )}
      {s.driving && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "#111", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div><div style={{ width: 72, height: 72, borderRadius: 9999, background: "#fff", color: "#111", display: "grid", placeItems: "center", margin: "0 auto" }}><Lock size={32} /></div>
            <div className="t-title" style={{ marginTop: 16 }}>Passenger only</div><p className="t-body muted">Controls and live view are off while you are driving. The drone holds its position.</p></div>
        </div>
      )}
      {s.handoverTo && <Handover />}
      {s.dronePicker && <DronePicker inFlight onClose={() => up((p) => { p.dronePicker = false; })} />}
      {s.toast && <div style={{ position: "absolute", left: mapW + 16, right: 16, top: mainY + 12, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}><div className="alert info" style={{ maxWidth: 480, margin: "0 auto" }}><Icon kind="info" /><div className="t-cap">{s.toast}</div><button className="act">OK</button></div></div>}
    </div>
  );
}
