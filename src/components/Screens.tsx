"use client";
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle, Camera, Car, Check, ChevronLeft, ChevronRight, Clock, Eye, FileText, Gauge, Globe, Hand, Heart, History, Info, Link2,
  Loader2, MapPin, Mountain, Navigation, Plane, Plus, Ruler, Scale, Search, Settings as SettingsIcon, ShieldCheck, Smartphone, Sparkles,
  Trees, Users, Warehouse, Wifi, LayoutDashboard, Grid2x2, UserRound,
} from "lucide-react";
import { BRANDS, COUNTRIES, FLAG_WORD, SKINS, requiredDocs, type CountryCode, type Drone } from "@/lib/data";
import { frameSize, hasCommandCentre, safeArea, sideControls } from "@/lib/layout";
import { checklist, defaultMode, droneOf, inAir, isRedFor, useProto, type Proto, type Screen, type UseCase } from "@/lib/store";
import { Battery, DroneArt, DroneHero, PhotoCredit, Scene, StatusBar, Thumb } from "./art";
import { ALERTS, DRONE_PHOTO } from "@/lib/data";
import { Icon, Mock, type IconKind } from "./ui";
import { MakerSignIn, SignInSheet } from "./Onboarding";
import { RealMap } from "./RealMap";
import { world } from "@/lib/world";
import { offset } from "@/lib/geo";
import { HangarDesk } from "./Dashboard";
import { BRAND_ACCOUNT } from "@/lib/data";

const go = (sc: Screen) => (p: Proto) => { p.screen = sc; };
// Open iPhone Duo: the fold is treated as reserved in every pose, so nothing sits across it.
// Sheets, dialogs and banners move to one side of the fold (CSS .fold-v / .fold-h).
export const foldClass = (s: Proto) => s.platform === "duoOpen" ? (s.orient === "landscape" ? " fold-v" : " fold-h") : "";
// Two-pane frame on the open Duo: Columns sends its right column to the second pane through this context.
const DuoPaneCtx = createContext<{ el: HTMLDivElement | null; claim: () => void } | null>(null);

// Vertical status bar for the Duo side column (time, signal, Wi-Fi, battery stacked).
export function SideStatus() {
  return (
    <div aria-label="Status bar" style={{ display: "grid", justifyItems: "center", gap: 8, color: "var(--text, #f2f2f2)", fontSize: 12, fontWeight: 600 }}>
      <span className="num">9:41</span>
      <svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="#f2f2f2" /><rect x="5" y="5" width="3" height="6" rx="1" fill="#f2f2f2" /><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="#f2f2f2" /><rect x="15" y="0" width="3" height="11" rx="1" fill="#f2f2f2" /></svg>
      <svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" stroke="#f2f2f2" strokeOpacity=".4" fill="none" /><rect x="2.5" y="2.5" width="16" height="7" rx="2" fill="#f2f2f2" /></svg>
    </div>
  );
}

// ---------- Page frame: status bar, navigation, tab bar ----------
export function Page({ title, back, children, tabs = true, large, right, sub, full, footer, bleed }: {
  title: string; back?: Screen; children: ReactNode; tabs?: boolean; large?: boolean; right?: ReactNode; sub?: ReactNode; full?: boolean; footer?: ReactNode;
  // bleed: dark full-bleed command-centre content (Dashboard, Watch wall, laptop Hangar). No title or padding.
  bleed?: boolean;
}) {
  const { s, up } = useProto();
  const { W, H } = frameSize(s.platform, s.orient);
  const [paneEl, setPaneEl] = useState<HTMLDivElement | null>(null);
  const [claimedFor, setClaimedFor] = useState("");
  const safe = safeArea(s.platform, s.orient);
  const landscapePhone = s.platform === "iphone" && s.orient === "landscape";
  // iPhone Duo: controls (and the status bar) move to the side on the outer display and on the inner display in landscape.
  const duoSide = sideControls(s.platform, s.orient);
  const side = landscapePhone || duoSide;
  const sbH = s.platform === "iphone" ? (landscapePhone ? 0 : 54) : s.platform === "tablet" ? 24 : s.platform === "laptop" || duoSide ? 0 : 30;
  const top = Math.max(safe.t, sbH);
  const isLarge = large ?? !back;
  const tabsList: [string, Screen, ReactNode][] = [
    // Fly is not a tab: flying is an action on a chosen drone (from Hangar), not a place.
    ...(hasCommandCentre(s.platform) ? [["Dashboard", "dashboard", <LayoutDashboard key="d" size={22} strokeWidth={1.8} />] as [string, Screen, ReactNode]] : []),
    ["Hangar", "hangar", <Warehouse key="h" size={22} strokeWidth={1.8} />],
    ...(hasCommandCentre(s.platform) ? [["Watch", "watch", <Grid2x2 key="w" size={22} strokeWidth={1.8} />] as [string, Screen, ReactNode]] : []),
    ["Flights", "flights", <History key="fl" size={22} strokeWidth={1.8} />], ["Rules", "rules", <Scale key="r" size={22} strokeWidth={1.8} />],
    ["Settings", "settings", <SettingsIcon key="s" size={22} strokeWidth={1.8} />],
  ];
  const tabH = 50;
  const desk = s.platform === "laptop";
  const railW = duoSide ? 88 : 84;
  // Task-oriented screens minimise the tab bar so their own actions stay visible (HIG: vertical bar compression).
  const task = s.screen.startsWith("pf-") || ["add-brand", "add-model", "capability"].includes(s.screen);
  const isOn = (sc: Screen) => s.screen === sc || (sc === "hangar" && (s.screen.startsWith("pf-") || ["add-brand", "add-model", "capability", "summary"].includes(s.screen)));
  // In-flight banner: any drone in the air stays one tap away from every page.
  // Not during first setup: the new user has no drones in the air yet.
  const airborne = !s.obAdding && !bleed ? s.drones.filter((d) => inAir(s.sims[d.id].phase)) : [];
  const lead = airborne.find((d) => d.id === s.droneId) ?? airborne[0];
  const bannerH = lead ? 56 : 0, footH = footer ? 90 : 0;
  const bottomBase = tabs && !side && !desk ? tabH + safe.b : safe.b;
  // Desktop: FlightHub-style top bar (logo, centred tabs, status on the right) instead of a sidebar.
  const topH = 56;
  const tabBar = tabs && desk ? (
    <nav aria-label="Sections" style={{ position: "absolute", left: 0, right: 0, top: 0, height: topH, background: "var(--bar, #161616)", color: "var(--text, #f2f2f2)", borderBottom: "1px solid var(--line-2, #2a2a2a)", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, zIndex: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--fh-blue)", display: "grid", placeItems: "center" }}><Navigation size={16} color="#fff" fill="#fff" /></span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}>Skyhand</span>
        <span style={{ fontSize: 12, color: "#7c7c7c", border: "1px solid #343434", borderRadius: 4, padding: "0px 8px" }}>Concept</span>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 4, height: "100%" }}>
        {tabsList.filter(([, sc]) => sc !== "settings").map(([t, sc]) => { const on = isOn(sc); return <button key={t} data-hit onClick={() => up(go(sc))} aria-current={on ? "page" : undefined}
          style={{ height: "100%", padding: "0 16px", border: "none", borderBottom: on ? "2px solid var(--fh-blue)" : "2px solid transparent", background: "transparent", fontSize: 14, fontWeight: on ? 600 : 500, color: on ? "var(--text, #fff)" : "var(--text-2, #9a9a9a)" }}>{t}</button>; })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220, justifyContent: "flex-end" }}>
        <span className="chip" style={{ height: 30 }}><MapPin size={12} />{COUNTRIES[s.country].name}</span>
        <button className="icon-btn" aria-label="Settings" title="Settings" style={{ width: 34, height: 34, background: isOn("settings") ? "var(--fh-blue)" : "#262626" }} onClick={() => up(go("settings"))}><SettingsIcon size={16} /></button>
        <button aria-label="Account" title={s.account ? s.account.email : "Sign in"} onClick={() => up(go("account"))} style={{ width: 34, height: 34, borderRadius: 9999, border: "1px solid #343434", background: s.account ? "var(--fh-blue)" : "#262626", color: "#fff", fontSize: 12, fontWeight: 700 }}>{s.account ? s.account.name.split(" ").map((w) => w[0]).join("") : <UserRound size={15} />}</button>
      </div>
    </nav>
  ) : duoSide ? (
    // Duo side column, top to bottom: outer camera, vertical status bar, navigation (Back) and the prominent action, then the tab bar.
    <nav aria-label="Controls" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: railW, paddingTop: s.platform === "duoClosed" ? 48 : 12, paddingBottom: 16, borderLeft: "1px solid var(--line-2, #2a2a2a)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "var(--bar-glass, rgba(22,22,22,.96))", zIndex: 6 }}>
      <SideStatus />
      {(back || right) && <div style={{ display: "grid", gap: 8, justifyItems: "center", marginTop: 8 }}>
        {back && <button data-hit aria-label="Back" title="Back" onClick={() => up(go(back))} style={{ width: 48, height: 48, borderRadius: 9999, border: "none", background: "var(--raised, #262626)", color: "var(--text, #f2f2f2)", display: "grid", placeItems: "center" }}><ChevronLeft size={22} /></button>}
        {right}
      </div>}
      <div style={{ flex: 1 }} />
      {tabs && tabsList.filter(([, sc]) => !task || isOn(sc)).map(([t, sc, ic]) => {
        const on = isOn(sc);
        return <button key={t} data-hit onClick={() => up(go(sc))} aria-current={on ? "page" : undefined} title={t}
          style={{ width: 72, minHeight: 56, border: "none", borderRadius: 12, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: on ? "var(--fh-blue)" : "var(--tab-off, rgba(255,255,255,.55))", fontSize: 12, fontWeight: on ? 600 : 500 }}>
          {ic}{t}</button>;
      })}
    </nav>
  ) : tabs && (
    <nav aria-label="Tabs" style={side
      ? { position: "absolute", right: 0, top: sbH, bottom: 0, width: railW + safe.r, paddingRight: safe.r, borderLeft: "1px solid var(--line-2, #2a2a2a)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, background: "var(--bar-glass, rgba(22,22,22,.96))", backdropFilter: "blur(20px)" }
      : { position: "absolute", left: 0, right: 0, bottom: 0, height: tabH + safe.b, paddingBottom: safe.b, borderTop: "1px solid var(--line-2, #2a2a2a)", display: "flex", background: "var(--bar-glass, rgba(22,22,22,.96))", backdropFilter: "blur(20px)", zIndex: 5 }}>
      {tabsList.map(([t, sc, ic]) => {
        const on = isOn(sc);
        return <button key={t} data-hit onClick={() => up(go(sc))} aria-current={on ? "page" : undefined}
          style={{ flex: side ? undefined : 1, minHeight: 48, border: "none", background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, color: on ? "var(--fh-blue)" : "var(--tab-off, rgba(255,255,255,.55))", fontSize: 12, fontWeight: on ? 600 : 500 }}>
          {ic}{t}</button>;
      })}
    </nav>
  );
  const regular = W >= 600;
  const padX = regular ? 28 : 18;
  const overlays = <>
      {s.dronePicker && <DronePicker onClose={() => up((p) => { p.dronePicker = false; })} />}
      {s.signInSheet && <SignInSheet />}
      {s.toast && s.screen !== "fly" && (
        <div style={{ position: "absolute", left: 16, right: 16, top: (desk ? topH : top) + 8, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}>
          <div className="alert" style={{ maxWidth: 520, margin: "0 auto" }}><Icon kind="info" size={18} /><div className="t-cap" style={{ flex: 1 }}>{s.toast}</div><button className="act">OK</button></div>
        </div>)}
  </>;
  // ---------- Desktop page layouts (high-fidelity, after FlightHub 2) ----------
  if (desk && !bleed && !tabs) {
    // Setup pages without navigation (first drone, can't-fly-here): same aerial frame as the start screens.
    return (
      <div className="light desk" style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden", background: "var(--app-bg, #0c0c0c)" }}>
        <div style={{ position: "absolute", inset: 0 }}><Scene heading={260} height={30} /></div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(8,10,14,.82), rgba(8,10,14,.45))" }} />
        <div style={{ position: "absolute", left: 40, top: 32, display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--fh-blue)", display: "grid", placeItems: "center", fontWeight: 800 }}>S</span><span style={{ fontSize: 20, fontWeight: 700 }}>Skyhand</span>
        </div>
        <div className="no-scrollbar" style={{ position: "absolute", left: "50%", top: 88, maxHeight: H - 128, transform: "translateX(-50%)", width: 640, overflowY: "auto", background: "rgba(30,30,30,.95)", border: "1px solid #2e2e2e", borderRadius: 12, padding: "24px 32px 32px", boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36 }}>
            {back && <button className="icon-btn" data-hit aria-label="Back" style={{ width: 32, height: 32 }} onClick={() => up(go(back))}><ChevronLeft size={18} /></button>}
            <div className="t-title" style={{ flex: 1 }}>{title}</div>{right}
          </div>
          {sub && <div className="t-body muted" style={{ marginTop: 4 }}>{sub}</div>}
          <div style={{ marginTop: 16 }}>{children}</div>
        </div>
        {overlays}
      </div>
    );
  }
  if (desk && !bleed) {
    // Pages with navigation: top bar, a header band with title and actions, then a wide content area.
    return (
      <div className="light desk" style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: topH, height: 72, borderBottom: "1px solid var(--line-2, #262626)", background: "var(--bar, #161616)", padding: "0 32px", display: "flex", alignItems: "center", gap: 16 }}>
          {back && <button className="icon-btn" data-hit aria-label="Back" style={{ width: 34, height: 34 }} onClick={() => up(go(back))}><ChevronLeft size={18} /></button>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t-cap muted">{back ? "Skyhand / " + (back === "hangar" ? "Hangar" : back.startsWith("pf-") ? "Before you fly" : back) : "Skyhand"}</div>
            <div className="t-display">{title}</div>
          </div>
          {sub && <div className="t-body muted" style={{ maxWidth: 400 }}>{sub}</div>}
          {right}
        </div>
        <div className="no-scrollbar" style={{ position: "absolute", left: 0, right: 0, top: topH + 72, bottom: bannerH + footH, overflowY: "auto", padding: "32px" }}>
          {s.screen.startsWith("pf-")
            ? <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 380px", gap: 32, alignItems: "start" }}><div>{children}</div><PreflightAside /></div>
            : <div style={{ maxWidth: full ? 1200 : 760, margin: "0 auto" }}>{children}</div>}
        </div>
        {(footer || lead) && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "12px 40px 16px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, zIndex: 6, background: "linear-gradient(rgba(18,18,18,0), var(--grey-50) 30%)" }}>
            {lead && <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}><FlightBanner id={lead.id} more={airborne.length - 1} /></div>}
            {footer && <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>{footer}</div>}
          </div>)}
        {tabBar}
        {overlays}
      </div>
    );
  }
  // ---------- iPhone Duo open: two panes, one on each side of the fold (portrait: left | right, landscape: top / bottom) ----------
  if (s.platform === "duoOpen" && !bleed) {
    const portrait = s.orient === "portrait";
    const F = 12; // half of the 24 pt fold region
    const cTop = portrait ? top : 8, cBottom = portrait ? tabH + safe.b : safe.b, cRight = portrait ? 0 : railW;
    // Landscape: fold runs vertically, panes left | right. Portrait: fold runs horizontally, panes top / bottom.
    const paneA: CSSProperties = portrait ? { left: 0, right: 0, top: cTop, height: H / 2 - F - cTop } : { left: 0, width: W / 2 - F, top: cTop, bottom: cBottom };
    const paneB: CSSProperties = portrait ? { left: 0, right: 0, top: H / 2 + F, bottom: cBottom } : { left: W / 2 + F, right: cRight, top: cTop, bottom: cBottom };
    return (
      <div className={`light desk touch${foldClass(s)}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
        {portrait && <StatusBar platform={s.platform} landscape={false} dark />}
        <DuoPaneCtx.Provider value={{ el: paneEl, claim: () => setClaimedFor(s.screen) }}>
          <div className="no-scrollbar" style={{ position: "absolute", ...paneA, overflowY: "auto", padding: "8px 24px 0" }}>
            {portrait && (back || right) && <div style={{ display: "flex", alignItems: "center", minHeight: 44, gap: 4, marginLeft: back ? -12 : 0 }}>
              {back && <button className="btn btn-ghost" data-hit style={{ minHeight: 40, padding: "0 8px", fontWeight: 500, gap: 4 }} onClick={() => up(go(back))}><ChevronLeft size={22} />Back</button>}
              <div style={{ flex: 1 }} />{right}
            </div>}
            <h1 className={portrait ? "t-large" : "t-display"} style={{ margin: "8px 0 0" }}>{title}</h1>
            {sub && <div className="t-body muted" style={{ marginTop: 4 }}>{sub}</div>}
            <div style={{ marginTop: 16, paddingBottom: 24 }}>{children}</div>
            {(footer || lead) && <div style={{ position: "sticky", bottom: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, padding: "12px 0 12px", background: "linear-gradient(rgba(18,18,18,0), var(--grey-50) 30%)" }}>
              {lead && <FlightBanner id={lead.id} more={airborne.length - 1} />}{footer}
            </div>}
          </div>
          <div className="no-scrollbar" style={{ position: "absolute", ...paneB, overflowY: "auto", padding: portrait ? "16px 24px 24px" : "16px 24px 24px" }}>
            <div ref={setPaneEl} />
            {claimedFor !== s.screen && <PreflightAside />}
          </div>
        </DuoPaneCtx.Provider>
        {tabBar}
        {s.dronePicker && <DronePicker onClose={() => up((p) => { p.dronePicker = false; })} />}
        {s.signInSheet && <SignInSheet />}
        {s.toast && (
          <div style={{ position: "absolute", left: 16, width: portrait ? W - 32 : W / 2 - F - 32, top: cTop + 8, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}>
            <div className="alert"><Icon kind="info" size={18} /><div className="t-cap" style={{ flex: 1 }}>{s.toast}</div><button className="act">OK</button></div>
          </div>)}
      </div>
    );
  }
  return (
    <div className={`${bleed ? "fh" : "light"} desk${desk ? "" : " touch"}${foldClass(s)}`} style={{ position: "absolute", inset: 0, width: W, height: H, overflow: "hidden" }}>
      {!duoSide && <StatusBar platform={s.platform} landscape={s.orient === "landscape"} dark />}
      {bleed && <div className="fh" style={{ position: "absolute", left: safe.l, right: (side ? railW : 0) + safe.r, top: desk ? (tabs ? topH : 0) : top, bottom: bottomBase, overflow: "hidden" }}>{children}</div>}
      {!bleed && <div className="no-scrollbar" style={{ position: "absolute", left: safe.l, right: (side ? railW : 0) + safe.r, top: desk ? (tabs ? topH + 16 : 24) : top, bottom: bottomBase + bannerH + footH, overflowY: "auto", padding: `4px ${padX}px 28px` }}>
        <div style={{ maxWidth: full || W < 800 ? undefined : 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", minHeight: 44, gap: 4, marginLeft: back && !duoSide ? -10 : 0 }}>
          {back && !duoSide && <button className="btn btn-ghost" data-hit style={{ minHeight: 40, padding: "0 8px", fontWeight: 500, gap: 4 }} onClick={() => up(go(back))}><ChevronLeft size={22} />Back</button>}
          {!isLarge && <div className="t-head" style={{ flex: 1, textAlign: "center", marginRight: back ? 60 : 0 }}>{title}</div>}
          {isLarge && <div style={{ flex: 1 }} />}
          {!duoSide && right}
        </div>
        {isLarge && <h1 className={H < 500 ? "t-display" : "t-large"} style={{ margin: "4px 0 0" }}>{title}</h1>}
        {sub && <div className="t-body muted" style={{ marginTop: 4 }}>{sub}</div>}
        <div style={{ marginTop: 16 }}>{children}</div>
        </div>
      </div>}
      {(footer || lead) && (
        <div style={{ position: "absolute", left: safe.l, right: s.platform === "duoOpen" && s.orient === "portrait" && s.halfFold ? W / 2 + 16 : (side ? railW : 0) + safe.r, bottom: bottomBase, padding: `12px ${padX}px 10px`, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8, zIndex: 6,
          background: "linear-gradient(rgba(18,18,18,0), var(--grey-50) 30%)" }}>
          {lead && <div style={{ maxWidth: full || W < 800 ? undefined : 680, width: "100%", margin: "0 auto" }}><FlightBanner id={lead.id} more={airborne.length - 1} /></div>}
          {footer && <div style={{ maxWidth: full || W < 800 ? undefined : 680, width: "100%", margin: "0 auto" }}>{footer}</div>}
        </div>)}
      {tabBar}
      {s.dronePicker && <DronePicker onClose={() => up((p) => { p.dronePicker = false; })} />}
      {s.signInSheet && <SignInSheet />}
      {s.toast && s.screen !== "fly" && (
        <div style={{ position: "absolute", left: 16, right: 16, top: (desk ? topH : top) + 8, zIndex: 45 }} onClick={() => up((p) => { p.toast = undefined; })}>
          <div className="alert" style={{ maxWidth: 520, margin: "0 auto" }}><Icon kind="info" size={18} /><div className="t-cap" style={{ flex: 1 }}>{s.toast}</div><button className="act">OK</button></div>
        </div>)}
    </div>
  );
}

// Desktop pre-flight side panel: what you are about to fly, where, and how close you are to ready.
function PreflightAside() {
  const { s } = useProto(); const d = droneOf(s); const c = COUNTRIES[s.country];
  const items = checklist(s); const passed = items.filter((i) => i.state === "pass").length; const blocked = items.some((i) => i.state === "block");
  return (
    <aside style={{ position: "sticky", top: 0, display: "grid", gap: 12 }}>
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ position: "relative", height: 176 }}><RealMap center={world(s).spot.home} zoom={15.5} homes={[world(s).myHome]} landing={world(s).landing} noFly={world(s).noFly} interactive={false} attribution={false} /><span className="chip" style={{ position: "absolute", left: 10, top: 10 }}><MapPin size={12} />{c.name}</span></div>
        <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 64, height: 50, borderRadius: 8, background: "var(--grey-100)", display: "grid", placeItems: "center" }}><DroneArt brand={d.brand} size={60} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{d.nickname}</div><div className="t-cap muted">{d.model} · {Math.round(d.battery)}% · {SKINS[d.brand].appCopied}</div></div>
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="t-over muted">Readiness</span><span className="t-cap" style={{ color: blocked ? "#ff3b30" : "var(--fh-green)", fontWeight: 700 }}>{blocked ? "Not ready" : "Ready"}</span></div>
        <div className="meter" style={{ marginTop: 12 }}><i style={{ width: `${(passed / items.length) * 100}%`, background: blocked ? "#ff3b30" : undefined }} /></div>
        <div className="t-cap muted" style={{ marginTop: 8 }}>{passed} of {items.length} checks passed</div>
      </div>
      <div className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <div className="t-over muted">Rules · {c.name}</div>
        <div style={{ display: "flex", gap: 24 }}><div><div className="t-cap muted">Max height</div><div className="t-title num">{c.maxAltitude} m</div></div><div><div className="t-cap muted">Status</div><div className="t-head" style={{ marginTop: 4 }}>{FLAG_WORD[c.level]}</div></div></div>
        <div className="t-cap muted">{c.verification} · {c.source}</div>
      </div>
    </aside>
  );
}

function FlightBanner({ id, more }: { id: string; more: number }) {
  const { s, up } = useProto();
  const d = droneOf(s, id); const m = s.sims[id];
  const mine = id === s.droneId;
  return <button data-hit onClick={() => up((p) => { p.droneId = id; p.skin = "auto"; p.screen = "fly"; })}
    style={{ width: "100%", height: 48, borderRadius: 12, border: "none", background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", gap: 12, padding: "0 8px 0 16px", boxShadow: "var(--shadow-2)", textAlign: "left" }}>
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
  const duo = useContext(DuoPaneCtx);
  useEffect(() => { duo?.claim(); });
  if (duo) return <>{left}{duo.el ? createPortal(right, duo.el) : null}</>;
  const { W } = frameSize(s.platform, s.orient);
  if (W < 600) return <>{left}<div style={{ height: 16 }} />{right}</>;
  const fold = s.platform === "duoOpen" && s.orient === "portrait";
  const gapFold = s.halfFold ? 56 : 32; // small adjustment when folding (HIG: avoid extreme layout changes)
  const cols = (fold ? "1fr 1fr" : ratio).split(" ").map((f) => `minmax(0, ${f})`).join(" ");
  return <div style={{ display: "grid", gridTemplateColumns: cols, columnGap: fold ? gapFold : 28, alignItems: "start" }}><div style={{ minWidth: 0 }}>{left}</div><div style={{ minWidth: 0 }}>{right}</div></div>;
}

function SectionH({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-h" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><span className="t-over muted">{children}</span>{action}</div>;
}
function CodeBadge({ code, size = 36 }: { code: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: 8, background: "var(--accent)", color: "var(--grey-0)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: size * 0.34, letterSpacing: ".04em", flex: "none" }}>{code}</span>;
}
function FlagChip({ level }: { level: "few" | "rules" | "cant" }) {
  return <span className={`chip ${level === "rules" ? "dashed" : level === "cant" ? "solid" : "soft"}`}><Icon kind={level === "cant" ? "critical" : level === "rules" ? "warning" : "pass"} size={12} />{FLAG_WORD[level]}</span>;
}

// ---------- Hangar ----------
export function Hangar() {
  const { s, up } = useProto();
  if (s.platform === "laptop") return <HangarDesk />;
  const c = COUNTRIES[s.country];
  const sel = droneOf(s);
  const [ic, label] = statusIcon(sel, s);
  const { W } = frameSize(s.platform, s.orient);
  const sa = safeArea(s.platform, s.orient);
  const rail = (s.platform === "iphone" || s.platform === "duoClosed") && s.orient === "landscape" ? 84 : 0;
  const narrow = W >= 600 && (W - sa.l - sa.r - rail - 56 - (s.platform === "duoOpen" ? 56 : 28)) / 2 < 340;
  const hero = (
    <div className="card raised" style={{ padding: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="t-over muted">Selected</div>
          <div className="t-title" style={{ marginTop: 4 }}>{sel.nickname}</div>
          <div className="t-label muted">{sel.model}</div>
        </div>
        <span className="chip soft"><Icon kind={ic} size={12} />{label}</span>
      </div>
      <div style={{ margin: "12px -16px 8px", overflow: "hidden" }}>
        <DroneHero brand={sel.brand} height={176} bg="radial-gradient(ellipse at 50% 60%, var(--grey-0) 0, var(--grey-100) 70%)" />
      </div>
      <PhotoCredit brand={sel.brand} style={{ display: "block", marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr 1fr" : "repeat(3, 1fr)", gap: 8 }}>
        {[["Battery", `${Math.round(sel.battery)}%`, <Battery key="b" pct={sel.battery} size={11} />], ["Weight", `${sel.weightGrams} g`, sel.weightIsMock ? <Mock key="m" /> : null], ["Firmware", sel.firmwareOk ? "Current" : "Update", null]].slice(0, narrow ? 2 : 3).map(([k, v, x]) => (
          <div key={k as string} style={{ background: "var(--grey-50)", borderRadius: 12, padding: "12px 12px" }}>
            <div className="t-cap muted" style={{ display: "flex", alignItems: "center", gap: 8 }}>{k}{x}</div>
            <div className="t-head num" style={{ marginTop: 4 }}>{v}</div>
          </div>))}
      </div>
      <div className="group" style={{ marginTop: 12 }}>
        <div className="row"><span className="ico"><FileText size={16} /></span><div style={{ flex: 1 }}><div className="t-label">IDs for {c.name}</div><div className="t-cap muted">{requiredDocs(c, sel, s.resident).join(" · ") || "None needed"}</div></div></div>
        <div className="row"><span className="ico"><Gauge size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Controls</div><div className="t-cap muted">{SKINS[sel.brand].appCopied} layout</div></div></div>
        {narrow && <div className="row"><span className="ico"><ShieldCheck size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Firmware</div><div className="t-cap muted">{sel.firmwareOk ? "Up to date" : "Update needed"}</div></div></div>}
        <div className="row"><span className="ico"><Link2 size={16} /></span><div style={{ flex: 1 }}><div className="t-label">Access</div><div className="t-cap muted">Concept link</div></div></div>
      </div>
      {W >= 600 && <div style={{ marginTop: 16 }}><DroneAction d={sel} block /></div>}
    </div>
  );
  const list = (
    <div>
      {c.level !== "few" && (
        <div className={`alert ${c.level === "cant" ? "critical" : "warning"}`} style={{ marginBottom: 16 }}>
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
                  <span className="t-cap" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden" }}><Icon kind={dic} size={12} />{dl}<span className="muted" style={{ display: "inline-flex", gap: 4, alignItems: "center", fontWeight: 500 }}>· <Battery pct={d.battery} size={9} /> {Math.round(d.battery)}%</span></span>
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
  return <Page full footer={W < 600 && !inAir(s.sims[sel.id].phase) ? <DroneAction d={sel} block /> : undefined} title="Your drones" sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MapPin size={14} />{c.name}</span>}
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
  return <div style={{ display: "grid", gap: 8 }}>
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
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--grey-100)", borderRadius: 12, padding: "0 12px", height: 40, margin: "16px 0" }}><Search size={16} color="var(--grey-500)" /><span className="t-body muted">Search makers</span></div>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${W >= 600 ? 3 : 2}, 1fr)`, gap: 12 }}>
      {BRANDS.map((b) => (
        <button key={b.id} className="card" data-hit style={{ padding: 16, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }} onClick={() => up((p) => { p.addBrand = b.id; p.screen = "add-model"; })}>
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
    <div className="card raised" style={{ padding: 16, textAlign: "center" }}>
      <div style={{ height: 150, display: "grid", placeItems: "center", background: "radial-gradient(circle, var(--grey-50) 0, var(--grey-0) 70%)", borderRadius: 12 }}><DroneArt brand={b.id} size={230} view="hero" /></div>
      <div className="t-title" style={{ marginTop: 8 }}>{b.model}</div>
      <div className="t-cap muted">Turn on the drone and keep it close to this device</div>
      <div className="stepper" style={{ margin: "16px 0 4px" }}><i className="on" /><i className={needSignIn ? "" : "on"} /></div>
      <div className="t-cap muted" style={{ textAlign: "left" }}>{needSignIn ? `Step 1 of 2 · ${acct.label}` : "Step 2 of 2 · Connect the drone"}</div>
      {needSignIn ? <MakerSignIn brand={b.id} onDone={() => setSkipped(true)} />
        : state === "choose"
        ? <>{s.brandAccounts.includes(b.id) && <div className="chip soft" style={{ marginTop: 12 }}><Check size={13} />{acct.label} connected</div>}
            <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => setState("connecting")}><Link2 size={17} />Connect drone</button></>
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
    <div style={{ textAlign: "center", display: "grid", justifyItems: "center", gap: 8 }}><DroneArt brand={b.id} size={320} view="hero" /><PhotoCredit brand={b.id} /><div className="t-title">{b.model}</div></div>
    {notSold && <div className="alert warning" style={{ marginTop: 12 }}><Icon kind="limited" size={18} /><div className="t-cap">Limited in this country: Skydio is mostly sold in the US.</div></div>}
    <div className="group" style={{ marginTop: 16 }}>{rows.map(([i, t, d]) => <div key={t} className="row"><span className="ico">{i}</span><div style={{ flex: 1 }}><div className="t-label">{t}</div><div className="t-cap muted">{d}</div></div></div>)}</div>
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up((p) => {
      const id = `d${p.drones.length + 1}${p.obAdding ? "n" : ""}`;
      p.drones.push({ id, nickname: `My ${b.model.replace(/^(DJI|Antigravity|Parrot|Autel|Skydio) /, "")}`, brand: b.id, model: b.model, weightGrams: b.id === "antigravity" ? 249 : 1000, weightIsMock: b.id !== "antigravity", hasCamera: true, battery: 100, status: b.id === "skydio" ? "Limited" : "Ready", statusReason: b.id === "skydio" ? "monitor and mission-start only" : undefined, firmwareOk: true, monitorOnly: b.id === "skydio", is360: b.id === "antigravity" });
      p.sims[id] = { ...p.sims.d1, phase: "grounded", height: 0, distance: 0, photos: 0, alertsSeen: [], smartMode: undefined, mode: defaultMode(b.id) };
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
      <div className="t-cap muted" style={{ margin: "4px 0 12px" }}>You control one drone at a time. Others keep their own plan and can be watched.</div>
      <div className="group">{s.drones.map((d) => {
        const air = inAir(s.sims[d.id].phase); const [ic, lab] = statusIcon(d, s); const me = d.id === cur.id;
        let btn: ReactNode;
        if (me) btn = <span className="chip solid">{inFlight && air ? "Controlling" : "Selected"}</span>;
        else if (d.status === "Offline") btn = <span className="chip hatch">Offline</span>;
        else if (air) btn = <button className="btn btn-sm" data-hit onClick={() => { up((p) => { if (inAir(p.sims[p.droneId].phase)) { p.handoverTo = d.id; p.screen = "fly"; } else { p.droneId = d.id; p.skin = "auto"; p.screen = "fly"; } }); onClose(); }}>{curAir ? "Switch" : d.monitorOnly ? "Watch" : "Open"}</button>;
        else if (curAir) btn = <span className="t-cap muted" style={{ maxWidth: 96, textAlign: "right" }}>Land {cur.nickname} first</span>;
        else btn = <button className="btn btn-sm btn-primary" data-hit onClick={() => { up((p) => { p.droneId = d.id; p.skin = "auto"; p.sight = "unknown"; p.crowdAck = false; if (p.screen === "fly") p.screen = "pf-country"; }); onClose(); }}>Choose</button>;
        return <div key={d.id} className="row" style={{ background: me ? "var(--grey-50)" : undefined }}>
          <span style={{ width: 52, height: 44, borderRadius: 8, background: "var(--grey-100)", display: "grid", placeItems: "center", flex: "none" }}><DroneArt brand={d.brand} size={48} /></span>
          <span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block", fontWeight: 700 }}>{d.nickname}</span>
            <span className="t-cap muted" style={{ display: "flex", gap: 4, alignItems: "center", whiteSpace: "nowrap", overflow: "hidden" }}><Icon kind={ic} size={11} />{lab} · {Math.round(d.battery)}%</span></span>
          {btn}</div>;
      })}</div>
      {!inFlight && <button className="btn btn-block" style={{ marginTop: 12 }} onClick={() => { up(go("add-brand")); onClose(); }}><Plus size={16} />Add a drone</button>}
    </div>
  </div>;
}

// ---------- Before you fly ----------
function Steps({ n }: { n: number }) {
  return <div style={{ marginBottom: 16 }}>
    <div className="stepper">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</div>
    <div className="t-cap muted" style={{ marginTop: 8, fontWeight: 600 }}>Step {n} of 4 · Before you fly</div>
  </div>;
}
function CountryCard() {
  const { s } = useProto(); const c = COUNTRIES[s.country];
  return <div className="card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
    <CodeBadge code={c.code} size={44} />
    <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{c.name}</div><div className="t-cap muted">{c.verification} · {c.source}</div></div>
    <FlagChip level={c.level} />
  </div>;
}
function DroneStrip() {
  const { s, up } = useProto(); const d = droneOf(s);
  return <>
    <button data-hit onClick={() => up((p) => { p.dronePicker = true; })} aria-label={`Flying ${d.nickname}. Change drone`} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 8px 12px", background: "var(--grey-0)", border: "1px solid var(--grey-150)", borderRadius: 12, marginBottom: 16, textAlign: "left", boxShadow: "var(--shadow-1)" }}>
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
          <span style={{ width: 24, height: 24, borderRadius: 9999, border: s.country === x.code ? "none" : "1.5px solid var(--grey-300)", background: s.country === x.code ? "var(--accent)" : "transparent", display: "grid", placeItems: "center", color: "var(--on-accent)" }}>{s.country === x.code && <Check size={15} strokeWidth={3} />}</span>
        </button>))}
    </div>
    {c.redForVisitors && <div className="group" style={{ marginTop: 12 }}><div className="row"><span className="ico"><MapPin size={16} /></span><span className="t-label" style={{ flex: 1 }}>I live in {c.name}</span>
      <button className={`switch ${s.resident ? "on" : ""}`} data-hit aria-pressed={s.resident} aria-label={`I live in ${c.name}`} onClick={() => up((p) => { p.resident = !p.resident; })} /></div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up(go("pf-usecase"))}>Next</button>
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
          style={{ textAlign: "left", padding: 16, borderRadius: 16, minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between", border: on ? "2px solid var(--accent)" : "1px solid var(--grey-150)", background: on ? "var(--accent)" : "var(--grey-0)", color: on ? "var(--on-accent)" : undefined, boxShadow: "var(--shadow-1)" }}>
          <span style={{ display: "flex", justifyContent: "space-between" }}>{ic}{on && <Check size={18} strokeWidth={3} />}</span>
          <span><span className="t-head" style={{ display: "block" }}>{l}</span><span className="t-cap" style={{ opacity: .65 }}>{sub}</span></span>
        </button>;
      })}
    </div>
    {s.useCase === "Car" && <div className="alert" style={{ marginTop: 16 }}><Icon kind="info" size={18} /><div className="t-cap">Only a passenger can fly. Controls lock while the car moves.</div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up((p) => { p.screen = isRedFor(p) ? "pf-redflag" : p.useCase === "Wedding" && !p.crowdAck ? "pf-crowd" : "pf-checklist"; })}>Next</button>
  </Page>;
}
export function PfRedFlag() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="" back="pf-usecase" tabs={false}>
    <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
      <div style={{ width: 84, height: 84, borderRadius: 9999, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center", margin: "0 auto" }}><AlertTriangle size={40} strokeWidth={1.8} /></div>
      <div className="t-display" style={{ marginTop: 16 }}>You can&apos;t fly this drone here</div>
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginTop: 8 }}><CodeBadge code={c.code} size={24} /><span className="t-cap muted">{c.name} · {c.verification} · {c.source}</span></div>
    </div>
    <SectionH>Why</SectionH>
    <div className="group">{!c.redForVisitors?.length && <div className="row"><Icon kind="info" size={16} /><span className="t-body">No visitor limits recorded for {c.name}.</span></div>}{(c.redForVisitors ?? []).map((r) => <div key={r} className="row" style={{ alignItems: "flex-start" }}><Icon kind="critical" size={16} /><span className="t-body" style={{ flex: 1 }}>{r}</span></div>)}</div>
    <SectionH>What you can do</SectionH>
    <div style={{ display: "grid", gap: 12 }}>
      {c.approvalPath && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.docs.push("MLIT approval"); p.screen = "pf-checklist"; })}><FileText size={17} />Add approval document <Mock /></button>}
      {(c.code === "AE" || c.code === "IN") && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.resident = true; p.screen = "pf-checklist"; })}><MapPin size={17} />I live in {c.name}</button>}
      <button className="btn btn-block" data-hit onClick={() => up(go("pf-country"))}><Globe size={17} />Choose another country</button>
      <button className="btn btn-primary btn-block" data-hit onClick={() => up(go("hangar"))}>Back to Hangar</button>
    </div>
    <p className="t-cap muted" style={{ marginTop: 16, textAlign: "center" }}>Concept information, not legal advice. Check local rules.</p>
  </Page>;
}
export function PfCrowd() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="People nearby" back="pf-usecase" large>
    <div style={{ height: 130, borderRadius: 16, background: "var(--grey-100)", display: "grid", placeItems: "center", marginBottom: 16 }}><Users size={56} strokeWidth={1.3} color="var(--grey-600)" /></div>
    <div className="alert warning"><Icon kind="warning" size={20} /><div className="t-body">{c.crowd}</div></div>
    {s.country === "US" && <div className="group" style={{ marginTop: 12 }}><div className="row"><span className="ico"><Info size={16} /></span><span className="t-body">If this is paid work, it counts as Part 107 commercial work.</span></div></div>}
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up((p) => { p.crowdAck = true; p.screen = "pf-checklist"; })}>I understand</button>
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
    <div className="card raised" style={{ padding: 16, display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 9999, background: blocked ? "var(--grey-0)" : "var(--accent)", border: blocked ? "3px solid var(--grey-900)" : "none", color: blocked ? "var(--grey-900)" : "#fff", display: "grid", placeItems: "center" }}>
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
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} disabled={blocked} onClick={() => up(go("pf-sight"))}>{blocked ? "Fix the items above" : "Continue"}</button>
  </Page>;
}
export function PfSight() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country];
  return <Page title="Keep it in sight" back="pf-checklist" large>
    <Steps n={4} />
    <div style={{ height: 150, borderRadius: 16, background: "linear-gradient(var(--grey-200), var(--grey-50))", position: "relative", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ position: "absolute", left: "18%", bottom: 18, width: 54, height: 54, borderRadius: 9999, background: "var(--accent)", color: "var(--on-accent)", display: "grid", placeItems: "center" }}><Eye size={26} /></div>
      <svg style={{ position: "absolute", inset: 0 }} width="100%" height="100%"><line x1="26%" y1="68%" x2="72%" y2="28%" stroke="var(--grey-900)" strokeWidth="2" strokeDasharray="4 6" /></svg>
      <div style={{ position: "absolute", right: "16%", top: 18 }}><DroneArt brand={droneOf(s).brand} size={80} /></div>
    </div>
    <div className="t-title">Can you see the drone with your own eyes?</div>
    <p className="t-body muted">A screen is not line of sight.{c.screenOnlyNeedsObserver ? ` In ${c.name}, flying by screen only needs an observer next to you.` : ""}</p>
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
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
    <div className="card raised" style={{ padding: 16, textAlign: "center", marginTop: 12 }}>
      <QR />
      <div className="t-cap muted" style={{ marginTop: 12 }}>Or enter this code <Mock /></div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
        {"K7Q2M9".split("").map((ch, i) => <span key={i} style={{ width: 38, height: 48, borderRadius: 8, background: "var(--grey-100)", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, marginLeft: i === 3 ? 10 : 0 }}>{ch}</span>)}
      </div>
    </div>
    <div className="group" style={{ marginTop: 16 }}>
      <div className="row"><span className="ico"><Smartphone size={16} /></span><div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 600 }}>{s.observer === "joined" ? "Observer joined" : "Waiting for the observer"}</div>
        <div className="t-cap muted">{s.observer === "joined" ? (s.observerSight ? "They can see the drone" : "Waiting for them to confirm sight") : "Use the observer phone on the right, or simulate it"}</div></div>
        {s.observer === "joined" && s.observerSight ? <Icon kind="pass" size={20} /> : <Loader2 size={18} className="animate-spin" />}</div>
    </div>
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      {!ok && <button className="btn btn-block" data-hit onClick={() => up((p) => { p.observer = "joined"; p.observerSight = true; })}>Simulate observer joining <Mock label="Prototype" /></button>}
      <button className="btn btn-primary btn-block" data-hit disabled={!ok} onClick={() => up((p) => { p.sight = "observer"; p.screen = "fly"; })}>Continue</button>
    </div>
  </Page>;
}

// ---------- After flight, flights, rules, settings ----------
function Stat({ k, v, icon }: { k: string; v: string; icon: ReactNode }) {
  return <div style={{ background: "var(--grey-0)", border: "1px solid var(--grey-150)", borderRadius: 12, padding: 12 }}>
    <div className="t-cap muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>{icon}{k}</div>
    <div className="t-title num" style={{ marginTop: 4 }}>{v}</div></div>;
}
export function Summary() {
  const { s, up } = useProto();
  const f = s.flights.find((x) => x.id === s.lastFlight);
  if (!f) return <Page title="Flight summary" back="hangar"><div className="card" style={{ padding: 32, textAlign: "center" }}><History size={36} color="var(--grey-400)" /><p className="t-body muted">No flight yet.</p></div></Page>;
  const mm = Math.floor(f.seconds / 60), ss = String(f.seconds % 60).padStart(2, "0");
  const d = s.drones.find((x) => x.id === f.droneId);
  return <Page title="Flight summary" large><Columns left={<>
    <div className="card raised" style={{ overflow: "hidden" }}>
      <div style={{ position: "relative", height: 176 }}><RealMap center={world(s).spot.home} zoom={16} homes={[world(s).myHome]} landing={world(s).landing} path={[world(s).myHome, offset(world(s).myHome, f.maxD * 0.6, f.maxD * 0.5), world(s).myHome]} interactive={false} attribution={false} />
        <span className="chip" style={{ position: "absolute", left: 12, top: 12 }}><Icon kind="landed" size={12} />Landed safely</span></div>
      <div style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
        {d && <DroneArt brand={d.brand} size={52} />}
        <div style={{ flex: 1 }}><div className="t-head">{f.nickname}</div><div className="t-cap muted">{f.model} · {f.country} · {f.useCase}</div></div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
      <Stat k="Flight time" v={`${mm}:${ss}`} icon={<Clock size={13} />} /><Stat k="Max height" v={`${f.maxH} m`} icon={<Ruler size={13} />} />
      <Stat k="Max distance" v={`${f.maxD} m`} icon={<MapPin size={13} />} /><Stat k="Photos" v={String(f.photos)} icon={<Camera size={13} />} />
    </div>
  </>} right={<>
    <SectionH action={<span className="t-cap muted">Mock</span>}>Media</SectionH>
    <div style={{ display: "flex", gap: 8, overflowX: "auto" }} className="no-scrollbar">{[0, 1, 2, 3, 4].map((i) => <Thumb key={i} seed={i + 1} w={92} h={68} video={i % 2 === 0} />)}</div>
    <SectionH>Alerts in this flight</SectionH>
    <div className="group">{f.alerts.length ? f.alerts.map((a) => <div key={a} className="row"><Icon kind={ALERTS[a]?.level === "critical" ? "critical" : "warning"} size={16} /><span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block" }}>{ALERTS[a]?.title ?? a}</span><span className="t-cap muted">{ALERTS[a]?.message}</span></span></div>) : <div className="row"><Icon kind="pass" size={16} /><span className="t-label">None</span></div>}</div>
    <button className="btn btn-primary btn-block" data-hit style={{ marginTop: 16 }} onClick={() => up(go("hangar"))}>Done</button>
  </>} /></Page>;
}
const PAST = [
  { id: "m1", nickname: "Park drone", model: "DJI Mavic 4 Pro", place: "City Park", when: "Yesterday", time: "12:40", maxH: 64, photos: 38 },
  { id: "m2", nickname: "360 cam", model: "Antigravity A1", place: "Lakeside trail", when: "Sat", time: "08:12", maxH: 42, photos: 6 },
  { id: "m3", nickname: "Survey", model: "Autel EVO Max 4T", place: "Wedding venue", when: "12 Nov", time: "16:05", maxH: 55, photos: 112 },
];
export function Flights() {
  const { s } = useProto();
  const { W } = frameSize(s.platform, s.orient);
  const [sel, setSel] = useState("m1");
  if (s.platform === "laptop") return <FlightsDesk />;
  const rows = [
    ...s.flights.map((f, i) => ({ k: f.id, seed: i + 2, title: f.nickname, sub: `${f.model} · ${f.country}`, meta: `${Math.floor(f.seconds / 60)}:${String(f.seconds % 60).padStart(2, "0")} · max ${f.maxH} m · ${f.photos} photos`, today: true })),
    ...PAST.map((f, i) => ({ k: f.id, seed: i + 5, title: f.place, sub: `${f.nickname} · ${f.model}`, meta: `${f.when} · ${f.time} · max ${f.maxH} m · ${f.photos} photos`, today: false })),
  ];
  const wide = W >= 600; // regular width (inner Duo display, iPad): list + detail; compact: list only
  const pick = rows.find((r) => r.k === sel) ?? rows[0];
  const row = (r: typeof rows[number]) => <button key={r.k} className="row" data-hit onClick={() => setSel(r.k)} style={{ background: wide && pick?.k === r.k ? "var(--fh-blue-soft)" : undefined }}>
    <Thumb seed={r.seed} w={72} h={56} video />
    <div style={{ flex: 1, minWidth: 0 }}><div className="t-head">{r.title}</div><div className="t-cap muted">{r.sub}</div><div className="t-cap num" style={{ marginTop: 4 }}>{r.meta}</div></div>
    {!wide && <ChevronRight size={18} color="var(--grey-400)" />}</button>;
  const list = <>
    <div className="seg" style={{ marginBottom: 8 }}><button className="on">All</button><button>Videos</button><button>Photos</button></div>
    {rows.some((r) => r.today) && <><SectionH>Today</SectionH><div className="group">{rows.filter((r) => r.today).map(row)}</div></>}
    <SectionH>Earlier</SectionH><div className="group">{rows.filter((r) => !r.today).map(row)}</div>
  </>;
  const detail = pick && <div className="card" style={{ overflow: "hidden", position: "sticky", top: 0 }}>
    <div style={{ position: "relative", height: 200 }}><Thumb seed={pick.seed} w={1000} h={200} video /></div>
    <div style={{ padding: 16 }}><div className="t-title">{pick.title}</div><div className="t-cap muted">{pick.sub}</div><div className="t-body" style={{ marginTop: 8 }}>{pick.meta}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}><button className="btn">Play</button><button className="btn">Share</button></div></div>
  </div>;
  return <Page title="Flights" sub="Your flight log and media" full={wide}>
    {wide ? <Columns left={list} right={detail} /> : list}
  </Page>;
}
export function Rules() {
  const { s, up } = useProto(); const c = COUNTRIES[s.country]; const d = droneOf(s);
  const need = requiredDocs(c, d, s.resident);
  return <Page full title="Rules" sub="What applies where you fly">
    <Columns left={<>
      <CountryCard />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
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
      <div className="alert" style={{ marginTop: 16 }}><Icon kind="info" size={18} /><div className="t-cap">Concept information, not legal advice. Source: {c.source} · {c.verification}.</div></div>
    </>} />
  </Page>;
}
export function Settings() {
  const { s, up } = useProto();
  const Row = ({ icon, label, sub, right }: { icon: ReactNode; label: string; sub?: ReactNode; right?: ReactNode }) =>
    <div className="row"><span className="ico">{icon}</span><div style={{ flex: 1 }}><div className="t-label" style={{ fontWeight: 500, fontSize: 16 }}>{label}</div>{sub && <div className="t-cap muted">{sub}</div>}</div>{right ?? <ChevronRight size={18} color="var(--grey-400)" />}</div>;
  // Two halves on wide or open-Duo screens: account and controls | general and about.
  return <Page title="Settings"><Columns left={<>
    <button className="card" data-hit onClick={() => up(go("account"))} style={{ width: "100%", padding: 16, display: "flex", gap: 12, alignItems: "center", textAlign: "left" }}>
      <span style={{ width: 52, height: 52, borderRadius: 9999, background: s.account ? "var(--accent)" : "var(--grey-100)", color: s.account ? "var(--on-accent)" : "var(--grey-600)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 20 }}>{s.account ? s.account.name.split(" ").map((w) => w[0]).join("") : <Smartphone size={22} />}</span>
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
  </>} right={<>
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
      <Row icon={<Camera size={16} />} label="Photo credits" sub={<>{Object.entries(DRONE_PHOTO).map(([b, p]) => <span key={b} style={{ display: "block" }}>{BRANDS.find((x) => x.id === b)?.model}: {p!.author}, {p!.license}{p!.license.startsWith("CC") ? " (cropped)" : ""}, Wikimedia Commons</span>)}<span style={{ display: "block" }}>Autel EVO Max 4T: drawn render (no free photo found)</span><span style={{ display: "block" }}>Maps: © OpenStreetMap contributors, OpenFreeMap · Imagery © Esri</span></>} right={<span />} />
    </div>
  </>} /></Page>;
}

// Desktop flight records (after FlightHub 2 "Flight Records"): summary stats and a sortable-looking table.
function FlightsDesk() {
  const { s } = useProto();
  const rows = [
    ...s.flights.map((f, i) => ({ k: f.id, seed: i + 2, place: f.useCase === "Park" ? "City Park" : f.useCase, drone: f.nickname, model: f.model, when: "Today", time: `${Math.floor(f.seconds / 60)}:${String(f.seconds % 60).padStart(2, "0")}`, maxH: f.maxH, photos: f.photos, alerts: f.alerts.length, country: f.country })),
    ...PAST.map((f, i) => ({ k: f.id, seed: i + 5, place: f.place, drone: f.nickname, model: f.model, when: f.when, time: f.time, maxH: f.maxH, photos: f.photos, alerts: i === 1 ? 1 : 0, country: "United States" })),
  ];
  const th: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-2, #9a9a9a)", borderBottom: "1px solid var(--line-2, #2a2a2a)" };
  const td: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid #242424", fontSize: 14, verticalAlign: "middle" };
  return <Page title="Flight records" full sub="Every flight, its media and alerts" right={<button className="btn btn-sm">Export report <Mock /></button>}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
      {[["Flights", String(rows.length), ""], ["Flight time", "5.4", "h"], ["Distance", "43", "km"], ["Photos and videos", String(rows.reduce((a, r) => a + r.photos, 0)), ""]].map(([k, v, u]) => (
        <div key={k} className="card" style={{ padding: "16px 16px" }}><div className="t-cap muted">{k}</div><div className="num" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{v}<span className="t-cap muted"> {u}</span></div></div>))}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
      <div className="seg" style={{ width: 320 }}><button className="on">All</button><button>Videos</button><button>Photos</button></div>
      <div style={{ flex: 1 }} /><div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--fh-input)", border: "1px solid #2e2e2e", borderRadius: 8, padding: "0 12px", height: 36, width: 260 }}><Search size={14} color="#7c7c7c" /><span className="t-cap muted">Search place or drone</span></div>
    </div>
    <div className="card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={th}>Flight</th><th style={th}>Drone</th><th style={th}>Date</th><th style={th}>Duration</th><th style={th}>Max height</th><th style={th}>Media</th><th style={th}>Alerts</th><th style={th} /></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.k}>
          <td style={td}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><Thumb seed={r.seed} w={64} h={42} video /><div><div style={{ fontWeight: 600 }}>{r.place}</div><div className="t-cap muted">{r.country}</div></div></div></td>
          <td style={td}><div>{r.drone}</div><div className="t-cap muted">{r.model}</div></td>
          <td style={td}>{r.when}</td><td style={td} className="num">{r.time}</td><td style={td} className="num">{r.maxH} m</td><td style={td} className="num">{r.photos}</td>
          <td style={td}>{r.alerts ? <span className="chip dashed" style={{ minHeight: 22 }}><Icon kind="warning" size={11} />{r.alerts}</span> : <span className="t-cap" style={{ color: "var(--fh-green)" }}>None</span>}</td>
          <td style={{ ...td, textAlign: "right" }}><button className="btn btn-sm">Open</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </Page>;
}
