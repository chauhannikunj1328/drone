"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle, Camera, Car, Check, ChevronLeft, ChevronRight, Clock, Eye, FileText, Gauge, Globe, Hand, Heart, History, Info, Link2,
  Loader2, MapPin, Mountain, Navigation, Plane, Plus, Ruler, Scale, Search, Settings as SettingsIcon, ShieldCheck, Smartphone, Sparkles,
  Trees, Users, Warehouse, Wifi,
} from "lucide-react";
import { BRANDS, COUNTRIES, FLAG_WORD, SKINS, requiredDocs, type CountryCode, type Drone } from "@/lib/data";
import { frameSize, safeArea } from "@/lib/layout";
import { checklist, droneOf, inAir, isRedFor, useProto, type Proto, type Screen, type UseCase } from "@/lib/store";
import { Battery, DroneArt, MapArt, StatusBar, Thumb } from "./art";
import { Icon, Mock, type IconKind } from "./ui";
import { MakerSignIn, SignInSheet } from "./Onboarding";
import { BRAND_ACCOUNT } from "@/lib/data";

const go = (sc: Screen) => (p: Proto) => { p.screen = sc; };

// ---------- Page frame: status bar, navigation, tab bar ----------
export function Page({ title, back, children, tabs = true, large, right, sub, full, footer }: {
  title: string; back?: Screen; children: ReactNode; tabs?: boolean; large?: boolean; right?: ReactNode; sub?: ReactNode; full?: boolean; footer?: ReactNode;
}) {
  const { s, up } = useProto();
  const { W, H } = frameSize(s.platform, s.orient);
  const safe = safeArea(s.platform, s.orient);
  const landscapePhone = s.platform === "iphone" && s.orient === "landscape";
  const side = landscapePhone || (s.platform === "duoClosed" && s.orient === "landscape");
  const sbH = s.platform === "iphone" ? (landscapePhone ? 0 : 54) : s.platform === "tablet" ? 24 : s.platform === "laptop" ? 0 : 30;
  const top = Math.max(safe.t, sbH);
  const isLarge = large ?? !back;
  const tabsList: [string, Screen, ReactNode][] = [
    // Fly is not a tab: flying is an action on a chosen drone (from Hangar), not a place.
    ["Hangar", "hangar", <Warehouse key="h" size={22} strokeWidth={1.8} />],
    ["Flights", "flights", <History key="fl" size={22} strokeWidth={1.8} />], ["Rules", "rules", <Scale key="r" size={22} strokeWidth={1.8} />],
    ["Settings", "settings", <SettingsIcon key="s" size={22} strokeWidth={1.8} />],
  ];
  const tabH = 50;
  const desk = s.platform === "laptop";
  const railW = desk ? 232 : 84;
  const isOn = (sc: Screen) => s.screen === sc || (sc === "hangar" && (s.screen.startsWith("pf-") || ["add-brand", "add-model", "capability", "summary"].includes(s.screen)));
  // In-flight banner: any drone in the air stays one tap away from every page.
  // Not during first setup: the new user has no drones in the air yet.
  const airborne = !s.obAdding ? s.drones.filter((d) => inAir(s.sims[d.id].phase)) : [];
  const lead = airborne.find((d) => d.id === s.droneId) ?? airborne[0];
  const bannerH = lead ? 56 : 0, footH = footer ? 90 : 0;
  const bottomBase = tabs && !side && !desk ? tabH + safe.b : safe.b;
  const tabBar = tabs && desk ? (
    <nav aria-label="Sections" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: railW, background: "var(--grey-100)", borderRight: "1px solid var(--grey-150)", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "flex", gap: 7, marginBottom: 22, paddingLeft: 4 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 9999, background: ["#5c5c5c", "#9e9e9e", "#bdbdbd"][i] }} />)}</div>
      <div className="t-over muted" style={{ padding: "0 10px 6px" }}>Skyhand</div>
      {tabsList.map(([t, sc, ic]) => { const on = isOn(sc); return <button key={t} data-hit onClick={() => up(go(sc))} aria-current={on ? "page" : undefined}
        style={{ display: "flex", alignItems: "center", gap: 10, height: 36, padding: "0 10px", borderRadius: 8, border: "none", background: on ? "var(--grey-0)" : "transparent", boxShadow: on ? "var(--shadow-1)" : undefined, fontSize: 14, fontWeight: on ? 600 : 500, color: on ? "var(--grey-900)" : "var(--grey-600)", textAlign: "left" }}>{ic}{t}</button>; })}
      <div style={{ marginTop: "auto" }} className="t-cap muted">Concept by Artonest</div>
    </nav>
  ) : tabs && (
    <nav aria-label="Tabs" style={side
      ? { position: "absolute", right: 0, top: sbH, bottom: 0, width: railW + safe.r, paddingRight: safe.r, borderLeft: "1px solid var(--grey-150)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2, background: "rgba(255,255,255,.92)", backdropFilter: "blur(20px)" }
      : { position: "absolute", left: 0, right: 0, bottom: 0, height: tabH + safe.b, paddingBottom: safe.b, borderTop: "1px solid var(--grey-150)", display: "flex", background: "rgba(255,255,255,.92)", backdropFilter: "blur(20px)", zIndex: 5 }}>
      {tabsList.map(([t, sc, ic]) => {
        const on = isOn(sc);
        return <button key={t} data-hit onClick={() => up(go(sc))} aria-current={on ? "page" : undefined}
          style={{ flex: side ? undefined : 1, minHeight: 48, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: on ? "var(--grey-900)" : "var(--grey-400)", fontSize: 10, fontWeight: on ? 700 : 500 }}>
          {ic}{t}</button>;
      })}
    </nav>
  );
  const regular = W >= 600;
  const padX = regular ? 28 : 18;
  return (
    <div className="light" style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
      <StatusBar platform={s.platform} landscape={s.orient === "landscape"} />
      <div className="no-scrollbar" style={{ position: "absolute", left: safe.l + (desk && tabs ? railW : 0), right: (side ? railW : 0) + safe.r, top: desk ? 24 : top, bottom: bottomBase + bannerH + footH, overflowY: "auto", padding: `4px ${padX}px 28px` }}>
        <div style={{ maxWidth: full || W < 800 ? undefined : 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", minHeight: 44, gap: 4, marginLeft: back ? -10 : 0 }}>
          {back && <button className="btn btn-ghost" data-hit style={{ minHeight: 40, padding: "0 6px", fontWeight: 500, gap: 2 }} onClick={() => up(go(back))}><ChevronLeft size={22} />Back</button>}
          {!isLarge && <div className="t-head" style={{ flex: 1, textAlign: "center", marginRight: back ? 60 : 0 }}>{title}</div>}
          {isLarge && <div style={{ flex: 1 }} />}
          {right}
        </div>
        {isLarge && <h1 className={H < 500 ? "t-display" : "t-large"} style={{ margin: "2px 0 0" }}>{title}</h1>}
        {sub && <div className="t-body muted" style={{ marginTop: 2 }}>{sub}</div>}
        <div style={{ marginTop: 16 }}>{children}</div>
        </div>
      </div>
      {(footer || lead) && (
        <div style={{ position: "absolute", left: safe.l + (desk && tabs ? railW : 0), right: s.platform === "duoOpen" && s.orient === "portrait" ? W / 2 + 16 : (side ? railW : 0) + safe.r, bottom: bottomBase, padding: `12px ${padX}px 10px`, display: "grid", gap: 8, zIndex: 6,
          background: "linear-gradient(rgba(245,245,245,0), var(--grey-50) 30%)" }}>
          {lead && <div style={{ maxWidth: full || W < 800 ? undefined : 680, width: "100%", margin: "0 auto" }}><FlightBanner id={lead.id} more={airborne.length - 1} /></div>}
          {footer && <div style={{ maxWidth: full || W < 800 ? undefined : 680, width: "100%", margin: "0 auto" }}>{footer}</div>}
        </div>)}
      {tabBar}
      {s.dronePicker && <DronePicker onClose={() => up((p) => { p.dronePicker = false; })} />}
      {s.signInSheet && <SignInSheet />}
      {s.toast && s.screen !== "fly" && (
        <div style={{ position: "absolute", left: 16, right: 16, top: top + 8, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}>
          <div className="alert" style={{ maxWidth: 520, margin: "0 auto" }}><Icon kind="info" size={18} /><div className="t-cap" style={{ flex: 1 }}>{s.toast}</div><button className="act">OK</button></div>
        </div>)}
    </div>
  );
}

function FlightBanner({ id, more }: { id: string; more: number }) {
  const { s, up } = useProto();
  const d = droneOf(s, id); const m = s.sims[id];
  const mine = id === s.droneId;
  return <button data-hit onClick={() => up((p) => { p.droneId = id; p.skin = "auto"; p.screen = "fly"; })}
    style={{ width: "100%", height: 48, borderRadius: 14, border: "none", background: "var(--grey-900)", color: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "0 8px 0 14px", boxShadow: "var(--shadow-2)", textAlign: "left" }}>
    <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#fff", boxShadow: "0 0 0 4px rgba(255,255,255,.25)", flex: "none" }} />
    <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <b className="t-label" style={{ fontWeight: 700 }}>{d.nickname} {m.phase === "returning" ? "returning" : "in the air"}</b>
      <span className="t-cap" style={{ opacity: .7 }}> · {m.height.toFixed(0)} m · {Math.round(d.battery)}%{m.smartMode ? ` · ${m.smartMode}` : ""}{more > 0 ? ` · +${more} more` : ""}</span>
    </span>
    <span className="chip" style={{ background: "#fff", color: "#141414", border: "none" }}>{mine || !d.monitorOnly ? "Open" : "Watch"}<ChevronRight size={14} /></span>
  </button>;
}

const statusIcon = (d: Drone, s: Proto): [IconKind, string] => {
  const ph = s.sims[d.id].phase;
  if (inAir(ph)) return ph === "returning" ? ["returning", "Returning"] : ["flying", "In flight"];
  if (d.status === "Ready") return ["ready", "Ready"];
  if (d.status === "Not ready") return ["notready", `Not ready · ${d.statusReason}`];
  if (d.status === "Limited") return ["limited", "Limited"];
  return ["offline", "Offline"];
};

// Duo open portrait: book split around the fold. Other regular sizes: two columns.
function Columns({ left, right, ratio = "1fr 1fr" }: { left: ReactNode; right: ReactNode; ratio?: string }) {
  const { s } = useProto();
  const { W } = frameSize(s.platform, s.orient);
  if (W < 600) return <>{left}<div style={{ height: 16 }} />{right}</>;
  const fold = s.platform === "duoOpen" && s.orient === "portrait";
  const cols = (fold ? "1fr 1fr" : ratio).split(" ").map((f) => `minmax(0, ${f})`).join(" ");
  return <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: fold ? 56 : 28, alignItems: "start" }}><div style={{ minWidth: 0 }}>{left}</div><div style={{ minWidth: 0 }}>{right}</div></div>;
}

function SectionH({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-h" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span className="t-over muted">{children}</span>{action}</div>;
}
function CodeBadge({ code, size = 36 }: { code: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 10, background: "var(--grey-900)", color: "var(--grey-0)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.34, letterSpacing: ".04em", flex: "none" }}>{code}</span>;
}
function FlagChip({ level }: { level: "few" | "rules" | "cant" }) {
  return <span className={`chip ${level === "rules" ? "dashed" : level === "cant" ? "solid" : "soft"}`}><Icon kind={level === "cant" ? "critical" : level === "rules" ? "warning" : "pass"} size={12} />{FLAG_WORD[level]}</span>;
}

// ---------- Hangar ----------
export function Hangar() {
  const { s, up } = useProto();
  const c = COUNTRIES[s.country];
  const sel = droneOf(s);
  const [ic, label] = statusIcon(sel, s);
  const { W } = frameSize(s.platform, s.orient);
  const sa = safeArea(s.platform, s.orient);
  const rail = (s.platform === "iphone" || s.platform === "duoClosed") && s.orient === "landscape" ? 84 : 0;
  const narrow = W >= 600 && (W - sa.l - sa.r - rail - 56 - (s.platform === "duoOpen" ? 56 : 28)) / 2 < 340;
  const hero = (
    <div className="card raised" style={{ padding: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="t-over muted">Selected</div>
          <div className="t-title" style={{ marginTop: 2 }}>{sel.nickname}</div>
          <div className="t-label muted">{sel.model}</div>
        </div>
        <span className="chip soft"><Icon kind={ic} size={12} />{label}</span>
      </div>
      <div style={{ margin: "10px -18px", height: 150, background: "radial-gradient(ellipse at 50% 60%, var(--grey-0) 0, var(--grey-100) 70%)", display: "grid", placeItems: "center" }}>
        <DroneArt brand={sel.brand} size={250} view="hero" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(3, 1fr)", gap: 8 }}>
        {[["Battery", `${Math.round(sel.battery)}%`, <Battery key="b" pct={sel.battery} size={11} />], ["Weight", `${sel.weightGrams} g`, sel.weightIsMock ? <Mock key="m" /> : null], ["Firmware", sel.firmwareOk ? "Current" : "Update", null]].slice(0, narrow ? 2 : 3).map(([k, v, x]) => (
          <div key={k as string} style={{ background: "var(--grey-50)", borderRadius: 12, padding: "10px 12px" }}>
            <div className="t-cap muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>{k}{x}</div>
            <div className="t-head num" style={{ marginTop: 2 }}>{v}</div>
          </div>))}
      </div>
      <div className="group" style={{ marginTop: 12 }}>
        <div className="row"><span className="ico"><FileText size={16} /></span><div style={{ flex: 1 }}><div className="t-label">IDs for {c.name}</div><div className="t-cap muted">{requiredDocs(c, sel, s.resident).join(" · ") || "None needed"}</div></div></div>
        <div className="row"><span className="ico"><Gauge size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Controls</div><div className="t-cap muted">{SKINS[sel.brand].appCopied} layout</div></div></div>
        {narrow && <div className="row"><span className="ico"><ShieldCheck size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Firmware</div><div className="t-cap muted">{sel.firmwareOk ? "Up to date" : "Update needed"}</div></div></div>}
        <div className="row"><span className="ico"><Link2 size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Access</div><div className="t-cap muted">Concept link</div></div></div>
      </div>
      {W >= 600 && <div style={{ marginTop: 14 }}><DroneAction d={sel} block /></div>}
    </div>
  );
  const list = (
    <div>
      {c.level !== "few" && (
        <div className={`alert ${c.level === "cant" ? "critical" : "warning"}`} style={{ marginBottom: 14 }}>
          <Icon kind={c.level === "cant" ? "critical" : "warning"} size={20} />
          <div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 700 }}>{c.level === "cant" ? `Rules differ in ${c.name}` : `Rules apply in ${c.name}`}</div>
            <div className="t-cap muted">{c.level === "cant" ? "Visitors may not be able to fly. Check before you go." : `Max height ${c.maxAltitude} m · ${c.verification}`}</div></div>
          <button className="act" data-hit onClick={() => up(go("rules"))}>Rules</button>
        </div>)}
      <SectionH action={<span className="t-cap muted">{s.drones.length} drones</span>}>Your fleet</SectionH>
      <div className="group">
        {s.drones.map((d) => {
          const [dic, dl] = statusIcon(d, s);
          const on = d.id === s.droneId;
          return (
            <div key={d.id} className="row" style={{ background: on ? "var(--grey-50)" : undefined, boxShadow: on ? "inset 3px 0 0 var(--grey-900)" : undefined }}>
              <button data-hit aria-label={`Select ${d.nickname}`} onClick={() => up((p) => { p.droneId = d.id; p.skin = "auto"; })}
                style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, background: "none", border: "none", textAlign: "left", padding: 0 }}>
                <span style={{ width: 60, height: 52, borderRadius: 12, background: "var(--grey-100)", display: "grid", placeItems: "center", flex: "none" }}><DroneArt brand={d.brand} size={56} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="t-head" style={{ display: "block" }}>{d.nickname}</span>
                  <span className="t-cap muted" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.model}</span>
                  <span className="t-cap" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" }}><Icon kind={dic} size={12} />{dl}<span className="muted" style={{ display: "inline-flex", gap: 4, alignItems: "center", fontWeight: 500 }}>· <Battery pct={d.battery} size={9} /> {Math.round(d.battery)}%</span></span>
                </span>
              </button>
              <ChevronRight size={18} color="var(--grey-400)" />
            </div>);
        })}
        <button className="row" data-hit onClick={() => up(go("add-brand"))}>
          <span style={{ width: 60, height: 52, borderRadius: 12, border: "1.5px dashed var(--grey-300)", display: "grid", placeItems: "center", flex: "none" }}><Plus size={20} /></span>
          <span style={{ flex: 1 }}><span className="t-head" style={{ display: "block" }}>Add a drone</span><span className="t-cap muted">DJI, Antigravity, Parrot, Autel, Skydio</span></span>
          <ChevronRight size={18} color="var(--grey-400)" />
        </button>
      </div>
    </div>
  );
  return <Page full footer={W < 600 && !inAir(s.sims[sel.id].phase) ? <DroneAction d={sel} block /> : undefined} title="Your drones" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><MapPin size={14} />{c.name}</span>}
    right={<button className="icon-btn" data-hit aria-label="Add a drone" onClick={() => up(go("add-brand"))}><Plus size={20} /></button>}>
    <Columns left={hero} right={list} ratio="1.05fr 1fr" />
  </Page>;
}

// One primary action per drone, worded for its state (never "Fly" on a drone that can't fly yet).
export function droneActionFor(s: Proto, d: Drone): { label: string; kind: "primary" | "secondary" | "disabled" | "busy"; run?: (p: Proto) => void; note?: string } {
  const ph = s.sims[d.id].phase;
  const flyingOther = s.drones.find((x) => x.id !== d.id && !x.monitorOnly && inAir(s.sims[x.id].phase));
  if (inAir(ph)) return { label: d.monitorOnly ? "Watch mission" : "Open flight", kind: "primary", run: (p) => { if (p.droneId !== d.id && inAir(p.sims[p.droneId].phase)) p.handoverTo = d.id; else { p.droneId = d.id; p.skin = "auto"; } p.screen = "fly"; } };
  if (d.statusReason === "connecting") return { label: "Connecting", kind: "busy" };
  if (d.status === "Offline") return { label: "Reconnect", kind: "secondary", run: () => {} };
  if (flyingOther) return { label: `Land ${flyingOther.nickname} first`, kind: "disabled", note: "You control one drone at a time." };
  const start = (p: Proto, sc: Screen) => { p.droneId = d.id; p.skin = "auto"; p.screen = sc; p.sight = "unknown"; p.crowdAck = false; };
  if (d.status === "Not ready") return { label: "Check what's wrong", kind: "secondary", run: (p) => start(p, "pf-checklist"), note: d.statusReason === "battery" ? `Battery ${Math.round(d.battery)}%. Charge or swap before flying.` : undefined };
  if (d.monitorOnly) return { label: "Start mission", kind: "primary", run: (p) => start(p, "pf-country") };
  return { label: `Fly ${d.nickname}`, kind: "primary", run: (p) => start(p, "pf-country") };
}

function DroneAction({ d, small, block }: { d: Drone; small?: boolean; block?: boolean }) {
  const { s, up } = useProto();
  const a = droneActionFor(s, d);
  const cls = `btn ${small ? "btn-sm" : ""} ${block ? "btn-block" : ""} ${a.kind === "primary" ? "btn-primary" : ""}`;
  if (a.kind === "busy") return <span className="chip dashed"><Loader2 size={12} className="animate-spin" />{a.label}</span>;
  const reconnect = () => { up((p) => { const x = droneOf(p, d.id); x.status = "Not ready"; x.statusReason = "connecting"; }); setTimeout(() => up((p) => { const x = droneOf(p, d.id); x.status = "Ready"; x.statusReason = undefined; }), 1500); };
  return <div style={{ display: "grid", gap: 6 }}>
    <button className={cls} data-hit disabled={a.kind === "disabled"} onClick={() => a.label === "Reconnect" ? reconnect() : a.run && up(a.run)}>
      {a.label === "Reconnect" ? <Wifi size={16} /> : a.kind === "primary" ? <Navigation size={16} /> : null}{a.label}</button>
    {a.note && <div className="t-cap muted" style={{ textAlign: "center" }}>{a.note}</div>}
  </div>;
}

// ---------- Add drone ----------
export function AddBrand() {
  const { s, up } = useProto();
  const { W } = frameSize(s.platform, s.orient);
  return <Page title="Add a drone" back={s.obAdding ? "ob-drone" : "hangar"} tabs={!s.obAdding} large>
    <p className="t-body muted" style={{ marginTop: -8 }}>Choose the maker. Controls will copy that maker&apos;s controller.</p>
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--grey-100)", borderRadius: 12, padding: "0 12px", height: 40, margin: "14px 0" }}><Search size={16} color="var(--grey-500)" /><span className="t-body muted">Search makers</span></div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${W >= 600 ? 3 : 2}, 1fr)`, gap: 12 }}>
      {BRANDS.map((b) => (
        <button key={b.id} className="card" data-hit style={{ padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 6 }} onClick={() => up((p) => { p.addBrand = b.id; p.screen = "add-model"; })}>
          <span style={{ height: 86, borderRadius: 12, background: "var(--grey-50)", display: "grid", placeItems: "center" }}><DroneArt brand={b.id} size={96} /></span>
          <span className="t-head">{b.name}</span><span className="t-cap muted">{b.model}</span>
        </button>))}
    </div>
  </Page>;
}
export function AddModel() {
  const { s, up } = useProto();
  const b = BRANDS.find((x) => x.id === s.addBrand) ?? BRANDS[0];
  const [state, setState] = useState<"choose" | "connecting" | "done">("choose");
  useEffect(() => { if (state !== "connecting") return; const t = setTimeout(() => setState("done"), 1200); return () => clearTimeout(t); }, [state]);
  const steps = ["Searching nearby", "Pairing", "Connected"];
  const at = state === "choose" ? -1 : state === "connecting" ? 1 : 2;
  const [skipped, setSkipped] = useState(false);
  const needSignIn = !s.brandAccounts.includes(b.id) && !skipped;
  const acct = BRAND_ACCOUNT[b.id];
  return <Page title="Connect" back="add-brand" tabs={!s.obAdding}>
    <div className="card raised" style={{ padding: 18, textAlign: "center" }}>
      <div style={{ height: 150, display: "grid", placeItems: "center", background: "radial-gradient(circle, var(--grey-50) 0, var(--grey-0) 70%)", borderRadius: 14 }}><DroneArt brand={b.id} size={230} view="hero" /></div>
      <div className="t-title" style={{ marginTop: 8 }}>{b.model}</div>
      <div className="t-cap muted">Turn on the drone and keep it close to this device</div>
      <div className="stepper" style={{ margin: "14px 0 2px" }}><i className="on" /><i className={needSignIn ? "" : "on"} /></div>
      <div className="t-cap muted" style={{ textAlign: "left" }}>{needSignIn ? `Step 1 of 2 · ${acct.label}` : "Step 2 of 2 · Connect the drone"}</div>
      {needSignIn ? <MakerSignIn brand={b.id} onDone={() => setSkipped(true)} />
        : state === "choose"
        ? <>{s.brandAccounts.includes(b.id) && <div className="chip soft" style={{ marginTop: 12 }}><Check size={13} />{acct.label} connected</div>}
            <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 14 }} onClick={() => setState("connecting")}><Link2 size={17} />Connect drone</button></>
        : <div className="group" style={{ marginTop: 16, textAlign: "left" }}>{steps.map((t, i) => (
            <div key={t} className="row"><span style={{ width: 22, display: "grid", placeItems: "center" }}>{i < at || state === "done" ? <Icon kind="pass" size={18} /> : i === at ? <Loader2 size={18} className="animate-spin" /> : <Icon kind="pending" size={18} />}</span>
              <span className="t-label" style={{ color: i > at ? "var(--grey-400)" : undefined }}>{t}</span></div>))}</div>}
      {state === "done" && <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 12 }} onClick={() => up(go("capability"))}>Continue</button>}
    </div>
    <p className="t-cap muted" style={{ textAlign: "center", marginTop: 12 }}><Info size={12} style={{ verticalAlign: -2 }} /> In this concept, the connection is assumed to work.</p>
  </Page>;
}
export function Capability() {
  const { s, up } = useProto();
  const b = BRANDS.find((x) => x.id === s.addBrand) ?? BRANDS[0]; const skin = SKINS[b.id];
  const notSold = b.id === "skydio" && s.country !== "US";
  const rows: [ReactNode, string, string][] = [
    [<Gauge key="g" size={16} />, "Controls", `Copies ${skin.appCopied}`],
    [<Sparkles key="s" size={16} />, "Smart modes", skin.tray.filter((t) => !t.disabled).map((t) => t.name).join(", ")],
    [<Hand key="h" size={16} />, "Flying", b.id === "skydio" ? "Monitor and mission-start only (no sticks)" : "On-screen controls"],
    ...(b.id === "antigravity" ? [[<Camera key="c" size={16} />, "360 video", "Drag the video to look around"] as [ReactNode, string, string]] : []),
    [<Link2 key="l" size={16} />, "Maker account", s.brandAccounts.includes(b.id) ? `${BRAND_ACCOUNT[b.id].label} connected` : `${BRAND_ACCOUNT[b.id].label} not connected`],
  ];
  return <Page title="What it can do" back="add-model" tabs={!s.obAdding}>
    <div style={{ textAlign: "center" }}><DroneArt brand={b.id} size={220} view="hero" /><div className="t-title">{b.model}</div></div>
    {notSold && <div className="alert warning" style={{ marginTop: 12 }}><Icon kind="limited" size={18} /><div className="t-cap">Limited in this country: Skydio is mostly sold in the US.</div></div>}
    <div className="group" style={{ marginTop: 16 }}>{rows.map(([i, t, d]) => <div key={t} className="row"><span className="ico">{i}</span><div style={{ flex: 1 }}><div className="t-label">{t}</div><div className="t-cap muted">{d}</div></div></div>)}</div>
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up((p) => {
      const id = `d${p.drones.length + 1}${p.obAdding ? "n" : ""}`;
      p.drones.push({ id, nickname: `My ${b.model.replace(/^(DJI|Antigravity|Parrot|Autel|Skydio) /, "")}`, brand: b.id, model: b.model, weightGrams: b.id === "antigravity" ? 249 : 1000, weightIsMock: b.id !== "antigravity", hasCamera: true, battery: 100, status: b.id === "skydio" ? "Limited" : "Ready", statusReason: b.id === "skydio" ? "monitor and mission-start only" : undefined, firmwareOk: true, monitorOnly: b.id === "skydio", is360: b.id === "antigravity" });
      p.sims[id] = { ...p.sims.d1, phase: "grounded", height: 0, distance: 0, photos: 0, alertsSeen: [], smartMode: undefined };
      // First drone during onboarding: the Hangar holds just this drone (no demo drones).
      if (p.obAdding) { p.drones = p.drones.filter((d) => d.id === id); p.droneId = id; p.obAdding = false; p.onboarded = true; p.toast = `${b.model} added. Tap Fly when you're ready.`; }
      p.screen = "hangar";
    })}><Plus size={17} />Add to Hangar</button>
  </Page>;
}

// ---------- Drone picker (pre-flight and Fly) ----------
export function DronePicker({ onClose, inFlight }: { onClose: () => void; inFlight?: boolean }) {
  const { s, up } = useProto();
  const cur = droneOf(s); const curAir = inAir(s.sims[cur.id].phase) && !cur.monitorOnly;
  return <div className="sheet-back" onClick={onClose}>
    <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose drone" style={{ maxHeight: "85%", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center" }}><div className="t-title" style={{ flex: 1 }}>{inFlight ? "Your drones" : "Choose drone"}</div>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><ChevronRight size={18} style={{ transform: "rotate(90deg)" }} /></button></div>
      <div className="t-cap muted" style={{ margin: "2px 0 12px" }}>You control one drone at a time. Others keep their own plan and can be watched.</div>
      <div className="group">{s.drones.map((d) => {
        const air = inAir(s.sims[d.id].phase); const [ic, lab] = statusIcon(d, s); const me = d.id === cur.id;
        let btn: ReactNode;
        if (me) btn = <span className="chip solid">{inFlight && air ? "Controlling" : "Selected"}</span>;
        else if (d.status === "Offline") btn = <span className="chip hatch">Offline</span>;
        else if (air) btn = <button className="btn btn-sm" data-hit onClick={() => { up((p) => { if (inAir(p.sims[p.droneId].phase)) { p.handoverTo = d.id; p.screen = "fly"; } else { p.droneId = d.id; p.skin = "auto"; p.screen = "fly"; } }); onClose(); }}>{curAir ? "Switch" : d.monitorOnly ? "Watch" : "Open"}</button>;
        else if (curAir) btn = <span className="t-cap muted" style={{ maxWidth: 96, textAlign: "right" }}>Land {cur.nickname} first</span>;
        else btn = <button className="btn btn-sm btn-primary" data-hit onClick={() => { up((p) => { p.droneId = d.id; p.skin = "auto"; p.sight = "unknown"; p.crowdAck = false; if (p.screen === "fly") p.screen = "pf-country"; }); onClose(); }}>Choose</button>;
        return <div key={d.id} className="row" style={{ background: me ? "var(--grey-50)" : undefined }}>
          <span style={{ width: 52, height: 44, borderRadius: 10, background: "var(--grey-100)", display: "grid", placeItems: "center", flex: "none" }}><DroneArt brand={d.brand} size={48} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block", fontWeight: 700 }}>{d.nickname}</span>
            <span className="t-cap muted" style={{ display: "flex", gap: 5, alignItems: "center", whiteSpace: "nowrap", overflow: "hidden" }}><Icon kind={ic} size={11} />{lab} · {Math.round(d.battery)}%</span></span>
          {btn}</div>;
      })}</div>
      {!inFlight && <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => { up(go("add-brand")); onClose(); }}><Plus size={16} />Add a drone</button>}
    </div>
  </div>;
}

// ---------- Before you fly ----------
function Steps({ n }: { n: number }) {
  return <div style={{ marginBottom: 18 }}>
    <div className="stepper">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</div>
    <div className="t-cap muted" style={{ marginTop: 8, fontWeight: 600 }}>Step {n} of 4 · Before you fly</div>
  </div>;
}
function CountryCard() {
  const { s } = useProto(); const c = COUNTRIES[s.country];
  return <div className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
    <CodeBadge code={c.code} size={44} />
    <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{c.name}</div><div className="t-cap muted">{c.verification} · {c.source}</div></div>
    <FlagChip level={c.level} />
  </div>;
}
function DroneStrip() {
  const { s, up } = useProto(); const d = droneOf(s);
  return <>
    <button data-hit onClick={() => up((p) => { p.dronePicker = true; })} aria-label={`Flying ${d.nickname}. Change drone`} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 12px", background: "var(--grey-0)", border: "1px solid var(--grey-150)", borderRadius: 14, marginBottom: 14, textAlign: "left", boxShadow: "var(--shadow-1)" }}>
      <DroneArt brand={d.brand} size={44} />
      <span style={{ flex: 1, minWidth: 0 }}><span className="t-cap muted" style={{ display: "block" }}>Flying</span><span className="t-label" style={{ fontWeight: 700 }}>{d.nickname}</span><span className="t-cap muted"> · {Math.round(d.battery)}%</span></span>
      <span className="chip soft">Change<ChevronRight size={13} /></span>
    </button>
  </>;
}
export function PfCountry() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="Where are you flying?" back="hangar" large>
    <Steps n={1} /><DroneStrip />
    <div className="group">
      {Object.values(COUNTRIES).map((x) => (
        <button key={x.code} className="row" data-hit onClick={() => up((p) => { p.country = x.code as CountryCode; })}>
          <CodeBadge code={x.code} size={32} />
          <span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block", fontWeight: 600 }}>{x.name}</span><span className="t-cap muted">{FLAG_WORD[x.level]} · max {x.maxAltitude} m</span></span>
          {x.level === "cant" && <Icon kind="critical" size={16} />}
          <span style={{ width: 24, height: 24, borderRadius: 9999, border: s.country === x.code ? "none" : "1.5px solid var(--grey-300)", background: s.country === x.code ? "var(--grey-900)" : "transparent", display: "grid", placeItems: "center", color: "#fff" }}>{s.country === x.code && <Check size={15} strokeWidth={3} />}</span>
        </button>))}
    </div>
    {c.redForVisitors && <div className="group" style={{ marginTop: 12 }}><div className="row"><span className="ico"><MapPin size={16} /></span><span className="t-label" style={{ flex: 1 }}>I live in {c.name}</span>
      <button className={`switch ${s.resident ? "on" : ""}`} data-hit aria-pressed={s.resident} aria-label={`I live in ${c.name}`} onClick={() => up((p) => { p.resident = !p.resident; })} /></div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 18 }} onClick={() => up(go("pf-usecase"))}>Next</button>
  </Page>;
}
export function PfUseCase() {
  const { s, up } = useProto();
  const opts: [UseCase, string, string, ReactNode][] = [
    ["Park", "Park", "Family day out", <Trees key="p" size={26} strokeWidth={1.6} />], ["Wedding", "Wedding", "Event or party", <Heart key="w" size={26} strokeWidth={1.6} />],
    ["Hike", "Hike", "Trail or mountain", <Mountain key="h" size={26} strokeWidth={1.6} />], ["Travel", "Travel", "City or landmark", <Plane key="t" size={26} strokeWidth={1.6} />],
    ["Car", "From a car", "Passenger only", <Car key="c" size={26} strokeWidth={1.6} />],
  ];
  return <Page title="What are you shooting?" back="pf-country" large>
    <Steps n={2} /><DroneStrip />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {opts.map(([k, l, sub, ic]) => {
        const on = s.useCase === k;
        return <button key={k} data-hit onClick={() => up((p) => { p.useCase = k; })}
          style={{ textAlign: "left", padding: 16, borderRadius: 18, minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", border: on ? "2px solid var(--grey-900)" : "1px solid var(--grey-150)", background: on ? "var(--grey-900)" : "var(--grey-0)", color: on ? "#fff" : undefined, boxShadow: "var(--shadow-1)" }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>{ic}{on && <Check size={18} strokeWidth={3} />}</span>
          <span><span className="t-head" style={{ display: "block" }}>{l}</span><span className="t-cap" style={{ opacity: .65 }}>{sub}</span></span>
        </button>;
      })}
    </div>
    {s.useCase === "Car" && <div className="alert" style={{ marginTop: 14 }}><Icon kind="info" size={18} /><div className="t-cap">Only a passenger can fly. Controls lock while the car moves.</div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 18 }} onClick={() => up((p) => { p.screen = isRedFor(p) ? "pf-redflag" : p.useCase === "Wedding" && !p.crowdAck ? "pf-crowd" : "pf-checklist"; })}>Next</button>
  </Page>;
}
export function PfRedFlag() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="" back="pf-usecase" tabs={false}>
    <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
      <div style={{ width: 84, height: 84, borderRadius: 9999, background: "var(--grey-900)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto" }}><AlertTriangle size={40} strokeWidth={1.8} /></div>
      <div className="t-display" style={{ marginTop: 14 }}>You can&apos;t fly this drone here</div>
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 8 }}><CodeBadge code={c.code} size={24} /><span className="t-cap muted">{c.name} · {c.verification} · {c.source}</span></div>
    </div>
    <SectionH>Why</SectionH>
    <div className="group">{!c.redForVisitors?.length && <div className="row"><Icon kind="info" size={16} /><span className="t-body">No visitor limits recorded for {c.name}.</span></div>}{(c.redForVisitors ?? []).map((r) => <div key={r} className="row" style={{ alignItems: "flex-start" }}><Icon kind="critical" size={16} /><span className="t-body" style={{ flex: 1 }}>{r}</span></div>)}</div>
    <SectionH>What you can do</SectionH>
    <div style={{ display: "grid", gap: 10 }}>
      {c.approvalPath && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.docs.push("MLIT approval"); p.screen = "pf-checklist"; })}><FileText size={17} />Add approval document <Mock /></button>}
      {(c.code === "AE" || c.code === "IN") && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.resident = true; p.screen = "pf-checklist"; })}><MapPin size={17} />I live in {c.name}</button>}
      <button className="btn btn-block" data-hit onClick={() => up(go("pf-country"))}><Globe size={17} />Choose another country</button>
      <button className="btn btn-primary btn-block" data-hit onClick={() => up(go("hangar"))}>Back to Hangar</button>
    </div>
    <p className="t-cap muted" style={{ marginTop: 14, textAlign: "center" }}>Concept information, not legal advice. Check local rules.</p>
  </Page>;
}
export function PfCrowd() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="People nearby" back="pf-usecase" large>
    <div style={{ height: 130, borderRadius: 18, background: "var(--grey-100)", display: "grid", placeItems: "center", marginBottom: 14 }}><Users size={56} strokeWidth={1.3} color="var(--grey-600)" /></div>
    <div className="alert warning"><Icon kind="warning" size={20} /><div className="t-body">{c.crowd}</div></div>
    {s.country === "US" && <div className="group" style={{ marginTop: 12 }}><div className="row"><span className="ico"><Info size={16} /></span><span className="t-body">If this is paid work, it counts as Part 107 commercial work.</span></div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 18 }} onClick={() => up((p) => { p.crowdAck = true; p.screen = "pf-checklist"; })}>I understand</button>
  </Page>;
}
export function PfChecklist() {
  const { s, up } = useProto();
  const items = checklist(s).sort((a, b) => (a.state === "block" ? -1 : 0) - (b.state === "block" ? -1 : 0));
  const blocked = items.some((i) => i.state === "block");
  const warns = items.filter((i) => i.state === "warn").length;
  const passed = items.filter((i) => i.state === "pass").length;
  const icon = (st: string): IconKind => st === "pass" ? "pass" : st === "warn" ? "warning" : st === "block" ? "critical" : "pending";
  return <Page title="Before you fly" back="pf-usecase" large>
    <Steps n={3} /><DroneStrip />
    <div className="card raised" style={{ padding: 16, display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: 9999, background: blocked ? "var(--grey-0)" : "var(--grey-900)", border: blocked ? "3px solid var(--grey-900)" : "none", color: blocked ? "var(--grey-900)" : "#fff", display: "grid", placeItems: "center" }}>
        {blocked ? <AlertTriangle size={26} /> : <ShieldCheck size={28} />}</div>
      <div style={{ flex: 1 }}><div className="t-title">{blocked ? "Not ready" : warns ? "Ready, with warnings" : "Ready to fly"}</div>
        <div className="t-cap muted">{passed} of {items.length} passed · {warns} warning{warns === 1 ? "" : "s"}</div>
        <div className="meter" style={{ marginTop: 8 }}><i style={{ width: `${(passed / items.length) * 100}%` }} /></div></div>
    </div>
    <div className="group">{items.map((i) => (
      <div key={i.n} className="row" style={{ alignItems: "flex-start", background: i.state === "block" ? "var(--grey-50)" : undefined, boxShadow: i.state === "block" ? "inset 4px 0 0 var(--grey-900)" : undefined }}>
        <Icon kind={icon(i.state)} size={20} />
        <div style={{ flex: 1, minWidth: 0 }}><div className="t-label" style={{ fontWeight: 600 }}>{i.label}</div><div className="t-cap muted">{i.text}</div>
          {i.action && <button className="btn btn-sm" data-hit style={{ marginTop: 8 }} onClick={() => up((p) => i.action!.run(p))}><Plus size={14} />{i.action.label}</button>}
          {i.n === 10 && i.state === "warn" && <button className="btn btn-sm" data-hit style={{ marginTop: 8 }} onClick={() => up(go("pf-crowd"))}>Read</button>}</div>
      </div>))}
    </div>
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 18 }} disabled={blocked} onClick={() => up(go("pf-sight"))}>{blocked ? "Fix the items above" : "Continue"}</button>
  </Page>;
}
export function PfSight() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="Keep it in sight" back="pf-checklist" large>
    <Steps n={4} />
    <div style={{ height: 150, borderRadius: 18, background: "linear-gradient(var(--grey-200), var(--grey-50))", position: "relative", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ position: "absolute", left: "18%", bottom: 18, width: 54, height: 54, borderRadius: 9999, background: "var(--grey-900)", color: "#fff", display: "grid", placeItems: "center" }}><Eye size={26} /></div>
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%"><line x1="26%" y1="68%" x2="72%" y2="28%" stroke="var(--grey-900)" strokeWidth="2" strokeDasharray="4 6" /></svg>
      <div style={{ position: "absolute", right: "16%", top: 18 }}><DroneArt brand={droneOf(s).brand} size={80} /></div>
    </div>
    <div className="t-title">Can you see the drone with your own eyes?</div>
    <p className="t-body muted">A screen is not line of sight.{c.screenOnlyNeedsObserver ? ` In ${c.name}, flying by screen only needs an observer next to you.` : ""}</p>
    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
      <button className="btn btn-primary btn-block" data-hit onClick={() => up((p) => { p.sight = "yes"; p.screen = "fly"; })}><Eye size={17} />Yes, I can see it</button>
      <button className="btn btn-block" data-hit onClick={() => up((p) => { p.observer = "invited"; p.observerSight = false; p.screen = "pf-observer"; })}><Users size={17} />No, add an observer</button>
    </div>
  </Page>;
}
function QR() {
  const cells = Array.from({ length: 21 * 21 }, (_, i) => { const x = i % 21, y = Math.floor(i / 21);
    const finder = (a: number, b: number) => x >= a && x < a + 7 && y >= b && y < b + 7 && (x === a || x === a + 6 || y === b || y === b + 6 || (x >= a + 2 && x <= a + 4 && y >= b + 2 && y <= b + 4));
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return finder(0, 0) || finder(14, 0) || finder(0, 14);
    return ((x * 7 + y * 13 + x * y) % 5) < 2; });
  return <svg width="132" height="132" viewBox="0 0 21 21" shapeRendering="crispEdges" aria-label="Join code (mock)">{cells.map((on, i) => on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#141414" /> : null)}</svg>;
}
export function PfObserver() {
  const { s, up } = useProto();
  const ok = s.observer === "joined" && s.observerSight;
  return <Page title="Invite an observer" back="pf-sight" large>
    <p className="t-body muted" style={{ marginTop: -8 }}>Ask the person next to you to open Skyhand and tap Join.</p>
    <div className="card raised" style={{ padding: 18, textAlign: "center", marginTop: 12 }}>
      <QR />
      <div className="t-cap muted" style={{ marginTop: 10 }}>Or enter this code <Mock /></div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
        {"K7Q2M9".split("").map((ch, i) => <span key={i} style={{ width: 38, height: 48, borderRadius: 10, background: "var(--grey-100)", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, marginLeft: i === 3 ? 10 : 0 }}>{ch}</span>)}
      </div>
    </div>
    <div className="group" style={{ marginTop: 14 }}>
      <div className="row"><span className="ico"><Smartphone size={16} /></span><div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 600 }}>{s.observer === "joined" ? "Observer joined" : "Waiting for the observer"}</div>
        <div className="t-cap muted">{s.observer === "joined" ? (s.observerSight ? "They can see the drone" : "Waiting for them to confirm sight") : "Use the observer phone on the right, or simulate it"}</div></div>
        {s.observer === "joined" && s.observerSight ? <Icon kind="pass" size={20} /> : <Loader2 size={18} className="animate-spin" />}</div>
    </div>
    <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
      {!ok && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.observer = "joined"; p.observerSight = true; })}>Simulate observer joining <Mock label="Prototype" /></button>}
      <button className="btn btn-primary btn-block" data-hit disabled={!ok} onClick={() => up((p) => { p.sight = "observer"; p.screen = "fly"; })}>Continue</button>
    </div>
  </Page>;
}

// ---------- After flight, flights, rules, settings ----------
function Stat({ k, v, icon }: { k: string; v: string; icon: ReactNode }) {
  return <div style={{ background: "var(--grey-0)", border: "1px solid var(--grey-150)", borderRadius: 14, padding: 12 }}>
    <div className="t-cap muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>{icon}{k}</div>
    <div className="t-title num" style={{ marginTop: 4 }}>{v}</div></div>;
}
export function Summary() {
  const { s, up } = useProto();
  const f = s.flights.find((x) => x.id === s.lastFlight);
  if (!f) return <Page title="Flight summary" back="hangar"><div className="card" style={{ padding: 28, textAlign: "center" }}><History size={36} color="var(--grey-400)" /><p className="t-body muted">No flight yet.</p></div></Page>;
  const mm = Math.floor(f.seconds / 60), ss = String(f.seconds % 60).padStart(2, "0");
  const d = s.drones.find((x) => x.id === f.droneId);
  return <Page title="Flight summary" large>
    <div className="card raised" style={{ overflow: "hidden" }}>
      <div style={{ position: "relative", height: 170 }}><MapArt distance={Math.max(60, f.maxD)} heading={40} />
        <span className="chip" style={{ position: "absolute", left: 12, top: 12 }}><Icon kind="landed" size={12} />Landed safely</span></div>
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        {d && <DroneArt brand={d.brand} size={52} />}
        <div style={{ flex: 1 }}><div className="t-head">{f.nickname}</div><div className="t-cap muted">{f.model} · {f.country} · {f.useCase}</div></div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
      <Stat k="Flight time" v={`${mm}:${ss}`} icon={<Clock size={13} />} /><Stat k="Max height" v={`${f.maxH} m`} icon={<Ruler size={13} />} />
      <Stat k="Max distance" v={`${f.maxD} m`} icon={<MapPin size={13} />} /><Stat k="Photos" v={String(f.photos)} icon={<Camera size={13} />} />
    </div>
    <SectionH action={<span className="t-cap muted">Mock</span>}>Media</SectionH>
    <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="no-scrollbar">{[0, 1, 2, 3, 4].map((i) => <Thumb key={i} seed={i + 1} w={92} h={68} video={i % 2 === 0} />)}</div>
    <SectionH>Alerts in this flight</SectionH>
    <div className="group">{f.alerts.length ? f.alerts.map((a) => <div key={a} className="row"><Icon kind="info" size={16} /><span className="t-label">{a}</span></div>) : <div className="row"><Icon kind="pass" size={16} /><span className="t-label">None</span></div>}</div>
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 18 }} onClick={() => up(go("hangar"))}>Done</button>
  </Page>;
}
const PAST = [
  { id: "m1", nickname: "Park drone", model: "DJI Mavic 4 Pro", place: "City Park", when: "Yesterday", time: "12:40", maxH: 64, photos: 38 },
  { id: "m2", nickname: "360 cam", model: "Antigravity A1", place: "Lakeside trail", when: "Sat", time: "08:12", maxH: 42, photos: 6 },
  { id: "m3", nickname: "Survey", model: "Autel EVO Max 4T", place: "Wedding venue", when: "12 Nov", time: "16:05", maxH: 55, photos: 112 },
];
export function Flights() {
  const { s } = useProto();
  return <Page title="Flights" sub="Your flight log and media">
    <div className="seg" style={{ marginBottom: 6 }}><button className="on">All</button><button>Videos</button><button>Photos</button></div>
    {s.flights.length > 0 && <><SectionH>Today</SectionH>
      <div className="group">{s.flights.map((f, i) => <div key={f.id} className="row"><Thumb seed={i + 2} w={72} h={54} video />
        <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{f.nickname}</div><div className="t-cap muted">{f.model} · {f.country}</div>
          <div className="t-cap num" style={{ marginTop: 2 }}>{Math.floor(f.seconds / 60)}:{String(f.seconds % 60).padStart(2, "0")} · max {f.maxH} m · {f.photos} photos</div></div><ChevronRight size={18} color="var(--grey-400)" /></div>)}</div></>}
    <SectionH action={<Mock />}>Earlier</SectionH>
    <div className="group">{PAST.map((f, i) => <div key={f.id} className="row"><Thumb seed={i + 5} w={72} h={54} video />
      <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{f.place}</div><div className="t-cap muted">{f.nickname} · {f.model}</div>
        <div className="t-cap num" style={{ marginTop: 2 }}>{f.when} · {f.time} · max {f.maxH} m · {f.photos} photos</div></div><ChevronRight size={18} color="var(--grey-400)" /></div>)}</div>
  </Page>;
}
export function Rules() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country]; const d = droneOf(s);
  const need = requiredDocs(c, d, s.resident);
  return <Page full title="Rules" sub="What applies where you fly">
    <Columns left={<>
      <CountryCard />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <Stat k="Max height" v={`${c.maxAltitude} m`} icon={<Ruler size={13} />} /><Stat k="Line of sight" v="Required" icon={<Eye size={13} />} />
      </div>
      <SectionH>Rules in {c.name}</SectionH>
      <div className="group">{c.rules.map((r) => <div key={r} className="row" style={{ alignItems: "flex-start" }}><span className="ico" style={{ width: 26, height: 26 }}><Check size={14} /></span><span className="t-body" style={{ flex: 1 }}>{r}</span></div>)}</div>
      <SectionH>People nearby</SectionH>
      <div className="group"><div className="row"><span className="ico"><Users size={16} /></span><span className="t-body" style={{ flex: 1 }}>{c.crowd}</span></div></div>
    </>} right={<>
      <SectionH>Your documents · {d.nickname}</SectionH>
      {need.length === 0 ? <div className="group"><div className="row"><Icon kind="pass" size={18} /><span className="t-body">No ID needed for this drone here.</span></div></div> :
        <div className="group">{need.map((x) => { const have = s.docs.includes(x); return <div key={x} className="row">
          <span className="ico"><FileText size={16} /></span>
          <div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 600 }}>{x}</div><div className="t-cap muted" style={{ display: "flex", gap: 4, alignItems: "center" }}><Icon kind={have ? "pass" : "critical"} size={11} />{have ? "Added" : "Missing"}</div></div>
          {!have && <button className="btn btn-sm" data-hit onClick={() => up((p) => { p.docs.push(x); })}><Plus size={14} />Add <Mock /></button>}</div>; })}</div>}
      <div className="alert" style={{ marginTop: 14 }}><Icon kind="info" size={18} /><div className="t-cap">Concept information, not legal advice. Source: {c.source} · {c.verification}.</div></div>
    </>} />
  </Page>;
}
export function Settings() {
  const { s, up } = useProto();
  const Row = ({ icon, label, sub, right }: { icon: ReactNode; label: string; sub?: ReactNode; right?: ReactNode }) =>
    <div className="row"><span className="ico">{icon}</span><div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 500, fontSize: 15 }}>{label}</div>{sub && <div className="t-cap muted">{sub}</div>}</div>{right ?? <ChevronRight size={18} color="var(--grey-400)" />}</div>;
  return <Page title="Settings">
    <button className="card" data-hit onClick={() => up(go("account"))} style={{ width: "100%", padding: 14, display: "flex", gap: 12, alignItems: "center", textAlign: "left" }}>
      <span style={{ width: 52, height: 52, borderRadius: 9999, background: s.account ? "var(--grey-900)" : "var(--grey-100)", color: s.account ? "#fff" : "var(--grey-600)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18 }}>{s.account ? s.account.name.split(" ").map((w) => w[0]).join("") : <Smartphone size={22} />}</span>
      <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{s.account ? s.account.name : "Sync across your devices"}</div><div className="t-cap muted">{s.account ? `Signed in · ${s.account.email}` : "Sign in to use the same drones on iPhone, iPad, Duo and laptop"}</div></div><ChevronRight size={18} color="var(--grey-400)" />
    </button>
    <SectionH>Controls</SectionH>
    <div className="group">
      <Row icon={<Hand size={16} />} label="Left-handed layout" sub="Mirror the flight controls" right={<button className={`switch ${s.mirror ? "on" : ""}`} data-hit aria-pressed={s.mirror} aria-label="Left-handed layout" onClick={() => up((p) => { p.mirror = !p.mirror; })} />} />
      <Row icon={<AlertTriangle size={16} />} label="Stop motors in the air" sub={<>Long gesture only <Mock label="P2" /></>} right={<button className={`switch ${s.armStop ? "on" : ""}`} data-hit aria-pressed={s.armStop} aria-label="Stop motors in the air" onClick={() => up((p) => { p.armStop = !p.armStop; })} />} />
      <Row icon={<Gauge size={16} />} label="Controller skin" sub="Follows each drone" />
    </div>
    {s.armStop && <div className="alert warning" style={{ marginTop: 12 }}><Icon kind="warning" size={18} /><div className="t-cap"><b>Stop motors is on.</b> A long press will stop the motors in the air.</div></div>}
    <SectionH>Maker accounts</SectionH>
    <div className="group">{Array.from(new Set(s.drones.map((d) => d.brand))).map((b) => <Row key={b} icon={<Link2 size={16} />} label={BRAND_ACCOUNT[b].label} sub={s.brandAccounts.includes(b) ? "Connected" : BRAND_ACCOUNT[b].need === "optional" ? "Optional · not connected" : "Not connected"} />)}</div>
    <SectionH>General</SectionH>
    <div className="group">
      <Row icon={<Gauge size={16} />} label="Experience" sub={s.experience === "beginner" ? "New to drones · Beginner speed cap on" : "Flown before · full speed modes"} />
      <Row icon={<MapPin size={16} />} label="Location" sub={s.perms.location === "allowed" ? "Allowed" : s.perms.location === "denied" ? "Off · choose country by hand" : "Not asked"} />
      <Row icon={<Ruler size={16} />} label="Units" right={<span className="t-body muted">Metric <Mock /></span>} />
      <Row icon={<Globe size={16} />} label="Region" right={<span className="t-body muted">{COUNTRIES[s.country].name}</span>} />
      <Row icon={<ShieldCheck size={16} />} label="Privacy" />
    </div>
    <SectionH>About</SectionH>
    <div className="group">
      <Row icon={<Info size={16} />} label="Skyhand" sub="Concept by Artonest · not a real product" right={<span className="t-cap muted">v0.1</span>} />
    </div>
  </Page>;
}
