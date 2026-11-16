"use client";
// App start (S60 to S65) and Skyhand account (S67 to S69). Spec: 16-app-start-and-accounts.md
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Apple, Bell, Bluetooth, Check, ChevronLeft, ChevronRight, Eye, Globe, Laptop, Loader2, LogOut, Mail, MapPin, Plus, ShieldCheck,
  Smartphone, Sparkles, Tablet, Trash2, UserRound,
} from "lucide-react";
import { BRAND_ACCOUNT, BRANDS, COUNTRIES, FLAG_WORD, type BrandId, type CountryCode } from "@/lib/data";
import { frameSize, safeArea, sideControls } from "@/lib/layout";
import { useProto, type Account, type Perm, type Proto, type Screen } from "@/lib/store";
import { DroneArt, DroneCutout, StatusBar } from "./art";
import { RealMap } from "./RealMap";
import { SPOTS } from "@/lib/geo";
import { Page, SideStatus, foldClass } from "./Screens";
import { Icon } from "./ui";

const go = (sc: Screen) => (p: Proto) => { p.screen = sc; };
const MOCK_ACCOUNT: Account = { name: "Avery Kim", email: "avery@example.com", method: "Apple" };

// Wide screens (Duo open, landscape, laptop) use a book layout: picture left, content right, never across the fold.
function useSplit() {
  const { s } = useProto();
  const { W, H } = frameSize(s.platform, s.orient);
  // Open Duo: always split at the fold (portrait: left | right; landscape: top / bottom, handled in Onboard).
  if (s.platform === "duoClosed") return false; // the outer display is compact: one column, no picture
  return s.platform === "duoOpen" || (W > H * 1.15 && W >= 640);
}
// Hero for the start flow, in the Air Dropper / native style: a light 3D city map with cut-out drone photos floating over it.
// `fill` = fills its parent (book layouts), otherwise it is a rounded card. The map follows the chosen country.
function OnbHero({ step, fill = true, caption = true, radius = 0 }: { step?: number; fill?: boolean; caption?: boolean; radius?: number }) {
  const { s } = useProto();
  const spot = SPOTS[s.country];
  const shift = (step ?? 0) * 8;
  return (
    <div style={{ position: fill ? "absolute" : "relative", inset: fill ? 0 : undefined, height: fill ? undefined : "100%", overflow: "hidden", background: "#efede8", borderRadius: radius }}>
      <RealMap look="clay" pitch={58} bearing={20 + shift} zoom={15.1} center={spot.home} interactive={false} attribution={false} />
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(239,237,232,.0) 40%, rgba(239,237,232,.92) 100%)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", left: "50%", top: "26%", transform: "translateX(-50%)", pointerEvents: "none" }}><DroneCutout brand="dji" w={190} h={110} /></div>
      <div aria-hidden style={{ position: "absolute", left: "9%", top: "52%", pointerEvents: "none", opacity: .95 }}><DroneCutout brand="antigravity" w={96} h={60} /></div>
      <div aria-hidden style={{ position: "absolute", right: "9%", top: "46%", pointerEvents: "none", opacity: .95 }}><DroneCutout brand="parrot" w={96} h={60} /></div>
      {caption && <div style={{ position: "absolute", left: 24, right: 24, bottom: 24, color: "#141414" }}>
        <div className="t-cap" style={{ opacity: .6 }}>Skyhand · concept by Artonest</div>
        <div className="t-title" style={{ marginTop: 2 }}>Fly from your screen</div>
      </div>}
    </div>
  );
}
function SidePicture({ step }: { step?: number }) { return <OnbHero step={step} caption={step !== undefined} />; }

// ---------- Full-screen onboarding frame (no tab bar) ----------
function Onboard({ step, back, children, primary, secondary }: { step?: number; back?: Screen; children: ReactNode; primary?: ReactNode; secondary?: ReactNode }) {
  const { s, up } = useProto();
  const { W, H } = frameSize(s.platform, s.orient);
  const split = useSplit(); // hook: keep before the desktop early return
  // Desktop: the map hero on the left, a white card with the step on the right.
  if (s.platform === "laptop") return (
    <div className="light desk" style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden", background: "var(--app-bg, #ecebee)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "54%" }}><OnbHero step={step} caption={step !== undefined} /></div>
      <div style={{ position: "absolute", left: 40, top: 32, display: "flex", alignItems: "center", gap: 12, color: "#141414", zIndex: 2 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "#141414", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>S</span>
        <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.02em" }}>Skyhand</span>
      </div>
      <div className="no-scrollbar" style={{ position: "absolute", left: "54%", right: 0, top: 0, bottom: 0, overflowY: "auto", display: "grid", placeItems: "center", padding: 32 }}>
        <div className="card" style={{ width: 440, maxWidth: "100%", padding: 32, borderRadius: 24 }}>
          {(back || step) && <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            {back && <button className="icon-btn" data-hit aria-label="Back" style={{ width: 36, height: 36 }} onClick={() => up(go(back))}><ChevronLeft size={18} /></button>}
            {step && <><div className="stepper" style={{ flex: 1 }}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div><span className="t-cap muted">Step {step} of 5</span></>}
          </div>}
          {children}
          {primary && <div style={{ display: "grid", gap: 8, marginTop: 24 }}>{primary}{secondary}</div>}
        </div>
      </div>
      {s.permAsk && <PermAlert />}
      {s.signInSheet && <SignInSheet />}
    </div>
  );
  const safe = safeArea(s.platform, s.orient);
  const sbH = s.platform === "iphone" ? (s.orient === "landscape" ? 0 : 54) : s.platform === "tablet" ? 24 : 30;
  const top = Math.max(safe.t, sbH);
  // Open Duo: landscape = vertical fold (picture left | steps right); portrait = horizontal fold (steps top / picture and actions below).
  const fold = s.platform === "duoOpen" && s.orient === "landscape";
  const duoSide = sideControls(s.platform, s.orient); const sideW = duoSide ? 88 : 0;
  // In split mode the content lives in the right half (right of the fold on Duo open).
  const duoLand = s.platform === "duoOpen" && s.orient === "portrait"; // horizontal fold: content on top, picture and actions below
  const leftEdge = duoLand ? safe.l : split ? (fold ? W / 2 + 12 : Math.round(W * 0.48)) : safe.l;
  const maxW = !split && W >= 700 ? 480 : undefined;
  return (
    <div className={`light desk touch${foldClass(s)}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden", background: "var(--app-bg, var(--grey-50))" }}>
      {split && !duoLand && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: fold ? W / 2 - 12 : Math.round(W * 0.48) - 24 }}><SidePicture step={step} /></div>}
      {duoLand && <div style={{ position: "absolute", left: 0, right: sideW, top: H / 2 + 12, bottom: 0 }}><SidePicture step={step} /></div>}
      {!duoSide && <StatusBar platform={s.platform} landscape={s.orient === "landscape"} dark />}
      {duoSide && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: sideW, paddingTop: s.platform === "duoClosed" ? 48 : 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, background: "var(--bar-glass, rgba(22,22,22,.96))", borderLeft: "1px solid var(--line-2, #2a2a2a)", zIndex: 4 }}>
        <SideStatus />
        {back && <button data-hit aria-label="Back" onClick={() => up(go(back))} style={{ width: 48, height: 48, borderRadius: 9999, border: "none", background: "var(--raised, #262626)", color: "var(--text, #f2f2f2)", display: "grid", placeItems: "center" }}><ChevronLeft size={22} /></button>}
      </div>}
      <div className="no-scrollbar" style={{ position: "absolute", left: leftEdge, right: safe.r + sideW, top: duoSide ? 16 : top, bottom: duoLand ? H / 2 + 12 : safe.b + (primary ? (secondary ? 132 : 84) : 16), overflowY: "auto", padding: "4px 24px 12px", WebkitMaskImage: "linear-gradient(transparent 0, #000 10px, #000 calc(100% - 20px), transparent 100%)", maskImage: "linear-gradient(transparent 0, #000 10px, #000 calc(100% - 20px), transparent 100%)" }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          {(back || step) && (
            <div style={{ display: "flex", alignItems: "center", minHeight: 44, marginLeft: back ? -10 : 0 }}>
              {back && !duoSide && <button className="btn btn-ghost" data-hit aria-label="Back" style={{ minHeight: 40, padding: "0 8px" }} onClick={() => up(go(back))}><ChevronLeft size={22} /></button>}
              {step && <div className="stepper" style={{ flex: 1, marginLeft: back ? 6 : 0 }}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>}
            </div>
          )}
          {children}
        </div>
      </div>
      {primary && (
        <div style={duoLand
          ? { position: "absolute", right: sideW + 24, bottom: 24, width: 320, padding: 16, display: "grid", gap: 8, background: "var(--aerial-card, rgba(30,30,30,.94))", border: "1px solid var(--line-2, #2e2e2e)", borderRadius: 12 }
          : { position: "absolute", left: leftEdge, right: safe.r + sideW, bottom: safe.b + 12, padding: "0 24px", display: "grid", gap: 8 }}>
          <div style={{ maxWidth: maxW, width: "100%", margin: "0 auto", display: "grid", gap: 8 }}>{primary}{secondary}</div>
        </div>
      )}
      {s.permAsk && <PermAlert />}
      {s.signInSheet && <SignInSheet />}
    </div>
  );
}
// Short screens (landscape phones, the Duo in landscape): tighter spacing so a step fits without scrolling.
function useShort() { const { s } = useProto(); return frameSize(s.platform, s.orient).H < 700 || (s.platform === "duoOpen" && s.orient === "portrait"); } // the open Duo in portrait keeps the steps in its top half
const H1 = ({ children }: { children: ReactNode }) => { const short = useShort(); return <h1 className="t-display" style={{ margin: short ? "4px 0 4px" : "16px 0 8px", fontSize: short ? 28 : undefined, lineHeight: short ? "34px" : undefined }}>{children}</h1>; };
const Lead = ({ children }: { children: ReactNode }) => { const short = useShort(); return <p className="t-body muted" style={{ margin: short ? "0 0 8px" : "0 0 16px", fontSize: short ? 15 : undefined, lineHeight: short ? "20px" : undefined }}>{children}</p>; };

// ---------- S60 Welcome ----------
export function Welcome() {
  const { s, up } = useProto();
  const { W, H } = frameSize(s.platform, s.orient);
  const heroH = Math.min(W >= 700 ? 540 : 340, Math.round(H * (W > H ? (s.platform === "duoClosed" ? 0.26 : 0.42) : s.platform === "duoClosed" ? 0.34 : 0.44)));
  const split = useSplit() || s.platform === "laptop";
  return (
    <Onboard
      primary={<button className="btn btn-primary btn-block" data-hit onClick={() => up(go("ob-safety"))}>Get started</button>}
      secondary={<button className="btn btn-ghost btn-block" data-hit onClick={() => up((p) => { p.signInSheet = true; })}><span style={{ textAlign: "center" }}>Already use Skyhand? <b>Sign in</b></span></button>}>
      {!split && <div style={{ position: "relative", height: heroH, borderRadius: 24, overflow: "hidden", marginTop: 8 }}>
        <OnbHero fill={false} caption={false} radius={24} />
        <span className="chip" style={{ position: "absolute", left: 12, top: 12, background: "rgba(255,255,255,.9)", color: "#141414" }}><Sparkles size={12} />Concept by Artonest</span>
      </div>}
      <div className="t-over muted" style={{ marginTop: s.platform === "laptop" ? 0 : split ? Math.max(24, H * 0.18) : 22 }}>{s.platform === "laptop" ? "Welcome" : "Skyhand"}</div>
      {s.platform === "laptop" ? <>
        <h1 className="t-display" style={{ margin: "4px 0 8px" }}>Set up Skyhand</h1>
        <p className="t-body muted" style={{ margin: 0 }}>Five short steps: safety, access, country, experience and your first drone. You can fly in about two minutes.</p>
      </> : <>
        <h1 className="t-large" style={{ margin: "4px 0 8px" }}>Fly from your screen</h1>
        <p className="t-body muted" style={{ margin: 0 }}>Watch and fly your drone from iPhone, iPad, iPhone Duo or laptop. No goggles, no remote. Controls follow your drone&apos;s own controller.</p>
      </>}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {BRANDS.map((b) => <span key={b.id} className="chip soft">{b.name}</span>)}
      </div>
    </Onboard>
  );
}

// ---------- S61 Before you start ----------
export function ObSafety() {
  const { s, up } = useProto();
  const short = useShort();
  const rows: [ReactNode, string, string, string][] = [
    [<Eye key="e" size={20} />, "Keep it in sight", "A screen is not line of sight. Watch the drone with your own eyes, or add an observer next to you.", "Watch the drone with your own eyes, or add an observer."],
    [<Globe key="g" size={20} />, "Rules change by country", "Skyhand checks the rules where you fly and shows when it last checked. It is a guide, not legal advice.", "Skyhand shows each country's rules and when it checked. Not legal advice."],
    [<ShieldCheck key="s" size={20} />, "You are the pilot", "Pause, Return and Land are always on screen. You stay responsible for every flight.", "Pause, Return and Land are always on screen. You stay responsible."],
  ];
  return (
    <Onboard step={1} back="welcome" primary={<button className="btn btn-primary btn-block" data-hit onClick={() => up(go("ob-perms"))}>I understand</button>}>
      <H1>Before you start</H1>
      <Lead>Three things that keep every flight safe.</Lead>
      <div style={{ display: "grid", gap: short ? 8 : 12 }}>
        {rows.map(([ic, t, d, ds]) => (
          <div key={t} style={{ display: "flex", gap: short ? 12 : 16, alignItems: "flex-start", padding: short ? 12 : 16, borderRadius: 16, background: "var(--card-bg, var(--grey-50))" }}>
            <span style={{ width: short ? 32 : 40, height: short ? 32 : 40, borderRadius: short ? 10 : 12, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", flex: "none" }}>{ic}</span>
            <div><div className="t-head">{t}</div><div className="t-cap muted" style={{ marginTop: 2, fontSize: 14, lineHeight: "18px" }}>{short ? ds : d}</div></div>
          </div>))}
      </div>
      {short
        ? <p className="t-cap muted" style={{ margin: "8px 0 0" }}>Skyhand is a concept by Artonest, not a real product. Drone makers have not approved it.</p>
        : <div className="alert" style={{ marginTop: 16 }}><Icon kind="info" size={18} /><div className="t-cap">Skyhand is a concept by Artonest, not a real product. Drone makers have not approved it.</div></div>}
      {s.account && <p className="t-cap muted" style={{ marginTop: 12 }}>Signed in as {s.account.email}. Your drones will appear after this.</p>}
    </Onboard>
  );
}

// ---------- S62 Permissions ----------
const PERMS: { key: "location" | "nearby" | "notify"; icon: ReactNode; title: string; why: string; sys: string; sysWhy: string }[] = [
  { key: "location", icon: <MapPin size={18} />, title: "Location", why: "Finds your country's rules and no-fly zones, and lets the drone return to you.", sys: "Allow “Skyhand” to use your location?", sysWhy: "Used for country rules, no-fly zones and Return to My position." },
  { key: "nearby", icon: <Bluetooth size={18} />, title: "Nearby devices", why: "Finds and connects to your drone.", sys: "“Skyhand” would like to find and connect to devices on your local network", sysWhy: "Used to connect to your drone." },
  { key: "notify", icon: <Bell size={18} />, title: "Notifications", why: "Battery and link alerts if you leave the app during a flight.", sys: "“Skyhand” would like to send you notifications", sysWhy: "Battery, link and return alerts." },
];
function PermState({ v }: { v: Perm }) {
  if (v === "allowed") return <span className="chip soft"><Check size={13} />Allowed</span>;
  if (v === "denied") return <span className="chip hatch">Not now</span>;
  return null;
}
export function ObPerms() {
  const { s, up } = useProto();
  const next = () => up((p) => { if (p.account) { p.onboarded = true; p.screen = "hangar"; p.toast = `Signed in as ${p.account.email}. Your drones are here.`; } else p.screen = "ob-country"; });
  return (
    <Onboard step={2} back="ob-safety" primary={<button className="btn btn-primary btn-block" data-hit onClick={next}>Continue</button>}>
      <H1>Allow access</H1>
      <Lead>Skyhand asks only for what flying needs. You can change these later in Settings.</Lead>
      <div className="group">
        {PERMS.map((x) => (
          <div key={x.key} className="row" style={{ alignItems: "flex-start", padding: "16px" }}>
            <span className="ico">{x.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="t-label" style={{ fontWeight: 700, fontSize: 16 }}>{x.title}</div><div className="t-cap muted" style={{ marginTop: 4 }}>{x.why}</div></div>
            {s.perms[x.key] === "unknown"
              ? <button className="btn btn-sm btn-primary" data-hit onClick={() => up((p) => { p.permAsk = x.key; })}>Allow</button>
              : <PermState v={s.perms[x.key]} />}
          </div>))}
      </div>
      {s.perms.nearby === "denied" && <div className="alert warning" style={{ marginTop: 12 }}><Icon kind="warning" size={18} /><div className="t-cap" style={{ flex: 1 }}>Without nearby devices, Skyhand can&apos;t find your drone. You can turn it on when you add one.</div><button className="act" data-hit onClick={() => up((p) => { p.perms.nearby = "unknown"; p.permAsk = "nearby"; })}>Allow</button></div>}
      {s.perms.location === "denied" && <div className="alert warning" style={{ marginTop: 12 }}><Icon kind="warning" size={18} /><div className="t-cap">Without location you choose your country by hand, and Return to My position is off.</div></div>}
    </Onboard>
  );
}
// Mock of the system permission alert, so the priming screen and the real prompt can be shown together.
function PermAlert() {
  const { s, up } = useProto();
  const x = PERMS.find((q) => q.key === s.permAsk)!;
  const set = (v: Perm) => up((p) => { if (p.permAsk) p.perms[p.permAsk] = v; p.permAsk = undefined; });
  const btn = (label: string, v: Perm, bold?: boolean) => <button key={label} data-hit onClick={() => set(v)} style={{ height: 44, border: "none", borderTop: "1px solid var(--line, var(--grey-200))", background: "transparent", fontSize: 17, fontWeight: bold ? 600 : 400, color: "var(--accent, var(--grey-900))" }}>{label}</button>;
  return (
    <div className="sheet-back" style={{ alignItems: "center" }}>
      <div role="alertdialog" aria-label={x.sys} style={{ width: 270, borderRadius: 12, background: "var(--sheet-bg, rgba(38,38,38,.96))", color: "var(--text, #f2f2f2)", backdropFilter: "blur(30px) saturate(160%)", textAlign: "center", overflow: "hidden", boxShadow: "var(--shadow-3)", display: "grid" }}>
        <div style={{ padding: "16px 16px 16px" }}><div style={{ fontSize: 16, fontWeight: 600, lineHeight: "21px" }}>{x.sys}</div><div className="t-cap" style={{ marginTop: 8, fontSize: 14 }}>{x.sysWhy}</div>
          {x.key === "location" && <div style={{ height: 90, marginTop: 12, borderRadius: 8, overflow: "hidden", position: "relative" }}><div style={{ position: "absolute", inset: 0 }}><MapPreview /></div></div>}
          <div className="t-micro muted" style={{ marginTop: 8 }}>System prompt (mock)</div></div>
        {x.key === "location" ? [btn("Allow Once", "allowed"), btn("Allow While Using App", "allowed", true), btn("Don’t Allow", "denied")] : [btn("Don’t Allow", "denied"), btn("Allow", "allowed", true)]}
      </div>
    </div>
  );
}
function MapPreview() {
  return <svg width="100%" height="100%" viewBox="0 0 240 90" preserveAspectRatio="xMidYMid slice"><rect width="240" height="90" fill="#e6e6e6" /><path d="M0 30 H240 M0 64 C80 58 140 70 240 60 M70 0 V90 M170 0 V90" stroke="#fff" strokeWidth="7" /><circle cx="120" cy="45" r="16" fill="rgba(0,0,0,.12)" /><circle cx="120" cy="45" r="6" fill="#141414" stroke="#fff" strokeWidth="2" /></svg>;
}

// ---------- S63 Your country ----------
export function ObCountry() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  const auto = s.perms.location === "allowed";
  return (
    <Onboard step={3} back="ob-perms" primary={<button className="btn btn-primary btn-block" data-hit onClick={() => up(go("ob-you"))}>Continue</button>}>
      <H1>Where do you fly?</H1>
      <Lead>{auto ? "We found your country from your location. Rules and limits follow it." : "Location is off, so choose your country. Rules and limits follow it."}</Lead>
      <div className="card raised" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontWeight: 800 }}>{c.code}</span>
        <div style={{ flex: 1 }}><div className="t-cap muted">{auto ? "Detected" : "Selected"} <MapPin size={11} style={{ verticalAlign: -1 }} /></div><div className="t-head">{c.name}</div><div className="t-cap muted">Max height {c.maxAltitude} m · {c.verification}</div></div>
        <span className={`chip ${c.level === "rules" ? "dashed" : c.level === "cant" ? "solid" : "soft"}`}>{FLAG_WORD[c.level]}</span>
      </div>
      <div className="t-over muted" style={{ margin: "4px 4px 8px" }}>Change</div>
      <div className="group">
        {Object.values(COUNTRIES).map((x) => (
          <button key={x.code} className="row" data-hit onClick={() => up((p) => { p.country = x.code as CountryCode; })}>
            <span className="t-label" style={{ width: 28, fontWeight: 800 }}>{x.code}</span>
            <span className="t-label" style={{ flex: 1, fontWeight: 600 }}>{x.name}</span>
            {x.level === "cant" && <Icon kind="critical" size={14} />}
            {s.country === x.code && <Check size={18} strokeWidth={3} />}
          </button>))}
      </div>
      {c.redForVisitors && <div className="group" style={{ marginTop: 12 }}><div className="row"><span className="ico"><MapPin size={16} /></span><span className="t-label" style={{ flex: 1 }}>I live in {c.name}</span>
        <button className={`switch ${s.resident ? "on" : ""}`} data-hit aria-pressed={s.resident} aria-label={`I live in ${c.name}`} onClick={() => up((p) => { p.resident = !p.resident; })} /></div></div>}
    </Onboard>
  );
}

// ---------- S64 About you ----------
export function ObYou() {
  const { s, up } = useProto();
  const opt = (k: "beginner" | "experienced", t: string, d: string) => {
    const on = s.experience === k;
    return <button key={k} data-hit onClick={() => up((p) => { p.experience = k; })} style={{ textAlign: "left", padding: 16, borderRadius: 16, border: on ? "2px solid var(--sel-bg, var(--grey-900))" : "2px solid transparent", background: "var(--card-bg, var(--grey-0))", display: "flex", gap: 12, alignItems: "center" }}>
      <span style={{ flex: 1 }}><span className="t-head" style={{ display: "block" }}>{t}</span><span className="t-cap muted">{d}</span></span>
      <span style={{ width: 24, height: 24, borderRadius: 9999, border: on ? "none" : "1.5px solid var(--grey-300)", background: on ? "var(--accent)" : "transparent", color: "var(--on-accent)", display: "grid", placeItems: "center" }}>{on && <Check size={15} strokeWidth={3} />}</span>
    </button>;
  };
  return (
    <Onboard step={4} back="ob-country" primary={<button className="btn btn-primary btn-block" data-hit onClick={() => up(go("ob-drone"))}>Continue</button>}
      secondary={<button className="btn btn-ghost btn-block" data-hit onClick={() => up(go("ob-drone"))}>Skip</button>}>
      <H1>About you</H1>
      <Lead>This sets safe defaults. Change them any time in Settings.</Lead>
      <div style={{ display: "grid", gap: 12 }}>
        {opt("beginner", "New to drones", "Beginner speed cap on. Extra tips on the Fly screen.")}
        {opt("experienced", "I've flown before", "Full speed modes from the start.")}
      </div>
      <div className="group" style={{ marginTop: 16 }}>
        <div className="row"><span className="ico"><UserRound size={16} /></span><div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 600 }}>Left-handed layout</div><div className="t-cap muted">Mirror the flight controls</div></div>
          <button className={`switch ${s.mirror ? "on" : ""}`} data-hit aria-pressed={s.mirror} aria-label="Left-handed layout" onClick={() => up((p) => { p.mirror = !p.mirror; })} /></div>
      </div>
    </Onboard>
  );
}

// ---------- S65 Your first drone ----------
export function ObDrone() {
  const { up } = useProto();
  const card = (icon: ReactNode, t: string, d: string, run: (p: Proto) => void, primary?: boolean) => (
    <button data-hit onClick={() => up(run)} style={{ textAlign: "left", padding: 16, borderRadius: 16, border: "none", background: primary ? "var(--primary-bg, var(--accent))" : "var(--card-bg, var(--grey-0))", color: primary ? "var(--primary-fg, #fff)" : "var(--text, var(--grey-900))", display: "flex", gap: 16, alignItems: "center", boxShadow: "var(--shadow-1)" }}>
      <span style={{ width: 52, height: 52, borderRadius: 12, background: primary ? "rgba(255,255,255,.14)" : "var(--grey-100)", display: "grid", placeItems: "center", flex: "none" }}>{icon}</span>
      <span style={{ flex: 1 }}><span className="t-head" style={{ display: "block" }}>{t}</span><span className="t-cap" style={{ opacity: .7 }}>{d}</span></span>
      <ChevronRight size={20} style={{ opacity: .6 }} />
    </button>
  );
  return (
    <Onboard step={5} back="ob-you">
      <H1>Your first drone</H1>
      <Lead>Connect the drone you own, or look around with demo drones first.</Lead>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "8px 0 24px" }}>{(["dji", "antigravity", "parrot"] as BrandId[]).map((b) => <span key={b} style={{ width: 88, height: 70, borderRadius: 14, background: "var(--card-bg, var(--grey-50))", display: "grid", placeItems: "center" }}><DroneCutout brand={b} w={76} h={50} /></span>)}</div>
      <div style={{ display: "grid", gap: 12 }}>
        {card(<Plus size={24} />, "Add my drone", "DJI, Antigravity, Parrot, Autel or Skydio", (p) => { p.obAdding = true; p.screen = "add-brand"; }, true)}
        {card(<Sparkles size={22} />, "Explore with demo drones", "Five mock drones. Nothing connects.", (p) => { p.onboarded = true; p.screen = "hangar"; })}
      </div>
    </Onboard>
  );
}

// ---------- Maker sign-in step inside Add a drone (S04) ----------
export function MakerSignIn({ brand, onDone }: { brand: BrandId; onDone: () => void }) {
  const { up } = useProto();
  const a = BRAND_ACCOUNT[brand]; const name = BRANDS.find((b) => b.id === brand)!.name;
  const [busy, setBusy] = useState(false);
  // Keep the latest onDone in a ref: the 250 ms simulation re-render must not restart this timer.
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => { if (!busy) return; const t = setTimeout(() => { up((p) => { if (!p.brandAccounts.includes(brand)) p.brandAccounts.push(brand); }); done.current(); }, 900); return () => clearTimeout(t); }, [busy, brand, up]);
  return (
    <div className="card" style={{ padding: 16, textAlign: "left", marginTop: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>{name.slice(0, 3).toUpperCase()}</span>
        <div style={{ flex: 1 }}><div className="t-head">{a.label}</div><div className="t-cap muted">{a.need === "required" ? "Needed by " + name : a.need === "optional" ? "Optional" : "Sign-in steps not checked"} · {a.verification}</div></div>
      </div>
      <p className="t-cap muted" style={{ margin: "12px 0 12px", fontSize: 14, lineHeight: "18px" }}>{a.why} You sign in on {name}&apos;s page; Skyhand never sees your password (concept, mocked).</p>
      <button className="btn btn-primary btn-block" data-hit disabled={busy} onClick={() => setBusy(true)}>{busy ? <><Loader2 size={16} className="animate-spin" />Signing in</> : <>Sign in with {name}</>}</button>
      {a.need !== "required" && !busy && <button className="btn btn-ghost btn-block" data-hit style={{ marginTop: 4 }} onClick={onDone}>Skip for now</button>}
    </div>
  );
}

// ---------- Sign-in sheet (Skyhand account) ----------
export function SignInSheet() {
  const { s, up } = useProto();
  const [email, setEmail] = useState(false);
  const done = (method: Account["method"]) => up((p) => {
    p.account = { ...MOCK_ACCOUNT, method, email: method === "Apple" ? "avery.k@privaterelay.example" : MOCK_ACCOUNT.email };
    p.signInSheet = false;
    if (!p.onboarded && p.screen === "welcome") p.screen = "ob-safety";
  });
  return (
    <div className="sheet-back" onClick={() => up((p) => { p.signInSheet = false; })}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Sign in to Skyhand">
        <div className="t-title">Sign in to Skyhand</div>
        <p className="t-cap muted" style={{ margin: "4px 0 16px", fontSize: 14 }}>Keep drones, documents and flights the same on {s.onboarded ? "all your devices" : "this device and your others"}. Skyhand works without an account.</p>
        {!email ? <div style={{ display: "grid", gap: 12 }}>
          <button className="btn btn-primary btn-block" data-hit onClick={() => done("Apple")}><Apple size={18} />Sign in with Apple</button>
          <button className="btn btn-block" data-hit onClick={() => setEmail(true)}><Mail size={17} />Continue with email</button>
        </div> : <div style={{ display: "grid", gap: 12 }}>
          <label className="t-label" style={{ display: "grid", gap: 8 }}>Email<input defaultValue={MOCK_ACCOUNT.email} style={{ minHeight: 48, borderRadius: 12, border: "none", padding: "0 16px", fontSize: 17 }} /></label>
          <button className="btn btn-primary btn-block" data-hit onClick={() => done("Email")}>Send sign-in code (mock)</button>
          <button className="btn btn-ghost btn-block" onClick={() => setEmail(false)}>Back</button>
        </div>}
      </div>
    </div>
  );
}

// ---------- S67 to S69 Skyhand account ----------
export function AccountScreen() {
  const { s, up } = useProto();
  const a = s.account;
  const devices: [ReactNode, string, string][] = [[<Smartphone key="i" size={16} />, "iPhone", "iphone"], [<Tablet key="t" size={16} />, "iPad", "tablet"], [<Smartphone key="d" size={16} />, "iPhone Duo", "duo"], [<Laptop key="l" size={16} />, "Laptop", "laptop"]];
  const here = s.platform === "duoOpen" || s.platform === "duoClosed" ? "duo" : s.platform;
  const makers = Array.from(new Set(s.drones.map((d) => d.brand)));
  return (
    <Page title="Skyhand account" back="settings">
      {!a ? <>
        <div style={{ height: 120, borderRadius: 20, background: "var(--card-bg, var(--grey-100))", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-2, var(--grey-600))" }}>
          <Smartphone size={34} strokeWidth={1.4} /><Tablet size={44} strokeWidth={1.4} /><Laptop size={48} strokeWidth={1.4} />
        </div>
        <div className="t-title" style={{ marginTop: 16 }}>Sync across your devices</div>
        <p className="t-body muted">Sign in to keep your drones, documents and flights the same on iPhone, iPad, iPhone Duo and laptop.</p>
        <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
          <button className="btn btn-primary btn-block" data-hit onClick={() => up((p) => { p.signInSheet = true; })}>Sign in</button>
        </div>
        <p className="t-cap muted" style={{ marginTop: 12, textAlign: "center" }}>Skyhand works without an account. Flying never needs one.</p>
      </> : <>
        <div className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 52, height: 52, borderRadius: 9999, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", fontWeight: 700 }}>{a.name.split(" ").map((w) => w[0]).join("")}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{a.name}</div><div className="t-cap muted" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.email} · {a.method === "Apple" ? "Sign in with Apple" : "Email"}</div></div>
        </div>
        <div className="section-h t-over muted">Synced devices · mock</div>
        <div className="group">{devices.map(([ic, t, k]) => <div key={k} className="row"><span className="ico">{ic}</span><span className="t-label" style={{ flex: 1, fontWeight: 600 }}>{t}</span><span className="t-cap muted">{k === here ? "This device" : "Synced 2 min ago"}</span></div>)}</div>
        <div className="section-h t-over muted">Maker accounts</div>
        <div className="group">{makers.map((b) => { const on = s.brandAccounts.includes(b); return <div key={b} className="row"><span className="ico"><Icon kind={on ? "pass" : "pending"} size={16} /></span>
          <div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 600 }}>{BRAND_ACCOUNT[b].label}</div><div className="t-cap muted">{on ? "Connected" : BRAND_ACCOUNT[b].need === "optional" ? "Optional · not connected" : "Not connected"}</div></div>
          {on && <button className="btn btn-sm" data-hit onClick={() => up((p) => { p.brandAccounts = p.brandAccounts.filter((x) => x !== b); })}>Disconnect</button>}</div>; })}</div>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <button className="btn btn-block" data-hit onClick={() => up((p) => { p.account = undefined; })}><LogOut size={16} />Sign out</button>
          <button className="btn btn-ghost btn-block" data-hit style={{ color: "var(--grey-900)", textDecoration: "underline" }} onClick={() => up((p) => { p.deleteConfirm = true; })}><Trash2 size={16} />Delete account</button>
        </div>
      </>}
      {s.deleteConfirm && (
        <div className="sheet-back" style={{ alignItems: "center", position: "fixed" }} onClick={() => up((p) => { p.deleteConfirm = false; })}>
          <div className="sheet center" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Delete account">
            <div className="t-title">Delete your Skyhand account?</div>
            <p className="t-body muted" style={{ fontSize: 14 }}>Synced copies of your drones, documents and flights are deleted from Skyhand. What is on this device stays. Your maker accounts are not touched.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => up((p) => { p.deleteConfirm = false; })}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => up((p) => { p.account = undefined; p.deleteConfirm = false; p.toast = "Account deleted. This device keeps its data."; })}>Delete</button>
            </div>
          </div>
        </div>)}
    </Page>
  );
}
