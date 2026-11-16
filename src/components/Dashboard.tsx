"use client";
// Command centre screens for laptop and iPad (standard design, after DJI FlightHub 2; see 17-flighthub2-analysis.md):
// Dashboard (map canvas + glass panels), Watch wall (1 or 4 live views), laptop Hangar workspace (list + map + detail).
import type { ReactNode } from "react";
import { ChevronRight, Grid2x2, MapPin, Maximize2, Navigation, Plus, Square, Wifi } from "lucide-react";
import { BRAND_ACCOUNT, COUNTRIES, FLAG_WORD, SKINS, requiredDocs, type Drone } from "@/lib/data";
import { frameSize } from "@/lib/layout";
import { activeAlerts, droneOf, inAir, startReturn, useProto, type Proto } from "@/lib/store";
import { Battery, DroneArt, DroneHero, PhotoCredit, Scene } from "./art";
import { BigStat, Bars7, Panel, Ring, Swatch, type RingSeg } from "./fh";
import { DroneView, RealMap } from "./RealMap";
import { world } from "@/lib/world";
import { Page, droneActionFor } from "./Screens";
import { Icon, Mock } from "./ui";

// ---------- shared helpers ----------
type Bucket = "air" | "ready" | "notready" | "offline";
const bucketOf = (s: Proto, d: Drone): Bucket => inAir(s.sims[d.id].phase) ? "air" : d.status === "Ready" || d.status === "Limited" ? "ready" : d.status === "Offline" ? "offline" : "notready";
const BUCKET: Record<Bucket, { label: string; style: RingSeg["style"] }> = {
  air: { label: "In the air", style: "solid" }, ready: { label: "Ready", style: "light" }, notready: { label: "Not ready", style: "hatch" }, offline: { label: "Offline", style: "dash" },
};
const fmt = (n: number) => n.toLocaleString("en-US");


// ---------- Dashboard ----------
const WEEK = { flights: [2, 4, 1, 5, 3, 6, 4], hours: [0.4, 0.9, 0.2, 1.1, 0.6, 1.4, 0.8], km: [3, 7, 1, 9, 5, 12, 6], media: [40, 96, 12, 140, 70, 210, 118] };

export function DashboardScreen() {
  const { s, up } = useProto();
  const { W } = frameSize(s.platform, s.orient);
  const cw = W - (s.platform === "laptop" ? 232 : 0);
  const wide = cw >= 1000;
  const c = COUNTRIES[s.country];
  const counts = { air: 0, ready: 0, notready: 0, offline: 0 } as Record<Bucket, number>;
  s.drones.forEach((d) => { counts[bucketOf(s, d)]++; });
  const segs: RingSeg[] = (Object.keys(BUCKET) as Bucket[]).map((k) => ({ label: BUCKET[k].label, value: counts[k], style: BUCKET[k].style }));
  const flightsWeek = WEEK.flights.reduce((a, b) => a + b, 0) + s.flights.length;
  const docsMissing = requiredDocs(c, droneOf(s), s.resident).filter((x) => !s.docs.includes(x));
  const alertRows: { icon: ReactNode; text: string; sub: string; go: (p: Proto) => void }[] = [
    ...activeAlerts(s).filter((a) => a.level !== "info").map((a) => ({ icon: <Icon kind={a.level} size={16} />, text: `${droneOf(s).nickname}: ${a.title}`, sub: a.message, go: (p: Proto) => { p.screen = "fly"; } })),
    ...s.drones.filter((d) => d.status === "Not ready").map((d) => ({ icon: <Icon kind="notready" size={16} />, text: `${d.nickname}: not ready`, sub: d.statusReason === "battery" ? `Battery ${Math.round(d.battery)}%` : d.statusReason ?? "", go: (p: Proto) => { p.droneId = d.id; p.screen = "hangar"; } })),
    ...s.drones.filter((d) => !d.firmwareOk).map((d) => ({ icon: <Icon kind="warning" size={16} />, text: `${d.nickname}: firmware update`, sub: d.model, go: (p: Proto) => { p.droneId = d.id; p.screen = "hangar"; } })),
  ];
  const recent = [...s.flights.map((f) => ({ k: f.id, t: f.nickname, sub: `${f.country} · ${Math.floor(f.seconds / 60)}:${String(f.seconds % 60).padStart(2, "0")} · ${f.maxH} m`, when: "Today" })),
    { k: "m1", t: "City Park", sub: "Park drone · 12:40 · 64 m", when: "Yesterday" }, { k: "m2", t: "Lakeside trail", sub: "360 cam · 08:12 · 42 m", when: "Sat" }, { k: "m3", t: "Wedding venue", sub: "Survey · 16:05 · 55 m", when: "12 Nov" }].slice(0, 4);

  const left = (
    <>
      <Panel title="Fleet" right={<span className="fh-label">{s.drones.length} drones</span>}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Ring segs={segs} center={String(s.drones.length)} sub="drones" />
          <div style={{ display: "grid", gap: 8, flex: 1 }}>
            {(Object.keys(BUCKET) as Bucket[]).map((k) => <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}><Swatch st={BUCKET[k].style} /><span style={{ flex: 1, color: "rgba(255,255,255,.75)" }}>{BUCKET[k].label}</span><b className="num">{counts[k]}</b></div>)}
          </div>
        </div>
      </Panel>
      <Panel title="This week" right={<span className="fh-label">Mon to Sun <Mock /></span>}>
        <div style={{ display: "grid", gap: 12 }}>
          <BigStat label="Flights" value={String(flightsWeek)} spark={WEEK.flights} />
          <BigStat label="Flight time" value={WEEK.hours.reduce((a, b) => a + b, 0).toFixed(1)} unit="h" spark={WEEK.hours} />
          <BigStat label="Distance" value={String(WEEK.km.reduce((a, b) => a + b, 0))} unit="km" spark={WEEK.km} />
        </div>
      </Panel>
      <Panel title="Media" right={<Mock />}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 16 }}><div><div className="fh-label">Photos</div><div className="fh-num">{fmt(1248)}</div></div><div><div className="fh-label">Videos</div><div className="fh-num">86</div></div></div>
          <Bars7 data={WEEK.media} w={96} />
        </div>
      </Panel>
    </>
  );
  const right = (
    <>
      <Panel title="Needs attention" right={<span className="fh-label">{alertRows.length}</span>} pad={0}>
        {alertRows.length === 0 ? <div className="fh-row"><Icon kind="pass" size={16} />All drones are fine</div> :
          alertRows.slice(0, 4).map((a, i) => <button key={i} className="fh-row" onClick={() => up(a.go)} style={{ width: "100%", background: "none", border: "none", color: "#fff", textAlign: "left", borderTop: i ? "1px solid rgba(255,255,255,.07)" : "none" }}>
            {a.icon}<span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 600 }}>{a.text}</span><span className="fh-label">{a.sub}</span></span><ChevronRight size={14} style={{ opacity: .5 }} /></button>)}
      </Panel>
      <Panel title={`Rules · ${c.name}`} right={<span className={`fh-chip${c.level === "cant" ? " on" : ""}`} style={{ height: 24, borderStyle: c.level === "rules" ? "dashed" : "solid" }}>{FLAG_WORD[c.level]}</span>}>
        <div style={{ display: "flex", gap: 16 }}>
          <div><div className="fh-label">Max height</div><div className="fh-num">{c.maxAltitude}<span className="fh-unit"> m</span></div></div>
          <div><div className="fh-label">Documents missing</div><div className="fh-num">{docsMissing.length}</div></div>
        </div>
        <div className="fh-label" style={{ marginTop: 8 }}>{docsMissing.length ? `For ${droneOf(s).nickname}: ${docsMissing.join(", ")}` : "All set for the selected drone"} · {c.verification}</div>
        <button className="fh-btn" style={{ marginTop: 12, width: "100%" }} onClick={() => up((p) => { p.screen = "rules"; })}>Open Rules</button>
      </Panel>
      <Panel title="Recent flights" right={<button className="fh-label" style={{ background: "none", border: "none", textDecoration: "underline" }} onClick={() => up((p) => { p.screen = "flights"; })}>All</button>} pad={0}>
        {recent.map((r, i) => <div key={r.k} className="fh-row" style={{ borderTop: i ? undefined : "none" }}><span style={{ width: 44, height: 32, borderRadius: 8, overflow: "hidden", position: "relative", flex: "none" }}><Scene heading={i * 70} height={20} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontWeight: 600 }}>{r.t}</span><span className="fh-label">{r.sub}</span></span><span className="fh-label">{r.when}</span></div>)}
      </Panel>
    </>
  );
  const w = world(s);
  const map = (
    <div style={{ position: "absolute", inset: 0 }}>
      <RealMap center={w.spot.home} zoom={15.5} drones={w.drones} homes={w.homes} landing={w.landing} noFly={w.noFly} tools={!wide ? false : false}
        onDrone={(id) => up((p) => { p.droneId = id; p.skin = "auto"; p.screen = inAir(p.sims[id].phase) ? "fly" : "hangar"; })} />
    </div>
  );
  const topChips = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span className="fh-chip on">This week</span><span className="fh-chip">All drones · {s.drones.length}</span>
      <button className="fh-chip" onClick={() => up((p) => { p.screen = "watch"; })}><Grid2x2 size={13} />Watch wall</button>
    </div>
  );
  return (
    <Page title="Dashboard" bleed>
      {wide ? <>
        {map}
        <div className="no-scrollbar" style={{ position: "absolute", left: 16, top: 16, bottom: 48, width: 320, display: "grid", gap: 12, alignContent: "start", overflowY: "auto", zIndex: 5 }}>{left}</div>
        <div className="no-scrollbar" style={{ position: "absolute", right: 16, top: 16, bottom: 48, width: 320, display: "grid", gap: 12, alignContent: "start", overflowY: "auto", zIndex: 5 }}>{right}</div>
        <div style={{ position: "absolute", left: 352, right: 352, top: 16, display: "flex", justifyContent: "center", zIndex: 5 }}>{topChips}</div>
        <div className="fh-panel" style={{ position: "absolute", left: 352, bottom: 16, padding: "8px 12px", zIndex: 5 }}><div style={{ fontWeight: 600 }}>{w.spot.place}, {w.spot.city}</div><div className="fh-label">Example location · drone rules not checked</div></div>
      </> : <div className="no-scrollbar" style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
        <div style={{ position: "relative", height: 300 }}>{map}<div style={{ position: "absolute", left: 12, top: 12, zIndex: 5 }}>{topChips}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16, alignItems: "start" }}><div style={{ display: "grid", gap: 12 }}>{left}</div><div style={{ display: "grid", gap: 12 }}>{right}</div></div>
      </div>}
    </Page>
  );
}


// ---------- Watch wall ----------
export function WatchScreen() {
  const { s, up } = useProto();
  const { W } = frameSize(s.platform, s.orient);
  const cw = W - (s.platform === "laptop" ? 232 : 0);
  const listW = cw >= 1000 ? 240 : 0;
  const ordered = [...s.drones].sort((a, b) => Number(inAir(s.sims[b.id].phase)) - Number(inAir(s.sims[a.id].phase)));
  const focus = s.watchFocus && s.drones.some((d) => d.id === s.watchFocus) ? s.watchFocus : ordered[0]?.id;
  const tiles = s.watchGrid === 1 ? ordered.filter((d) => d.id === focus) : ordered.slice(0, 4);
  const groups: [string, Drone[]][] = [["In the air", ordered.filter((d) => inAir(s.sims[d.id].phase))], ["On the ground", ordered.filter((d) => !inAir(s.sims[d.id].phase))]];
  return (
    <Page title="Watch" bleed>
      {listW > 0 && (
        <div className="no-scrollbar" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: listW, borderRight: "1px solid rgba(255,255,255,.08)", background: "#141414", overflowY: "auto" }}>
          <div style={{ padding: "16px 16px 8px" }}><div style={{ fontWeight: 700 }}>Watch wall</div><div className="fh-label">Control one, watch the rest</div></div>
          {groups.map(([g, list]) => <div key={g}>
            <div className="fh-label" style={{ padding: "12px 16px 4px", textTransform: "uppercase", letterSpacing: ".06em" }}>{g} ({list.length})</div>
            {list.length === 0 ? <div className="fh-label" style={{ padding: "8px 16px 12px" }}>No drones</div> : list.map((d) => {
              const on = d.id === focus; const m = s.sims[d.id];
              return <button key={d.id} onClick={() => up((p) => { p.watchFocus = d.id; })} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", padding: "8px 16px", background: on ? "rgba(255,255,255,.08)" : "none", border: "none", borderLeft: on ? "3px solid #fff" : "3px solid transparent", color: "#fff", textAlign: "left" }}>
                <span style={{ width: 40, height: 32, borderRadius: 8, background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", flex: "none" }}><DroneArt brand={d.brand} size={36} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{d.nickname}</span>
                  <span className="fh-label">{inAir(m.phase) ? `${m.smartMode ?? (m.phase === "paused" ? "Holding" : "Flying")} · ${m.height.toFixed(0)} m` : d.status} · {Math.round(d.battery)}%</span></span>
                {d.id === s.droneId && <span className="fh-chip" style={{ height: 20, fontSize: 12, padding: "0 8px" }}>Control</span>}
              </button>;
            })}
          </div>)}
        </div>
      )}
      {/* slim rail: layout presets and display settings */}
      <div style={{ position: "absolute", left: listW, top: 0, bottom: 0, width: 48, borderRight: "1px solid rgba(255,255,255,.08)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 12, background: "#111" }}>
        <button className={`fh-tool${s.watchGrid === 1 ? " on" : ""}`} aria-pressed={s.watchGrid === 1} title="1 view" onClick={() => up((p) => { p.watchGrid = 1; })}><Square size={15} /></button>
        <button className={`fh-tool${s.watchGrid === 4 ? " on" : ""}`} aria-pressed={s.watchGrid === 4} title="4 views" onClick={() => up((p) => { p.watchGrid = 4; })}><Grid2x2 size={15} /></button>
        <span style={{ height: 1, width: 24, background: "rgba(255,255,255,.12)", margin: "4px 0" }} />
        <button className={`fh-tool${s.osd ? " on" : ""}`} title="Show flight info on video" onClick={() => up((p) => { p.osd = !p.osd; })}>OSD</button>
        <button className="fh-tool" title="Fill or fit video" onClick={() => up((p) => { p.fill = !p.fill; })}>{s.fill ? "Fill" : "Fit"}</button>
      </div>
      <div style={{ position: "absolute", left: listW + 48, right: 0, top: 0, bottom: 0, padding: 8, display: "grid", gap: 8, gridTemplateColumns: s.watchGrid === 1 ? "1fr" : "1fr 1fr", gridTemplateRows: s.watchGrid === 1 ? "1fr" : "1fr 1fr" }}>
        {Array.from({ length: s.watchGrid }).map((_, i) => tiles[i] ? <WatchTile key={tiles[i].id} d={tiles[i]} seed={i} /> :
          <div key={`e${i}`} style={{ border: "1.5px dashed rgba(255,255,255,.2)", borderRadius: 8, display: "grid", placeItems: "center" }} className="fh-label">No drone</div>)}
      </div>
    </Page>
  );
}

function WatchTile({ d, seed }: { d: Drone; seed: number }) {
  const { s, up } = useProto(); const m = s.sims[d.id]; const air = inAir(m.phase);
  const mine = d.id === s.droneId; const act = droneActionFor(s, d);
  const w = world(s);
  const reconnect = () => { up((p) => { const x = droneOf(p, d.id); x.status = "Not ready"; x.statusReason = "connecting"; }); setTimeout(() => up((p) => { const x = droneOf(p, d.id); x.status = "Ready"; x.statusReason = undefined; }), 1500); };
  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#000", border: mine ? "2px solid #fff" : "1px solid rgba(255,255,255,.12)" }}>
      <div style={{ position: "absolute", inset: s.fill ? 0 : "8% 6%" }}><DroneView at={w.posOf(d.id)} heading={m.heading + seed * 0} height={m.height} gimbal={m.gimbal} dim={!air} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(rgba(0,0,0,.6), transparent)", fontSize: 12 }} className="hud-text">
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: air ? "#fff" : "transparent", border: "1.5px solid #fff" }} />
        <b>{d.nickname}</b><span style={{ opacity: .7 }}>| Main camera</span>
        <span style={{ marginLeft: "auto", opacity: .7 }} className="num">{air ? "LIVE" : "Last frame"}</span>
      </div>
      {!air && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}><span className="fh-chip">{d.status === "Offline" ? "Offline" : "On the ground"}</span></div>}
      {s.osd && air && <div className="fh-label hud-text" style={{ position: "absolute", left: 10, bottom: 52, display: "flex", gap: 12, color: "#fff" }}>
        <span>H <b className="num">{m.height.toFixed(0)}</b> m</span><span>D <b className="num">{m.distance.toFixed(0)}</b> m</span><span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Battery pct={d.battery} size={9} /> {Math.round(d.battery)}%</span>{m.smartMode && <span>{m.smartMode}</span>}</div>}
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {air && !mine && <button className="fh-btn" style={{ minHeight: 34 }} onClick={() => up((p) => { p.sims[d.id].phase = "paused"; p.sims[d.id].smartPaused = true; })}>Hold</button>}
        {air && <button className="fh-btn" style={{ minHeight: 34 }} onClick={() => up((p) => startReturn(p, "Home", d.id))}>Return</button>}
        <button className="fh-btn primary" style={{ minHeight: 34 }} disabled={act.kind === "disabled" || act.kind === "busy"} title={act.note} onClick={() => act.label === "Reconnect" ? reconnect() : act.run && up(act.run)}><Maximize2 size={13} />{air ? (mine ? "Open cockpit" : act.label) : act.label}</button>
      </div>
    </div>
  );
}

// ---------- Laptop Hangar workspace: list + map + detail ----------
export function HangarDesk() {
  const { s, up } = useProto();
  const sel = droneOf(s); const c = COUNTRIES[s.country]; const act = droneActionFor(s, sel);
  const m = s.sims[sel.id]; const b = bucketOf(s, sel);
  const need = requiredDocs(c, sel, s.resident);
  const w = world(s);
  const reconnect = () => { up((p) => { const x = droneOf(p, sel.id); x.status = "Not ready"; x.statusReason = "connecting"; }); setTimeout(() => up((p) => { const x = droneOf(p, sel.id); x.status = "Ready"; x.statusReason = undefined; }), 1500); };
  return (
    <Page title="Hangar" bleed>
      <div className="no-scrollbar" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 320, borderRight: "1px solid rgba(255,255,255,.08)", background: "#141414", overflowY: "auto" }}>
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 20, fontWeight: 700 }}>Your drones</div><div className="fh-label"><MapPin size={11} style={{ verticalAlign: -1 }} /> {c.name} · {s.drones.length} drones</div></div>
          <button className="fh-tool" aria-label="Add a drone" onClick={() => up((p) => { p.screen = "add-brand"; })}><Plus size={16} /></button>
        </div>
        {s.drones.map((d) => {
          const on = d.id === s.droneId; const bb = bucketOf(s, d);
          return <button key={d.id} onClick={() => up((p) => { p.droneId = d.id; p.skin = "auto"; })} style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", padding: "12px 16px", background: on ? "rgba(255,255,255,.08)" : "none", border: "none", borderLeft: on ? "3px solid #fff" : "3px solid transparent", color: "#fff", textAlign: "left" }}>
            <span style={{ width: 52, height: 42, borderRadius: 8, background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", flex: "none" }}><DroneArt brand={d.brand} size={48} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{d.nickname}</span><span className="fh-label" style={{ display: "block" }}>{d.model}</span>
              <span className="fh-label" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, color: "#fff" }}><Swatch st={BUCKET[bb].style} />{BUCKET[bb].label} · {Math.round(d.battery)}%</span></span>
          </button>;
        })}
      </div>
      <div style={{ position: "absolute", left: 320, right: 360, top: 0, bottom: 0 }}>
        <RealMap center={w.spot.home} zoom={16} drones={w.drones} homes={w.homes} landing={w.landing} noFly={w.noFly} tools onDrone={(id) => up((p) => { p.droneId = id; p.skin = "auto"; })} />
        <div className="fh-panel" style={{ position: "absolute", left: 16, top: 16, padding: "8px 12px", zIndex: 5 }}><div style={{ fontWeight: 600 }}>{w.spot.place}, {w.spot.city}</div><div className="fh-label">Home points and landing spots · example location</div></div>
      </div>
      <div className="no-scrollbar" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 360, borderLeft: "1px solid rgba(255,255,255,.08)", background: "#141414", overflowY: "auto", padding: 16 }}>
        <div className="fh-label" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>Selected</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{sel.nickname}</div>
        <div className="fh-label">{sel.model} · {SKINS[sel.brand].appCopied} layout</div>
        <div style={{ margin: "16px -16px 8px", overflow: "hidden" }}><DroneHero brand={sel.brand} height={200} bg="radial-gradient(ellipse at 50% 60%, #3a3f46 0, #1b1d21 80%)" /></div>
        <PhotoCredit brand={sel.brand} style={{ display: "block", marginTop: -4, marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[["Status", BUCKET[b].label], ["Battery", `${Math.round(sel.battery)}%`], ["Height", inAir(m.phase) ? `${m.height.toFixed(0)} m` : "—"]].map(([k, v]) => <div key={k} className="fh-panel" style={{ padding: "8px 12px" }}><div className="fh-label">{k}</div><div style={{ fontWeight: 700, fontSize: 16 }}>{v}</div></div>)}
        </div>
        <div className="fh-panel" style={{ marginTop: 12 }}>
          <div className="fh-row"><Wifi size={14} /><span style={{ flex: 1 }}>{BRAND_ACCOUNT[sel.brand].label}</span><span className="fh-label">{s.brandAccounts.includes(sel.brand) ? "Connected" : "Not connected"}</span></div>
          <div className="fh-row"><Icon kind={sel.firmwareOk ? "pass" : "warning"} size={14} /><span style={{ flex: 1 }}>Firmware</span><span className="fh-label">{sel.firmwareOk ? "Up to date" : "Update needed"}</span></div>
          <div className="fh-row"><Icon kind="info" size={14} /><span style={{ flex: 1 }}>IDs for {c.name}</span><span className="fh-label" style={{ textAlign: "right" }}>{need.length ? need.join(", ") : "None"}</span></div>
        </div>
        <button className="fh-btn primary" style={{ width: "100%", minHeight: 46, marginTop: 16 }} disabled={act.kind === "disabled" || act.kind === "busy"} onClick={() => act.label === "Reconnect" ? reconnect() : act.run && up(act.run)}><Navigation size={15} />{act.label}</button>
        {act.note && <div className="fh-label" style={{ textAlign: "center", marginTop: 8 }}>{act.note}</div>}
      </div>
    </Page>
  );
}
