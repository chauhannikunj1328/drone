"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { BRANDS, COUNTRIES, SKINS, type BrandId, type CountryCode } from "@/lib/data";
import { DEVICE_APPS, PLATFORM_LABEL, appFromSlug, flyOrientation, type Platform } from "@/lib/layout";
import { LOOKS, droneOf, inAir, useProto, type Look, type Overlays, type Screen } from "@/lib/store";
import { Device } from "./Device";
import { FlyScreen } from "./Fly";
import { ObserverPhone } from "./Observer";
import { BookOpen, FoldHorizontal, RotateCw, UnfoldHorizontal } from "lucide-react";
import { DashboardScreen, WatchScreen } from "./Dashboard";
import { AccountScreen, ObCountry, ObDrone, ObPerms, ObSafety, ObYou, Welcome } from "./Onboarding";
import { AddBrand, AddModel, Capability, Flights, Hangar, PfChecklist, PfCountry, PfCrowd, PfObserver, PfRedFlag, PfSight, PfUseCase, Rules, Settings, Summary } from "./Screens";

const SCREENS: Record<Screen, () => ReactNode> = {
  hangar: Hangar, "add-brand": AddBrand, "add-model": AddModel, capability: Capability, "pf-country": PfCountry, "pf-usecase": PfUseCase,
  "pf-redflag": PfRedFlag, "pf-crowd": PfCrowd, "pf-checklist": PfChecklist, "pf-sight": PfSight, "pf-observer": PfObserver,
  fly: FlyScreen, summary: Summary, flights: Flights, rules: Rules, settings: Settings,
  welcome: Welcome, "ob-safety": ObSafety, "ob-perms": ObPerms, "ob-country": ObCountry, "ob-you": ObYou, "ob-drone": ObDrone, account: AccountScreen, dashboard: DashboardScreen, watch: WatchScreen,
};
const SCREEN_LABEL: Record<Screen, string> = {
  hangar: "S01 Your drones", "add-brand": "S03 Add a drone", "add-model": "S04 Choose your model", capability: "S05 What this drone can do",
  "pf-country": "S10 Where are you flying?", "pf-usecase": "S11 What are you shooting?", "pf-redflag": "S14 Can't fly here", "pf-crowd": "S16 People nearby",
  "pf-checklist": "S12 Before you fly", "pf-sight": "S13 Keep it in sight", "pf-observer": "S17 Invite an observer", fly: "S20-S24 Fly",
  summary: "S50 Flight summary", flights: "S51 Your flights", rules: "S52 Rules", settings: "S54 Settings",
  welcome: "S60 Welcome", "ob-safety": "S61 Before you start", "ob-perms": "S62 Allow access", "ob-country": "S63 Where do you fly?", "ob-you": "S64 About you", "ob-drone": "S65 Your first drone", account: "S67 Skyhand account", dashboard: "S70 Dashboard (laptop, iPad)", watch: "S71 Watch wall (laptop, iPad)",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div style={{ display: "grid", gap: 4 }}><span className="shell-label">{label}</span>{children}</div>;
}
function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="seg">{options.map(([v, l]) => <button key={v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

export function Shell({ locked }: { locked?: Platform }) {
  const { s, up, reset } = useProto();
  const Screen = SCREENS[s.screen];
  const d = droneOf(s); const sim = s.sims[s.droneId];
  const flyingNow = inAir(sim.phase);
  const showObserver = s.observer !== "none";
  return (
    <div className={`shell look-${s.look}`} style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={{ width: 300, flex: "none", overflowY: "auto", background: "var(--grey-0)", borderRight: "1px solid var(--grey-300)", padding: 16, display: "grid", gap: 14, alignContent: "start" }}>
        <div>
          <div className="t-title">Skyhand <span className="t-cap muted">working title</span></div>
          <div className="t-cap muted">Creative design · concept by Artonest · all data is mock</div>
        </div>
        <Field label="Design version (creative)">
          <Seg value={s.look} options={LOOKS.map(([v, l]) => [v, l.split(" ")[0]] as [Look, string])} onChange={(v) => up((p) => { p.look = v; })} />
          <span className="t-cap muted">{LOOKS.find(([v]) => v === s.look)![1]} · {LOOKS.find(([v]) => v === s.look)![2]}</span>
        </Field>
        <Field label="Screen">
          <select value={s.screen} onChange={(e) => up((p) => { p.screen = e.target.value as Screen; })}>
            {(Object.keys(SCREEN_LABEL) as Screen[]).map((k) => <option key={k} value={k}>{SCREEN_LABEL[k]}</option>)}
          </select>
        </Field>
        {locked
          ? <Field label="Device"><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><span className="t-head">{PLATFORM_LABEL[locked]}</span><Link href="/" className="t-cap" style={{ textDecoration: "underline" }}>All devices</Link></div></Field>
          : <Field label="Platform">
              <select value={s.platform} onChange={(e) => up((p) => { p.platform = e.target.value as Platform; })}>
                {(Object.keys(PLATFORM_LABEL) as Platform[]).map((k) => <option key={k} value={k}>{PLATFORM_LABEL[k]}</option>)}
              </select>
            </Field>}
        <Field label="Device apps (own ports)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DEVICE_APPS.map((a, i) => <a key={a.slug} href={`http://localhost:${4001 + i}`} target="_blank" rel="noreferrer" className="chip" style={{ textDecoration: "none", color: "inherit" }}>{a.label} :{4001 + i}</a>)}
          </div>
        </Field>
        {s.platform === "duoOpen" && <label className="t-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={s.halfFold} onChange={(e) => up((p) => { p.halfFold = e.target.checked; })} /> Half open (partially folded)
        </label>}
        <Field label="Orientation"><Seg value={s.orient} options={[["portrait", "Portrait"], ["landscape", "Landscape"]]} onChange={(v) => up((p) => { p.orient = v; })} /></Field>
        <Field label="Drone (controlled)">
          <select value={s.droneId} onChange={(e) => up((p) => { if (inAir(p.sims[p.droneId].phase) && p.screen === "fly") p.handoverTo = e.target.value; else { p.droneId = e.target.value; p.skin = "auto"; } })}>
            {s.drones.map((x) => <option key={x.id} value={x.id}>{x.nickname} · {x.model}</option>)}
          </select>
        </Field>
        <Field label="Skin">
          <select value={s.skin} onChange={(e) => up((p) => { p.skin = e.target.value as BrandId | "auto"; })}>
            <option value="auto">Follows the drone ({SKINS[d.brand].appCopied})</option>
            {BRANDS.map((b) => <option key={b.id} value={b.id}>Compare: {b.name}</option>)}
          </select>
        </Field>
        <Field label="Country">
          <select value={s.country} onChange={(e) => up((p) => { p.country = e.target.value as CountryCode; })}>
            {Object.values(COUNTRIES).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Events (simulate)">
          <div style={{ display: "grid", gap: 6 }}>
            <Seg value={s.link} options={[["strong", "Link OK"], ["weak", "Weak"], ["lost", "Lost"]]} onChange={(v) => up((p) => { p.link = v; })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button className="btn" style={{ minHeight: 34, fontSize: 13, padding: "0 6px" }} disabled={!flyingNow} onClick={() => up((p) => { const x = droneOf(p); x.battery = Math.max(0, x.battery - 20); })}>Battery −20%</button>
              <button className={`btn ${s.obstacle ? "btn-primary" : ""}`} style={{ minHeight: 34, fontSize: 13, padding: "0 6px" }} onClick={() => up((p) => { p.obstacle = !p.obstacle; })}>Obstacle</button>
              <button className={`btn ${s.moving ? "btn-primary" : ""}`} style={{ minHeight: 34, fontSize: 13, padding: "0 6px" }} onClick={() => up((p) => { p.moving = !p.moving; })}>Phone moving</button>
              <button className={`btn ${s.driving ? "btn-primary" : ""}`} style={{ minHeight: 34, fontSize: 13, padding: "0 6px" }} onClick={() => up((p) => { p.driving = !p.driving; if (p.driving) { const m = p.sims[p.droneId]; if (m.phase === "flying") m.phase = "paused"; } })}>Driving</button>
            </div>
          </div>
        </Field>
        <Field label="Overlays">
          {(["zones", "safe", "reserved", "hit", "mock"] as (keyof Overlays)[]).map((k) => (
            <label key={k} className="t-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={s.overlays[k]} onChange={(e) => up((p) => { p.overlays[k] = e.target.checked; })} />
              {{ zones: "Zones Z1 to Z8 (Fly)", safe: "Safe areas (mock)", reserved: "Reserved regions", hit: "Hit areas", mock: "Mock tags" }[k]}
            </label>
          ))}
        </Field>
        <label className="t-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={s.mirror} onChange={(e) => up((p) => { p.mirror = e.target.checked; })} /> Left-handed layout
        </label>
        <button className="btn" onClick={reset}>Reset prototype</button>
        <div className="t-cap muted">Hold buttons need a 1 s press. Right-click or press Enter on them for the confirm alternative. Laptop: keyboard W/S, arrows, Space, R.</div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: "flex", gap: 24, padding: "20px 24px 28px", background: "radial-gradient(ellipse at 50% 40%, #f4f4f4 0, #e2e2e2 70%)" }}>
        <Device half={s.halfFold} platform={s.platform} orient={s.orient} fly={s.screen === "fly"} dark={s.screen === "fly"} mirror={s.mirror} overlays={s.overlays} label={`Pilot · ${PLATFORM_LABEL[s.platform]} · ${SCREEN_LABEL[s.screen]}`}>
          <Screen />
        </Device>
        {showObserver && (
          <div style={{ width: 300, flex: "none", display: "flex" }}>
            <Device platform="iphone" orient="portrait" fly={false} mirror={false} overlays={{ ...s.overlays, zones: false }} label="Observer phone" maxScale={0.7} dark={s.observer === "joined"}>
              <ObserverPhone />
            </Device>
          </div>
        )}
      </main>
    </div>
  );
}

// A device on its own: just the app on its device frame. The only controls are the ones the real device has:
// rotate (iPhone, iPad, Duo) and open/close (Duo).
export function DeviceApp({ slug }: { slug: string }) {
  const { s, up } = useProto();
  const app = appFromSlug(slug)!;
  const Screen = SCREENS[s.screen];
  const open = s.platform === "duoOpen";
  // Fly is locked to landscape on Duo (Step 11 decision), so rotating does nothing there and is hidden.
  const rotateLocked = s.screen === "fly" && flyOrientation(s.platform, "portrait") === "landscape";
  // Device poses (HIG): closed, fully open, partially folded like a book.
  const pose = (label: string, icon: ReactNode, on: boolean, run: () => void) => (
    <button aria-label={label} aria-pressed={on} title={label} onClick={run}
      style={{ height: 40, padding: "0 16px 0 12px", borderRadius: 9999, border: "none", background: on ? "#141414" : "transparent", color: on ? "#fff" : "var(--grey-900)", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
      {icon}{label}
    </button>
  );
  const ctl = (label: string, icon: ReactNode, run: () => void) => (
    <button aria-label={label} title={label} onClick={run}
      style={{ height: 40, padding: "0 14px 0 12px", borderRadius: 9999, border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--grey-900)" }}>
      {icon}{label}
    </button>
  );
  return (
    <div className={`look-${s.look}`} style={{ position: "relative", height: "100vh", display: "flex", padding: app.start === "laptop" ? "24px 24px 48px" : "24px 24px 76px", background: "radial-gradient(ellipse at 50% 40%, #f4f4f4 0, #e2e2e2 70%)", overflow: "hidden" }}>
      <Device bare maxScale={2} half={s.halfFold} platform={s.platform} orient={s.orient} fly={s.screen === "fly"} dark={s.screen === "fly"} mirror={s.mirror} overlays={{ zones: false, safe: false, reserved: false, hit: false, mock: true }} label={app.label}>
        <Screen />
      </Device>
      <div style={{ position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)", display: "flex", gap: 2, padding: 4, borderRadius: 9999, background: "rgba(255,255,255,.9)", border: "1px solid var(--grey-200)", boxShadow: "var(--shadow-2)", backdropFilter: "blur(12px)" }}>
        {app.controls.includes("fold") && <>
          {pose("Closed", <FoldHorizontal size={17} />, !open, () => up((p) => { p.platform = "duoClosed"; p.halfFold = false; }))}
          {pose("Open", <UnfoldHorizontal size={17} />, open && !s.halfFold, () => up((p) => { p.platform = "duoOpen"; p.halfFold = false; }))}
          {pose("Half open", <BookOpen size={17} />, open && s.halfFold, () => up((p) => { p.platform = "duoOpen"; p.halfFold = true; }))}
        </>}
        {app.controls.includes("fold") && !rotateLocked && <span style={{ width: 1, margin: "8px 0", background: "var(--grey-200)" }} />}
        {app.controls.includes("rotate") && !rotateLocked && ctl(s.orient === "portrait" ? "Landscape" : "Portrait", <RotateCw size={17} />, () => up((p) => { p.orient = p.orient === "portrait" ? "landscape" : "portrait"; }))}
        {app.controls.length > 0 && <span style={{ width: 1, margin: "8px 0", background: "var(--grey-200)" }} />}
        {/* Creative design versions (creative-design branch) */}
        {LOOKS.map(([v, l]) => <button key={v} aria-pressed={s.look === v} title={l} onClick={() => up((p) => { p.look = v; })}
          style={{ height: 40, minWidth: 44, padding: "0 12px", borderRadius: 9999, border: "none", background: s.look === v ? "#141414" : "transparent", color: s.look === v ? "#fff" : "var(--grey-900)", fontSize: 13, fontWeight: 600 }}>{v.toUpperCase()}</button>)}
      </div>
    </div>
  );
}
