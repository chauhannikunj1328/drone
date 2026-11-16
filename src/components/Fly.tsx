"use client";
import { useEffect, useState } from "react";
import { COUNTRIES, SKINS } from "@/lib/data";
import { DUO_SYS_W, flyLayout, flyOrientation, frameSize, isCockpit, safeArea, type Rect } from "@/lib/layout";
import { Cockpit } from "./Cockpit";
import { Hud } from "./Hud";
import { activeAlerts, alertAction, droneOf, inAir, skinOf, startReturn, useProto } from "@/lib/store";
import { AlertCard, HoldButton, Icon, Mock, Stick, VSlider } from "./ui";
import { ArrowDownToLine, Camera, ChevronRight, Crosshair, Home, Keyboard, Layers, Lock, MapPin, Maximize2, Pause, Play, Satellite, Smartphone, Sparkles, Video, X } from "lucide-react";
import { Bars, Battery, DroneArt, StatusBar } from "./art";
import { DroneView, RealMap } from "./RealMap";
import { world } from "@/lib/world";
import { DronePicker, SideStatus, foldClass } from "./Screens";
import { ChevronDown, ChevronLeft } from "lucide-react";

function Compass({ heading, w }: { heading: number; w: number }) {
  const marks = []; const step = 15, px = 3;
  for (let a = -180; a <= 540; a += step) { const x = w / 2 + (a - heading) * px; if (x < -10 || x > w + 10) continue;
    const n = ((a % 360) + 360) % 360; const lab = ({ 0: "N", 90: "E", 180: "S", 270: "W" } as Record<number, string>)[n];
    marks.push(<g key={a}><line x1={x} x2={x} y1={lab ? 2 : 6} y2={12} stroke="#fff" strokeOpacity={lab ? 1 : .55} strokeWidth={lab ? 2 : 1} />{(lab || n % 45 === 0) && <text x={x} y={26} textAnchor="middle" fontSize="10" fontWeight={lab ? 800 : 500} fill="#fff" fillOpacity={lab ? 1 : .7}>{lab ?? n}</text>}</g>); }
  return <svg width={w} height={30} aria-label={`Heading ${Math.round(heading)}°`}><defs><linearGradient id="cfade" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".2" stopColor="#fff" /><stop offset=".8" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient><mask id="cm"><rect width={w} height={30} fill="url(#cfade)" /></mask></defs>
    <g mask="url(#cm)">{marks}</g><path d={`M${w / 2 - 5} 0 L${w / 2 + 5} 0 L${w / 2} 6 Z`} fill="#fff" /></svg>;
}

const pos = (r?: Rect) => (r ? { left: r.x, top: r.y, width: r.w, height: r.h } : { display: "none" });

// Laptop and iPad landscape use the command-centre cockpit; phones and Duo keep the touch layout.
export function FlyScreen() {
  const { s } = useProto();
  return isCockpit(s.platform, s.orient) ? <Cockpit /> : <FlyTouch />;
}

function FlyTouch() {
  const { s, up, input } = useProto();
  const d = droneOf(s); const sim = s.sims[s.droneId]; const skin = skinOf(s); const c = COUNTRIES[s.country];
  const fo = flyOrientation(s.platform, s.orient);
  const { W, H } = frameSize(s.platform, fo);
  const lay = flyLayout(s.platform, s.orient, s.mirror, s.halfFold);
  const L = lay.zones;
  const sa = safeArea(s.platform, fo);
  const alerts = activeAlerts(s);
  const critical = alerts.find((a) => a.level === "critical");
  const shown = critical ? [critical] : alerts.filter((a) => a.level !== "critical").slice(0, 2);
  const more = alerts.length - shown.length;
  const flying = inAir(sim.phase);
  const locked = s.moving || s.driving || s.link === "lost";
  const others = s.drones.filter((x) => x.id !== s.droneId && inAir(s.sims[x.id].phase));
  const [flash, setFlash] = useState(false);
  const [recT, setRecT] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => { if (!sim.recording) return; const t = setInterval(() => setRecT((v) => v + 1), 1000); return () => clearInterval(t); }, [sim.recording]);

  // Laptop keyboard (P3 extra): W/S climb, arrows forward and turn, Space pause, R return
  useEffect(() => {
    if (s.platform !== "laptop") return;
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w") input.current.ly = -1; if (k === "s") input.current.ly = 1;
      if (k === "arrowup") input.current.ry = -1; if (k === "arrowdown") input.current.ry = 1;
      if (k === "arrowleft") input.current.lx = -1; if (k === "arrowright") input.current.lx = 1;
      if (k === " ") { e.preventDefault(); up((p) => { const m = p.sims[p.droneId]; if (m.phase === "flying") m.phase = "paused"; else if (m.phase === "paused") m.phase = "flying"; }); }
      if (k === "r") up((p) => { p.returnSheet = true; });
    };
    const upk = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === "w" || k === "s") input.current.ly = 0; if (k === "arrowup" || k === "arrowdown") input.current.ry = 0; if (k === "arrowleft" || k === "arrowright") input.current.lx = 0; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", upk);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", upk); };
  }, [s.platform, input, up]);

  const setSim = (f: (m: typeof sim) => void) => up((p) => f(p.sims[p.droneId]));
  const w = world(s); // real map data for the current country
  const paused = sim.phase === "paused";
  const returning = sim.phase === "returning";
  const landing = sim.phase === "landing";
  const smartList = skin.tray;
  const trayCompact = (L.tray?.w ?? 0) < 150;

  return (
    <div className={`dark desk touch${foldClass(s)}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
      {(s.platform === "duoClosed" || s.platform === "duoOpen") && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: DUO_SYS_W, paddingTop: s.platform === "duoClosed" ? 48 : 12, background: "var(--bar-glass, rgba(12,12,12,.85))", borderLeft: "1px solid var(--line-2, #2a2a2a)", display: "flex", justifyContent: "center", alignItems: "flex-start", zIndex: 30 }}><SideStatus /></div>}
      {/* Z3 video */}
      <div className="video" style={pos(L.video)}
        onPointerDown={(e) => { if (d.is360) { (e.currentTarget as HTMLElement).dataset.x = String(e.clientX); } }}
        onPointerMove={(e) => { if (d.is360 && e.buttons) { const x0 = Number((e.currentTarget as HTMLElement).dataset.x ?? e.clientX); setSim((m) => { m.view = Math.round((m.view + (e.clientX - x0) * 0.6 + 360) % 360); }); (e.currentTarget as HTMLElement).dataset.x = String(e.clientX); } }}>
        <DroneView at={w.me} heading={d.is360 ? sim.view : sim.heading} height={sim.height} gimbal={sim.gimbal} dim={sim.phase === "grounded"} />
        {flying && <Crosshair size={28} strokeWidth={1.2} color="rgba(255,255,255,.7)" style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -14, marginTop: -14, pointerEvents: "none" }} />}
        {L.video && (() => {
          const g = lay.kind === "deck" ? 52 : 64;
          const deck = lay.kind === "deck", split = lay.kind === "split";
          // deck (portrait): stacked under the map thumbnail. split (open Duo landscape): bottom right of the video pane.
          // rails (phones, closed Duo): bottom corners beside the sticks, clear of the stick, shutter and Land buttons.
          const bottomY = (L.stickL?.y ?? 0) + (L.stickL?.h ?? 140) - g;
          const horizonAt = deck ? { right: 8, top: 76 + 60 } : split ? { right: 16 + g + 8, bottom: 24 } : { left: (L.pause?.x ?? 24) + 8, top: bottomY };
          const compassAt = deck ? { right: 8, top: 76 + 60 + g + 6 } : split ? { right: 16, bottom: 24 } : { left: (L.record?.x ?? 0) + 60 - g, top: bottomY };
          return <Hud w={L.video.w} h={L.video.h} heading={d.is360 ? sim.view : sim.heading} tilt={flying ? Math.sin(sim.distance / 7) * 3 + 1 : 0}
            landing={flying ? { dist: Math.round(w.nearest.dist), name: w.nearest.name } : undefined} gauge={g} horizonAt={horizonAt} compassAt={compassAt}
            insetL={s.platform === "duoClosed" ? 8 : sa.l + 6} insetR={s.platform === "duoClosed" ? DUO_SYS_W + 8 : split ? 6 : sa.r + 6}
            top={deck ? 12 : 72} bottom={deck ? 12 : 72} />;
        })()}
        {flash && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.55)", pointerEvents: "none" }} />}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "18%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          {d.is360 && <span className="chip"><Maximize2 size={12} />360° · drag to look · {sim.view}°</span>}
          {sim.smartMode && <span className="chip solid"><Sparkles size={12} />{sim.smartMode}{sim.smartPaused ? " · paused" : ""}</span>}
          {sim.recording && <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 9999, background: "#fff", boxShadow: "0 0 0 2px rgba(255,255,255,.3)" }} />REC {String(Math.floor(recT / 60)).padStart(2, "0")}:{String(recT % 60).padStart(2, "0")}</span>}
        </div>
        {lay.kind !== "rails" && <span className="t-micro hud-text" style={{ position: "absolute", ...(lay.kind === "split" ? { left: 180, right: 12, bottom: 100, textAlign: "right" } : { left: 0, right: 0, bottom: lay.kind === "deck" ? 4 : 16, textAlign: "center" }), opacity: .6, pointerEvents: "none" }}>Simulated view · real map imagery</span>}
        {sim.smartMode && ["Shadow Track and Follow", "Deep Track", "FocusTrack", "Cameraman"].includes(sim.smartMode) && (
          <div style={{ position: "absolute", left: "44%", top: "52%", width: 64, height: 80, border: "2px solid #fff", borderRadius: 10, boxShadow: "0 0 0 1px rgba(0,0,0,.4)" }}>
            <span className="t-cap" style={{ position: "absolute", top: -18, left: 0, whiteSpace: "nowrap", color: "#fff" }}>{d.brand === "skydio" ? "Following" : "Subject locked"}</span>
          </div>
        )}
      </div>

      {/* Z1 status band */}
      {fo === "portrait" && <StatusBar platform={s.platform} dark />}
      <div className="z" style={{ ...pos(L.status), display: "flex", alignItems: "center", gap: 10, padding: "0 6px 0 12px", fontSize: 12, fontWeight: 600, zIndex: 5,
        background: "linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.25))", borderRadius: 14, backdropFilter: "blur(10px)", border: "1px solid var(--glass-line)" }}>
        <button data-hit aria-label={flying ? "Back to Hangar. The flight continues." : "Back to Hangar"} title="Hangar" onClick={() => up((p) => { p.screen = "hangar"; p.returnSheet = false; })}
          style={{ width: 32, height: 32, marginLeft: -6, borderRadius: 9999, border: "none", background: "rgba(255,255,255,.12)", color: "var(--hud-fg, #fff)", display: "grid", placeItems: "center", flex: "none" }}><ChevronLeft size={18} /></button>
        <button data-hit aria-label={`${d.nickname}. Change drone`} onClick={() => up((p) => { p.dronePicker = true; })}
          style={{ display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 8px 0 4px", borderRadius: 10, border: "none", background: "transparent", color: "var(--hud-fg, #fff)", textAlign: "left", flex: "none" }}>
          <span style={{ width: 30, height: 26, borderRadius: 7, background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center" }}><DroneArt brand={d.brand} size={28} /></span>
          <span style={{ lineHeight: "13px" }}><span style={{ display: "block", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{d.nickname}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 500, opacity: .75, whiteSpace: "nowrap" }}><Icon kind={sim.phase === "grounded" ? "landed" : sim.phase === "returning" ? "returning" : "flying"} size={9} />{sim.phase === "grounded" ? "On ground" : sim.phase === "paused" ? "Hovering" : sim.phase === "takeoff" ? "Taking off" : sim.phase[0].toUpperCase() + sim.phase.slice(1)}</span></span>
          <ChevronDown size={14} style={{ opacity: .8 }} />
        </button>
        <span style={{ width: 1, alignSelf: "stretch", margin: "8px 0", background: "var(--glass-line)" }} />
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Battery pct={d.battery} size={12} /><span className="num">{Math.round(d.battery)}%</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 4, opacity: s.link === "lost" ? .5 : 1 }}><Bars level={s.link === "strong" ? 4 : s.link === "weak" ? 1 : 0} size={11} />{(L.status?.w ?? 0) >= 460 && (s.link === "lost" ? "No link" : s.link === "weak" ? "Weak" : "HD")}</span>
        {(L.status?.w ?? 0) > 420 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Satellite size={13} />18<Mock /></span>}
        <span style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "hidden" }}>{(L.status?.w ?? 0) > 640 && !shown.length && <Compass heading={sim.heading} w={Math.min(260, (L.status?.w ?? 0) - 560)} />}</span>
        {skin.readOnlyMode && (L.status?.w ?? 0) > 520 && <span className="chip dashed" style={{ borderColor: "rgba(255,255,255,.5)" }}>{skin.readOnlyMode}</span>}
        <span className="chip"><MapPin size={11} />{c.code}{(L.status?.w ?? 0) >= 460 ? ` · ${c.maxAltitude} m` : ""}</span>
      </div>

      {/* Alert slot (never over Z2) */}
      <div className="z" style={{ left: L.alert?.x, top: L.alert?.y, width: Math.max(L.alert?.w ?? 260, 280), zIndex: 30, display: "flex", flexDirection: "column", gap: 6 }}>
        {shown.map((a) => <AlertCard key={a.id} a={a} onAct={() => up((p) => alertAction(p, a.id))} />)}
        {more > 0 && <span className="chip solid" style={{ alignSelf: "center" }}>+{more} more</span>}
      </div>

      {/* Mode selector, under the status band, centred */}
      <div className="z" style={{ left: (L.status?.x ?? 0) + (L.status?.w ?? 0) / 2 - 110, top: (L.status?.y ?? 0) + 50, width: 220, display: "flex", justifyContent: "center", zIndex: 4, visibility: shown.length ? "hidden" : "visible" }}>
        <div className="seg dark" style={{ background: "var(--glass)", backdropFilter: "blur(14px)", border: "1px solid var(--glass-line)", borderRadius: 9999 }} aria-label={skin.modeLabel}>
          {skin.modes.map((m, i) => (
            <button key={m.name} data-hit className={sim.mode === i ? "on" : ""} style={{ minHeight: 28, padding: "0 10px", fontSize: 11, borderRadius: 9999, fontWeight: 600 }}
              onClick={() => setSim((x) => { x.mode = i; })}>{m.name}</button>
          ))}
        </div>
      </div>

      {/* Z2 safety cluster */}
      <button data-hit className={`ctl pause stop${paused ? " active" : ""}`} style={{ ...pos(L.pause), zIndex: 20 }} disabled={!flying || landing}
        onClick={() => setSim((m) => { if (m.phase === "flying" || m.phase === "returning" || m.phase === "takeoff") { m.phase = "paused"; if (m.smartMode) m.smartPaused = true; } else if (m.phase === "paused") m.phase = "flying"; })}>
        {paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}{paused ? "Resume" : "Pause"}
      </button>
      {returning
        ? <button data-hit className="ctl safety active" style={{ ...pos(L.return), zIndex: 20 }} onClick={() => up((p) => alertAction(p, "A5"))}><X size={18} />Cancel</button>
        : <HoldButton label="Return" holdLabel="Hold" size={56} icon={<Home size={18} />} disabled={!flying || landing || s.driving} style={{ ...pos(L.return), zIndex: 20 }} onDone={() => up((p) => { p.returnSheet = true; })} />}
      <HoldButton label="Land" holdLabel="Hold" icon={<ArrowDownToLine size={18} />} activeLabel={landing ? "Landing" : undefined} size={56} disabled={!flying || landing || locked} className={`ctl safety${landing ? " active" : ""}`} style={{ ...pos(L.land), zIndex: 20 }}
        onDone={() => setSim((m) => { m.phase = "landing"; m.smartMode = undefined; })} />

      {/* Z4 camera stack */}
      <button data-hit className="ctl" aria-label={skin.record} title={skin.record} style={{ ...pos(L.record), border: "3px solid var(--hud-fg, #fff)" }} onClick={() => { setRecT(0); setSim((m) => { m.recording = !m.recording; }); }} disabled={!flying}>
        <span style={{ width: sim.recording ? 18 : 30, height: sim.recording ? 18 : 30, borderRadius: sim.recording ? 4 : 9999, background: "var(--hud-fg, #fff)", transition: "all .15s" }} />
      </button>
      <button data-hit className="ctl" aria-label={skin.shutter} title={skin.shutter} style={{ ...pos(L.shutter), border: "3px solid var(--hud-fg, #fff)", background: "rgba(0,0,0,.25)" }} disabled={!flying}
        onClick={() => { setSim((m) => { m.photos += 1; }); setFlash(true); setTimeout(() => setFlash(false), 180); }}>
        <span style={{ width: 48, height: 48, borderRadius: 9999, background: "var(--hud-fg, #fff)", boxShadow: "inset 0 -3px 6px rgba(0,0,0,.15)" }} />
      </button>
      <button data-hit className="ctl" aria-label={skin.toggle} title={skin.toggle} style={{ ...pos(L.toggle), fontSize: 9 }} onClick={() => setSim((m) => { m.videoMode = !m.videoMode; })}>
        {d.brand === "autel" ? <Layers size={18} /> : sim.videoMode ? <Video size={18} /> : <Camera size={18} />}
      </button>
      {L.record && <div className="z t-micro hud-text" style={{ left: L.record.x - 20, top: L.record.y + L.record.h + 2, width: L.record.w + 40, textAlign: "center", opacity: .75, pointerEvents: "none" }}>{sim.photos} photos</div>}
      {L.slider && <VSlider rect={L.slider} labelSide={L.slider.x > (L.status ? L.status.x + L.status.w / 2 : 0) ? "left" : "right"} label={skin.slider} value={1 - sim.gimbal / 90} onChange={(v) => setSim((m) => { m.gimbal = Math.round((1 - v) * 90); })} />}
      {L.slider2 && skin.slider2 && <VSlider rect={L.slider2} labelSide={L.slider2.x > (L.status ? L.status.x + L.status.w / 2 : 0) ? "left" : "right"} label={skin.slider2} value={(sim.zoom - 1) / 3} onChange={(v) => setSim((m) => { m.zoom = +(1 + v * 3).toFixed(1); })} />}

      {/* Z5 and Z8: sticks or brand controls */}
      {L.stickL && skin.left === "stick" && <Stick rect={L.stickL} label={`Left ${skin.stickName}`} locked={locked || !flying} onMove={(x, y) => { input.current.lx = x; input.current.ly = y; }} />}
      {L.stickR && skin.right === "stick" && <Stick rect={L.stickR} label={`Right ${skin.stickName}`} locked={locked || !flying} onMove={(x, y) => { input.current.rx = x; input.current.ry = y; }} />}
      {L.stickL && skin.left === "flightSlider" && (
        <VSlider rect={{ x: L.stickL.x + 48, y: L.stickL.y - 10, w: 44, h: 160 }} label="Flight Slider" value={(input.current.slider + 1) / 2} springTo={0.5} locked={locked || !flying}
          onChange={(v) => { input.current.slider = v * 2 - 1; up(() => {}); }} />
      )}
      {L.stickR && skin.right === "throttle" && (
        <button data-hit className={`ctl${locked || !flying ? " locked" : ""}`} style={{ ...pos(L.stickR) }} disabled={locked || !flying}
          onPointerDown={() => { input.current.throttle = true; }} onPointerUp={() => { input.current.throttle = false; }} onPointerLeave={() => { input.current.throttle = false; }}>
          <Play size={22} fill="currentColor" style={{ transform: "rotate(-90deg)" }} />Throttle Trigger<span style={{ fontSize: 9, fontWeight: 500, opacity: .7, padding: "0 14px" }}>Hold to fly where you look</span>
        </button>
      )}
      {skin.left === "none" && L.stickL && (
        <div className="z t-cap glass" style={{ ...pos(L.stickL), display: "flex", flexDirection: "column", gap: 6, alignItems: "center", justifyContent: "center", textAlign: "center", color: "var(--hud-fg-2, rgba(255,255,255,.8))", padding: 12 }}>
          <Lock size={18} />No sticks. The X10 is monitor and mission-start only in this concept.
        </div>
      )}
      {L.keys && <div className="z glass t-cap" style={{ ...pos(L.keys), display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 8 }}>
        <Keyboard size={16} />{[["W S", "climb"], ["↑ ↓", "forward"], ["← →", "turn"], ["Space", "pause"], ["R", "return"]].map(([k, v]) => <span key={k} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><kbd style={{ border: "1px solid rgba(255,255,255,.4)", borderBottomWidth: 2, borderRadius: 5, padding: "0 5px", font: "600 11px system-ui" }}>{k}</kbd><span style={{ opacity: .7 }}>{v}</span></span>)}<Mock label="P3" /></div>}

      {/* Z6 map PiP */}
      {!L.panel2 && <button data-hit className="z" style={{ ...pos(L.map), padding: 0, overflow: "hidden", border: "2px solid rgba(255,255,255,.9)", borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}
        onClick={() => up((p) => { p.fullMap = true; })} aria-label="Open map">
        <RealMap center={w.spot.home} zoom={16} drones={w.drones.filter((x) => x.id === s.droneId)} homes={[w.myHome]} interactive={false} attribution={false} follow={w.me} />
        <Maximize2 size={12} color="#141414" style={{ position: "absolute", right: 5, top: 5 }} />
      </button>}

      {/* Telemetry readout */}
      {(L.telemetry?.h ?? 0) > 60 ? (
        <div className="z glass" style={{ ...pos(L.telemetry), padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignContent: "center", gap: "6px 10px" }}>
          {[["Height", sim.height.toFixed(1), "m"], ["Distance", sim.distance.toFixed(0), "m"], ["Speed", sim.hSpeed.toFixed(1), "m/s"], ["Vertical", sim.vSpeed.toFixed(1), "m/s"], ["Heading", sim.heading.toFixed(0), "°"], ["Gimbal", `−${sim.gimbal}`, "°"]].map(([k, v, u]) => (
            <div key={k}><div className="t-micro" style={{ opacity: .6 }}>{k}</div><span className="num" style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>{v}</span><span className="t-micro" style={{ opacity: .6 }}> {u}</span></div>))}
        </div>) :
      <div className="z glass" style={{ ...pos(L.telemetry), display: "flex", alignItems: "center", justifyContent: "space-around", gap: 6, flexWrap: "nowrap", overflow: "hidden", padding: "0 8px", borderRadius: 12 }}>
        {[["H", sim.height.toFixed(1), "m"], ["D", sim.distance.toFixed(0), "m"], ["H.S", sim.hSpeed.toFixed(1), "m/s"], ...((L.telemetry?.w ?? 0) >= 240 ? [["V.S", sim.vSpeed.toFixed(1), "m/s"]] : [])].map(([k, v, u]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "baseline", gap: 3, whiteSpace: "nowrap" }}><span className="t-micro" style={{ opacity: .6 }}>{k}</span><span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{v}</span>{(L.telemetry?.w ?? 0) >= 220 && <span className="t-micro" style={{ opacity: .6 }}>{u}</span>}</span>))}
      </div>}

      {/* Z7 skin tray */}
      {L.tray && (trayCompact
        ? <div className="tray" style={{ ...pos(L.tray), justifyContent: "center" }}><button data-hit aria-label="Smart modes" title="Smart modes" style={{ width: (L.tray?.w ?? 0) < 130 ? 44 : undefined, padding: (L.tray?.w ?? 0) < 130 ? 0 : undefined, justifyContent: "center" }} onClick={() => up((p) => { p.traySheet = true; })}><Sparkles size={16} />{(L.tray?.w ?? 0) >= 130 && "Smart modes"}</button></div>
        : <div className="tray" style={pos(L.tray)} aria-label="Smart modes">
            {smartList.map((t) => (
              <button key={t.name} data-hit className={`${sim.smartMode === t.name ? "on" : ""}${t.disabled ? " off" : ""}`} title={t.sub ?? t.disabled}
                onClick={() => t.disabled ? up((p) => { p.toast = t.disabled; }) : setSim((m) => { if (!inAir(m.phase)) return; m.smartMode = m.smartMode === t.name ? undefined : t.name; m.smartPaused = false; })}>{t.disabled ? <Lock size={12} /> : sim.smartMode === t.name ? <Sparkles size={12} /> : null}{t.name}</button>
            ))}
          </div>)}

      {/* Other drones (monitor strip or panel) */}
      {others.length > 0 && !(sim.phase === "grounded" && !L.panel3 && s.platform !== "duoOpen") && <OtherDrones rect={L.panel3 ?? (s.platform === "duoOpen" ? L.panel : L.others)} />}
      {(s.platform === "tablet" || s.platform === "laptop") && <>
        {fo === "landscape" && <div className="z" style={{ left: (L.panel?.x ?? 0) - 8, top: 0, width: (L.panel?.w ?? 0) + 16, height: H, background: "var(--grey-950)", borderLeft: "1px solid var(--glass-line)" }} />}
        <button data-hit className="z card" style={{ ...pos(L.panel), padding: 0, overflow: "hidden", textAlign: "left" }} onClick={() => up((p) => { p.fullMap = true; })}>
          <RealMap center={w.spot.home} zoom={16} drones={w.drones} homes={w.homes} landing={w.landing} noFly={w.noFly} path={w.path} follow={w.me} interactive={false} />
          <div style={{ position: "absolute", left: 10, top: 10, right: 10, display: "flex", justifyContent: "space-between" }}><span className="chip" style={{ background: "#fff", color: "#141414" }}><MapPin size={11} />Map <Mock /></span><Maximize2 size={14} color="#141414" /></div>
        </button>
        <div className="z card" style={{ ...pos(L.panel2), padding: 14 }}>
          <div className="t-over muted">Telemetry</div>
          <div style={{ display: "grid", gridTemplateColumns: (L.panel2?.h ?? 0) < 180 ? "1fr 1fr 1fr" : "1fr 1fr", gap: "10px 12px", marginTop: 10 }}>
            {[["Height", sim.height.toFixed(1), "m"], ["Distance", sim.distance.toFixed(0), "m"], ["Speed", sim.hSpeed.toFixed(1), "m/s"], ["Vertical", sim.vSpeed.toFixed(1), "m/s"], ["Heading", sim.heading.toFixed(0), "°"], ["Zoom", String(sim.zoom), "x"]].map(([k, v, u]) => (
              <div key={k}><div className="t-cap muted">{k}</div><div><span className="num" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>{v}</span><span className="t-cap muted"> {u}</span></div></div>))}
          </div>
        </div>
        {others.length === 0 && <div className="z card" style={{ ...pos(L.panel3), padding: 14 }}><div className="t-over muted">Other drones</div><div className="t-cap muted" style={{ marginTop: 8 }}>None in the air</div></div>}
      </>}
      {s.platform === "duoOpen" && others.length === 0 && <div className="z card t-cap muted" style={{ ...pos(L.panel), padding: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon kind="pending" size={14} />Other drones: none in the air</div>}

      {/* Take-off overlay */}
      {sim.phase === "grounded" && (L.video?.h ?? H) < 300 && (
        <div className="z glass" style={{ left: (L.video?.x ?? 0) + 12, right: 12, top: (L.video?.y ?? 0) + (L.video?.h ?? H) - 104, height: 92, zIndex: 25, display: "flex", alignItems: "center", gap: 12, padding: "0 10px 0 16px", background: "var(--glass-strong)", borderRadius: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">Ready to fly</div><div className="t-cap muted">{locked ? `Blocked: ${s.moving ? "phone is moving" : s.driving ? "driving" : "no link"}` : skin.takeoffNote}</div></div>
          {d.brand === "antigravity" && !unlocked
            ? <button className="btn btn-primary btn-sm" data-hit onClick={() => setUnlocked(true)}><Lock size={14} />Unlock</button>
            : <div style={{ position: "relative", width: 72, height: 72, flex: "none" }}><HoldButton label="Take off" holdLabel="Hold" size={72} className="ctl pause" disabled={locked} style={{ left: 0, top: 0 }} icon={<ArrowDownToLine size={20} style={{ transform: "rotate(180deg)" }} />}
                onDone={() => up((p) => { const m = p.sims[p.droneId]; m.phase = "takeoff"; m.startedAt = Date.now(); m.alertsSeen = []; })} /></div>}
        </div>
      )}
      {sim.phase === "grounded" && (L.video?.h ?? H) >= 300 && (
        <div className="z" style={{ left: (L.video?.x ?? 0) + (L.video?.w ?? W) / 2 - 150, top: Math.max((L.video?.y ?? 0) + 56, Math.min((L.video?.y ?? 0) + (L.video?.h ?? H) / 2 - 110, (L.stickL?.y ?? H) - 208)), width: 300, zIndex: 25, textAlign: "center" }}>
          <div className="glass" style={{ padding: 18, borderRadius: 22, background: "var(--glass-strong)", boxShadow: "var(--shadow-3)" }}>
            <div className="t-over muted">{d.nickname} · {Math.round(d.battery)}%</div>
            <div className="t-title" style={{ marginTop: 2 }}>Ready to fly</div>
            <div className="t-cap muted" style={{ margin: "4px 0 14px" }}>{skin.takeoffNote}{lay.kind === "rails" ? " Simulated view, real map imagery." : ""}</div>
            {others.length > 0 && !L.panel3 && s.platform !== "duoOpen" && <div className="t-cap" style={{ margin: "-6px 0 12px", display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}><Icon kind="flying" size={11} />{others.map((o) => `${o.nickname} is flying`).join(" · ")}</div>}
            {d.brand === "antigravity" && !unlocked
              ? <button className="btn btn-primary btn-block" data-hit onClick={() => setUnlocked(true)}><Lock size={16} />Push Flight Slider up twice</button>
              : <div style={{ position: "relative", width: 72, height: 72, margin: "4px auto 0" }}>
                  <HoldButton label="Take off" holdLabel="Hold" size={72} className="ctl pause" disabled={locked} style={{ left: 0, top: 0 }} icon={<ArrowDownToLine size={22} style={{ transform: "rotate(180deg)" }} />}
                    onDone={() => up((p) => { const m = p.sims[p.droneId]; m.phase = "takeoff"; m.startedAt = Date.now(); m.alertsSeen = []; })} />
                </div>}
            {locked && <div className="t-cap" style={{ marginTop: 8 }}>Take off is blocked: {s.moving ? "the phone is moving" : s.driving ? "driving" : "no link"}.</div>}
          </div>
        </div>
      )}

      {/* Lock overlay (never over Z2) */}
      {s.moving && flying && (
        <div className="z" style={{ left: (L.video?.x ?? 0) + (L.video?.w ?? W) / 2 - 140, top: (L.video?.y ?? 0) + (L.video?.h ?? H) / 2 - 10, width: 280, zIndex: 24, textAlign: "center" }}>
          <div className="glass" style={{ padding: 14, backgroundImage: "var(--hatch-dark)", background: "var(--glass-strong)" }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Smartphone size={18} /><span className="t-head">Controls locked</span></div>
            <div className="t-cap">The phone is moving. Pause and Return still work.</div>
          </div>
        </div>
      )}
      {s.driving && (
        <div className="z" style={{ inset: 0, zIndex: 50, background: "var(--grey-900)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
          <div><div style={{ width: 72, height: 72, borderRadius: 9999, background: "#fff", color: "#141414", display: "grid", placeItems: "center", margin: "0 auto" }}><Lock size={32} /></div><div className="t-title" style={{ marginTop: 14 }}>Passenger only</div>
            <p className="t-body muted">Controls and live view are off while you are driving. The drone holds its position.</p>
            <p className="t-cap muted">Turn off “Driving” in the prototype panel to continue.</p></div>
        </div>
      )}

      {/* Return panel */}
      {s.returnSheet && (
        <div className="sheet-back" onClick={() => up((p) => { p.returnSheet = false; })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Return to">
            <div className="t-title">Return to</div>
            <div className="t-cap muted" style={{ marginBottom: 10 }}>{d.nickname} is {sim.distance.toFixed(0)} m away at {sim.height.toFixed(0)} m</div>
            <div className="group">
            {[["Home", "Where the drone first got GPS", <Home key="h" size={16} />], ["Launch point", "Where it took off", <ArrowDownToLine key="l" size={16} />], ["My position", s.perms.location === "denied" ? "Location is off for Skyhand" : s.moving ? "Not available while moving" : "Where this phone is now", <Smartphone key="m" size={16} />], [`Landing spot: ${w.nearest.name}`, `${w.nearest.note} · ${Math.round(w.nearest.dist)} m from the drone`, <MapPin key="ls" size={16} />]].map(([t, h, ic]) => {
              const off = t === "My position" && (s.moving || s.perms.location === "denied");
              return <button key={t as string} className="row" data-hit disabled={off} style={{ opacity: off ? .5 : 1, backgroundImage: off ? "var(--hatch-light)" : undefined }}
                onClick={() => up((p) => startReturn(p, t as string))}><span className="ico">{ic}</span><span style={{ flex: 1 }}><span className="t-label" style={{ display: "block", fontWeight: 600 }}>{t}</span><span className="t-cap muted">{h}</span></span><ChevronRight size={18} color="var(--grey-400)" /></button>;
            })}
            </div>
            <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => up((p) => { p.returnSheet = false; })}>Cancel</button>
          </div>
        </div>
      )}

      {/* Full map */}
      {s.fullMap && (
        <div className="sheet-back" style={{ alignItems: "stretch" }}>
          <div className="light" style={{ flex: 1, position: "relative" }}>
            <RealMap center={w.spot.home} zoom={16.5} drones={w.drones} homes={w.homes} landing={w.landing} noFly={w.noFly} path={w.path} follow={w.me} tools />
            <div className="card" style={{ position: "absolute", left: 16, top: 16, padding: "10px 14px" }}><div className="t-head">Map <Mock /></div><div className="t-cap muted">{d.nickname} · {sim.height.toFixed(0)} m · {sim.distance.toFixed(0)} m from Home</div></div>
            <div className="card" style={{ position: "absolute", left: 16, bottom: 16, padding: "8px 12px", display: "flex", gap: 14 }} >
              <span className="t-cap" style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 14, height: 14, borderRadius: 9999, background: "#141414" }} />Home</span>
              <span className="t-cap" style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 9999, border: "3px solid #141414" }} />You</span>
              <span className="t-cap" style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 14, height: 14, borderRadius: 4, backgroundImage: "var(--hatch-light)", border: "1.5px dashed #141414" }} />No-fly</span>
            </div>
            <button className="icon-btn" aria-label="Close map" style={{ position: "absolute", right: 16, top: 16, width: 44, height: 44, background: "#141414", color: "#fff", boxShadow: "var(--shadow-2)" }} onClick={() => up((p) => { p.fullMap = false; })}><X size={20} /></button>
          </div>
        </div>
      )}

      {/* Smart modes sheet (compact tray) */}
      {s.traySheet && (
        <div className="sheet-back" onClick={() => up((p) => { p.traySheet = false; })}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="t-title">Smart modes</div>
            <div className="group" style={{ marginTop: 10 }}>
            {smartList.map((t) => <button key={t.name} className="row" data-hit disabled={!!t.disabled || !flying} style={{ opacity: t.disabled || !flying ? .5 : 1 }}
              onClick={() => up((p) => { const m = p.sims[p.droneId]; m.smartMode = t.name; m.smartPaused = false; p.traySheet = false; })}><span className="ico">{t.disabled ? <Lock size={16} /> : <Sparkles size={16} />}</span><span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block", fontWeight: 600 }}>{t.name}</span><span className="t-cap muted">{t.disabled ?? t.sub ?? ""}</span></span><ChevronRight size={18} color="var(--grey-400)" /></button>)}
            </div>
          </div>
        </div>
      )}

      {/* Handover */}
      {s.handoverTo && <Handover />}
      {s.dronePicker && <DronePicker inFlight onClose={() => up((p) => { p.dronePicker = false; })} />}
      {s.toast && (
        <div className="z" style={{ left: 16, right: 16, bottom: 16, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}>
          <div className="alert info"><Icon kind="info" /><div className="t-cap">{s.toast}</div><button className="act">OK</button></div>
        </div>
      )}
    </div>
  );
}

function OtherDrones({ rect }: { rect?: Rect }) {
  const { s, up } = useProto();
  const others = s.drones.filter((x) => x.id !== s.droneId && inAir(s.sims[x.id].phase));
  if (!rect) return null;
  return (
    <div className="z" style={{ ...pos(rect), display: "flex", flexDirection: rect.h > 100 ? "column" : "row", gap: 6, overflow: "auto", zIndex: 6 }} aria-label="Other drones">
      {others.map((o) => {
        const m = s.sims[o.id];
        return (
          <div key={o.id} className="glass" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", minWidth: 220 }}>
            <button data-hit className="t-cap" style={{ background: "none", border: "none", textAlign: "left", flex: 1, color: "var(--hud-fg, #fff)" }} onClick={() => up((p) => { p.handoverTo = o.id; })}>
              <b>{o.nickname}</b> · {Math.round(o.battery)}% · {m.phase === "returning" ? "Returning" : m.smartMode ?? "Holding"}{o.battery <= 25 ? " · Battery low" : ""}
            </button>
            <button data-hit className="chip" style={{ minHeight: 30 }} onClick={() => up((p) => { p.sims[o.id].phase = "paused"; p.sims[o.id].smartPaused = true; })}>Hold</button>
            <button data-hit className="chip" style={{ minHeight: 30 }} onClick={() => up((p) => startReturn(p, "Home", o.id))}>Return</button>
          </div>
        );
      })}
    </div>
  );
}

export function Handover() {
  const { s, up } = useProto();
  const to = droneOf(s, s.handoverTo); const from = droneOf(s);
  return (
    <div className="sheet-back" style={{ alignItems: "center" }}>
      <div className="sheet center" role="dialog" aria-label="Switch drone">
        <div className="t-title">Switch drone?</div>
        <p className="t-body">{from.nickname} will hover until you switch back. Controls change to the {SKINS[to.brand].appCopied} layout.</p>
        {to.monitorOnly && <p className="t-cap muted">{to.model}: monitor and mission-start only in this concept.</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => up((p) => { p.handoverTo = undefined; })}>Cancel</button>
          <button className="btn btn-primary" onClick={() => up((p) => {
            const old = p.sims[p.droneId]; if (inAir(old.phase) && old.phase !== "returning" && old.phase !== "landing") old.phase = "paused";
            p.droneId = p.handoverTo!; p.handoverTo = undefined; p.skin = "auto"; p.returnSheet = false;
          })}>Switch</button>
        </div>
      </div>
    </div>
  );
}
