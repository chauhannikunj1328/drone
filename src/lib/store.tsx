"use client";
// Prototype state and flight simulation. Everything here is MOCK behaviour for the concept.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ALERTS, ALERT_PRIORITY, COUNTRIES, DRONES, SKINS, requiredDocs, type AlertDef, type BrandId, type CountryCode, type Drone } from "./data";
import type { Orientation, Platform } from "./layout";

export type Screen =
  | "hangar" | "add-brand" | "add-model" | "capability" | "pf-country" | "pf-usecase" | "pf-redflag" | "pf-crowd"
  | "pf-checklist" | "pf-sight" | "pf-observer" | "fly" | "summary" | "flights" | "rules" | "settings"
  | "welcome" | "ob-safety" | "ob-perms" | "ob-country" | "ob-you" | "ob-drone" | "account"
  | "dashboard" | "watch";

export type Perm = "unknown" | "allowed" | "denied";
export interface Account { name: string; email: string; method: "Apple" | "Email"; }

export type Phase = "grounded" | "takeoff" | "flying" | "paused" | "returning" | "landing";
export type UseCase = "Park" | "Wedding" | "Hike" | "Travel" | "Car";

export interface DroneSim {
  phase: Phase; height: number; distance: number; hSpeed: number; vSpeed: number; heading: number; view: number;
  smartMode?: string; smartPaused: boolean; returnTarget?: string; startedAt?: number; maxH: number; maxD: number;
  photos: number; recording: boolean; videoMode: boolean; mode: number; gimbal: number; zoom: number; alertsSeen: string[];
}
export interface FlightRecord { id: string; droneId: string; nickname: string; model: string; country: string; useCase: UseCase; seconds: number; maxH: number; maxD: number; photos: number; alerts: string[]; }

export type Look = "v1" | "v2" | "v3";
export const LOOKS: [Look, string, string][] = [["v1", "V1 Light", "SwiftUI style: light grey canvas, white cards, black selection, indigo accent"], ["v2", "V2 Dark", "The same system in iOS dark mode"], ["v3", "V3 Map", "Every screen floats on a muted city map, glass cards, graphite accent"]];
export interface Overlays { zones: boolean; safe: boolean; reserved: boolean; hit: boolean; mock: boolean; }

export interface Proto {
  platform: Platform; orient: Orientation; droneId: string; country: CountryCode; mirror: boolean; skin: BrandId | "auto"; overlays: Overlays;
  screen: Screen; returnSheet: boolean; handoverTo?: string; fullMap: boolean; traySheet: boolean; toast?: string; addBrand?: BrandId;
  useCase: UseCase; resident: boolean; docs: string[]; sight: "unknown" | "yes" | "observer"; crowdAck: boolean;
  observer: "none" | "invited" | "joined" | "left"; observerSight: boolean; observerLeftAck: boolean; armStop: boolean;
  link: "strong" | "weak" | "lost"; linkLostFor: number; moving: boolean; driving: boolean; obstacle: boolean;
  drones: Drone[]; sims: Record<string, DroneSim>; countdown?: number; countdownDone: boolean; dismissed: string[];
  flights: FlightRecord[]; lastFlight?: string; dronePicker?: boolean;
  // App start and accounts (16-app-start-and-accounts.md)
  onboarded: boolean; obAdding: boolean; experience: "beginner" | "experienced";
  perms: { location: Perm; nearby: Perm; notify: Perm }; permAsk?: "location" | "nearby" | "notify";
  account?: Account; signInSheet?: boolean; brandAccounts: BrandId[]; deleteConfirm?: boolean;
  // Command centre (17-flighthub2-analysis.md): watch wall layout, OSD, fit/fill, cockpit leave confirm
  // iPhone Duo pose: halfFold = partially folded like a book (fold region reserved). Closed/open = platform duoClosed/duoOpen.
  halfFold: boolean;
  // Creative design versions (creative-design branch only): v1 Frost, v2 Mission, v3 Frost + Mission flight.
  look: Look;
  watchGrid: 1 | 4; watchFocus?: string; osd: boolean; fill: boolean; leaveCockpit?: boolean; fastMode: boolean;
}

const blankSim = (): DroneSim => ({ phase: "grounded", height: 0, distance: 0, hSpeed: 0, vSpeed: 0, heading: 0, view: 0, smartPaused: false,
  maxH: 0, maxD: 0, photos: 0, recording: false, videoMode: false, mode: 1, gimbal: 0, zoom: 1, alertsSeen: [] });

// Each drone starts in its brand's everyday mode ("Normal" where it exists), not by list position.
export const defaultMode = (b: BrandId) => { const i = SKINS[b].modes.findIndex((m) => m.name === "Normal" || m.name === "Standard" || m.name === "Film" || m.name === "Skills"); return i < 0 ? 0 : i; };

export function initialState(): Proto {
  const sims: Record<string, DroneSim> = {};
  for (const d of DRONES) sims[d.id] = { ...blankSim(), mode: defaultMode(d.brand) };
  // Seed: the Skydio X10 is already on a mission (monitor and mission-start only), so the monitor strip has something to show.
  sims.d5 = { ...blankSim(), mode: defaultMode("skydio"), phase: "flying", height: 38, distance: 60, smartMode: "Orbit Point", startedAt: Date.now() };
  return {
    platform: "iphone", orient: "landscape", droneId: "d1", country: "US", mirror: false, skin: "auto",
    overlays: { zones: false, safe: false, reserved: false, hit: false, mock: true },
    screen: "welcome", returnSheet: false,
    onboarded: false, obAdding: false, halfFold: false, look: "v1", watchGrid: 4, osd: true, fill: true, fastMode: false, experience: "beginner", perms: { location: "unknown", nearby: "unknown", notify: "unknown" }, brandAccounts: [], fullMap: false, traySheet: false,
    useCase: "Park", resident: false, docs: [], sight: "unknown", crowdAck: false,
    observer: "none", observerSight: false, observerLeftAck: false, armStop: false,
    link: "strong", linkLostFor: 0, moving: false, driving: false, obstacle: false,
    drones: DRONES.map((d) => ({ ...d })), sims, countdownDone: false, dismissed: [], flights: [],
  };
}

// ---------- Derived helpers ----------
export const droneOf = (s: Proto, id = s.droneId) => s.drones.find((d) => d.id === id)!;
export const skinOf = (s: Proto) => SKINS[s.skin === "auto" ? droneOf(s).brand : s.skin];
export const inAir = (p: Phase) => p !== "grounded";

export function activeAlerts(s: Proto): AlertDef[] {
  const sim = s.sims[s.droneId];
  const c = COUNTRIES[s.country];
  const ids: string[] = [];
  const d = droneOf(s);
  if (s.driving) ids.push("A20");
  if (inAir(sim.phase)) {
    if (s.link === "lost") ids.push("A1");
    if (s.link === "weak") ids.push("A2");
    if (d.battery <= 10) ids.push("A4"); else if (d.battery <= 25) ids.push("A3");
    if (s.moving) ids.push("A19");
    if (sim.phase === "returning") ids.push("A5");
    if (s.observer === "left" && !s.observerLeftAck) ids.push("A18");
    if (sim.height >= c.maxAltitude - 0.5) ids.push("A10");
    if (s.obstacle) ids.push("A7");
    if (sim.smartMode && sim.smartPaused) ids.push("A23");
  }
  return ALERT_PRIORITY.filter((i) => ids.includes(i) && !s.dismissed.includes(i)).map((i) => {
    const a = ALERTS[i];
    if (i === "A10") return { ...a, message: a.message.replace("{n}", String(c.maxAltitude)) };
    if (i === "A3" && s.countdown !== undefined && !s.countdownDone) return { ...a, message: `Returning to Launch point in ${Math.ceil(s.countdown)} s. ${a.message}` };
    return a;
  });
}

export interface CheckItem { n: number; label: string; state: "pass" | "warn" | "block" | "pending"; text: string; action?: { label: string; run: (d: Proto) => void }; }

export function checklist(s: Proto): CheckItem[] {
  const c = COUNTRIES[s.country]; const d = droneOf(s);
  const need = requiredDocs(c, d, s.resident);
  const missing = need.filter((x) => !s.docs.includes(x));
  const items: CheckItem[] = [
    { n: 1, label: "Country", state: "pass", text: `Flying in ${c.name}` },
    missing.length
      ? { n: 2, label: "Registration or ID", state: "block", text: `Add: ${missing.join(", ")}`, action: { label: `Add ${missing[0]} (mock)`, run: (p) => { p.docs.push(missing[0]); } } }
      : { n: 2, label: "Registration or ID", state: "pass", text: need.length ? `Added: ${need.join(", ")}` : "No ID needed for this drone here" },
    { n: 3, label: "Remote ID", state: need.includes("Remote ID") ? (s.docs.includes("Remote ID") ? "pass" : "block") : "pass", text: need.includes("Remote ID") ? (s.docs.includes("Remote ID") ? "Remote ID on" : "Turn on Remote ID") : "Follows this country's class rules" },
    { n: 4, label: "Airspace", state: "pass", text: "No closed areas nearby (mock map)" },
    { n: 5, label: "Weather and wind", state: "pass", text: "Wind is OK (mock)" },
    d.battery < 30
      ? { n: 6, label: "Battery", state: "block", text: `Battery too low to fly (${Math.round(d.battery)}%)`, action: { label: "Swap battery (mock)", run: (p) => { const x = droneOf(p); x.battery = 100; x.status = x.monitorOnly ? "Limited" : "Ready"; x.statusReason = x.monitorOnly ? x.statusReason : undefined; } } }
      : { n: 6, label: "Battery", state: "pass", text: `Battery is ${Math.round(d.battery)}%` },
    { n: 7, label: "Storage", state: "pass", text: "Space for 48 minutes of video (mock)" },
    d.firmwareOk ? { n: 8, label: "Update", state: "pass", text: "Up to date" }
      : { n: 8, label: "Update", state: "block", text: "Update needed", action: { label: "Update (mock)", run: (p) => { droneOf(p).firmwareOk = true; } } },
    { n: 9, label: "Keep it in sight", state: s.sight === "unknown" ? "pending" : "pass", text: s.sight === "yes" ? "You can see the drone" : s.sight === "observer" ? "Observer watching" : "Answered on the next step" },
    s.useCase === "Wedding"
      ? { n: 10, label: "People nearby", state: s.crowdAck ? "pass" : "warn", text: s.crowdAck ? "Crowd rule read" : "Read the crowd rule" }
      : { n: 10, label: "People nearby", state: "pass", text: "Not near a crowd" },
    { n: 11, label: "If the link drops", state: "pass", text: "The drone will return to Home" },
  ];
  return items;
}

export const isRedFor = (s: Proto) => {
  const c = COUNTRIES[s.country];
  if (c.level !== "cant") return false;
  if (s.resident && (c.code === "AE" || c.code === "IN")) return false;
  if (c.approvalPath && s.docs.includes("MLIT approval")) return false;
  return true;
};

// ---------- Context ----------
interface Ctx { s: Proto; up: (f: (d: Proto) => void) => void; input: React.MutableRefObject<Input>; reset: () => void; }
export interface Input { lx: number; ly: number; rx: number; ry: number; throttle: boolean; slider: number; }
const C = createContext<Ctx | null>(null);
export const useProto = () => useContext(C)!;
// High-fidelity colour theme (after DJI FlightHub 2). On the standard-design branch every device uses it
// (desktop since 2026-11-16, iPhone, iPad and Duo since 2026-11-16 later). Return false to get the greyscale wireframe back.
export const HIFI = true;
export const useDesk = () => { useContext(C); return HIFI; };

const KEYS_IN_URL: (keyof Proto)[] = ["platform", "orient", "droneId", "country", "mirror", "skin", "look"];

export function ProtoProvider({ children, lockPlatform }: { children: ReactNode; lockPlatform?: Platform }) {
  // lockPlatform: a per-device page (e.g. /tablet) keeps its own state and cannot switch device.
  const [s, setS] = useState<Proto>(() => ({ ...initialState(), ...(lockPlatform ? { platform: lockPlatform, orient: lockPlatform === "laptop" ? "landscape" as const : "portrait" as const } : {}) }));
  const input = useRef<Input>({ lx: 0, ly: 0, rx: 0, ry: 0, throttle: false, slider: 0 });
  const up = useCallback((f: (d: Proto) => void) => setS((prev) => { const d = structuredClone(prev); f(d); return d; }), []);
  const reset = useCallback(() => setS((prev) => ({ ...initialState(), platform: prev.platform, orient: prev.orient, country: prev.country, overlays: prev.overlays, mirror: prev.mirror, look: prev.look })), []);

  // read config from URL once
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    up((d) => {
      const rec = d as unknown as Record<string, unknown>;
      const scr = q.get("screen"); if (scr) { rec.screen = scr; rec.onboarded = true; }
      for (const k of KEYS_IN_URL) { if (lockPlatform && k === "platform") continue; const v = q.get(k); if (v !== null) rec[k] = v === "true" ? true : v === "false" ? false : v; }
    });
  }, [up, lockPlatform]);
  // write config to URL
  useEffect(() => {
    const q = new URLSearchParams();
    for (const k of KEYS_IN_URL) if (!(lockPlatform && k === "platform")) q.set(k, String(s[k]));
    window.history.replaceState(null, "", `?${q.toString()}`);
  }, [s.platform, s.orient, s.droneId, s.country, s.mirror, s.skin, s.look]); // eslint-disable-line react-hooks/exhaustive-deps

  // toasts close by themselves after 4 s
  useEffect(() => { if (!s.toast) return; const t = setTimeout(() => up((d) => { d.toast = undefined; }), 4000); return () => clearTimeout(t); }, [s.toast, up]);

  // simulation tick
  useEffect(() => {
    const dt = 0.25;
    const t = setInterval(() => up((d) => tick(d, input.current, dt)), dt * 1000);
    return () => clearInterval(t);
  }, [up]);

  const v = useMemo(() => ({ s, up, input, reset }), [s, up, reset]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

const SPEEDS = [6, 12, 18, 24];

function finishFlight(d: Proto, id: string) {
  const sim = d.sims[id]; const dr = droneOf(d, id);
  const rec: FlightRecord = { id: `f${d.flights.length + 1}`, droneId: id, nickname: dr.nickname, model: dr.model, country: COUNTRIES[d.country].name, useCase: d.useCase,
    seconds: Math.round((Date.now() - (sim.startedAt ?? Date.now())) / 1000), maxH: Math.round(sim.maxH), maxD: Math.round(sim.maxD), photos: sim.photos, alerts: sim.alertsSeen };
  d.flights.unshift(rec);
  d.sims[id] = { ...blankSim(), mode: sim.mode };
  if (id === d.droneId) { d.lastFlight = rec.id; d.screen = "summary"; d.returnSheet = false; d.countdown = undefined; d.countdownDone = false; d.sight = "unknown"; d.crowdAck = false; d.dismissed = []; }
}

export function startReturn(d: Proto, target: string, id = d.droneId) {
  const sim = d.sims[id];
  if (!inAir(sim.phase)) return;
  sim.phase = "returning"; sim.returnTarget = target; sim.smartMode = undefined; d.returnSheet = false;
}

function tick(d: Proto, inp: Input, dt: number) {
  const c = COUNTRIES[d.country];
  for (const dr of d.drones) {
    const sim = d.sims[dr.id];
    if (!inAir(sim.phase)) continue;
    const controlled = dr.id === d.droneId;
    dr.battery = Math.max(0, dr.battery - 0.09);
    const locked = d.moving || d.driving;
    if (sim.phase === "takeoff") { sim.height += 0.4; if (sim.height >= 1.2) { sim.height = 1.2; sim.phase = "flying"; } }
    else if (sim.phase === "flying") {
      if (controlled && !locked && d.link !== "lost") {
        const skin = SKINS[dr.brand];
        const climb = skin.left === "flightSlider" ? inp.slider : skin.left === "stick" ? -inp.ly : 0;
        sim.vSpeed = climb * 4;
        sim.heading = (sim.heading + inp.lx * 40 * dt + 360) % 360;
        const fwd = skin.right === "throttle" ? (inp.throttle ? 1 : 0) : skin.right === "stick" ? Math.max(0, -inp.ry) + Math.abs(inp.rx) * 0.5 : 0;
        sim.hSpeed = fwd * SPEEDS[Math.min(sim.mode, SPEEDS.length - 1)] * (dr.brand === "dji" && sim.mode === 0 ? 0.5 : 1);
        if (inp.ry > 0.2 && skin.right === "stick") { sim.distance = Math.max(0, sim.distance - inp.ry * 6 * dt); }
      } else if (!controlled || locked) { sim.vSpeed = 0; sim.hSpeed = 0; }
      if (sim.smartMode && !sim.smartPaused) { sim.hSpeed = 4; sim.heading = (sim.heading + 8 * dt) % 360; if (sim.distance < 40) sim.distance += 4 * dt; }
      sim.height = Math.min(c.maxAltitude, Math.max(2, sim.height + sim.vSpeed * dt));
      if (!sim.smartMode || sim.smartPaused) sim.distance += sim.hSpeed * dt * (controlled && inp.ry > 0.2 ? 0 : 1);
      if (d.obstacle && controlled) { sim.hSpeed = 0; }
    } else if (sim.phase === "paused") { sim.hSpeed = 0; sim.vSpeed = 0; }
    else if (sim.phase === "returning") {
      sim.hSpeed = 10; sim.distance = Math.max(0, sim.distance - 10 * dt);
      sim.height += Math.sign(30 - sim.height) * Math.min(Math.abs(30 - sim.height), 3 * dt);
      if (sim.distance <= 0.5) sim.phase = "landing";
    } else if (sim.phase === "landing") {
      sim.hSpeed = 0; sim.vSpeed = -2; sim.height = Math.max(0, sim.height - 3 * dt);
      if (sim.height <= 0) { finishFlight(d, dr.id); continue; }
    }
    sim.maxH = Math.max(sim.maxH, sim.height); sim.maxD = Math.max(sim.maxD, sim.distance);

    if (controlled) {
      // link loss: the drone follows its own plan after 3 s
      if (d.link === "lost") { d.linkLostFor += dt; if (d.linkLostFor > 3 && (sim.phase === "flying" || sim.phase === "paused")) startReturn(d, "Home", dr.id); }
      else d.linkLostFor = 0;
      // battery
      if (dr.battery <= 10 && sim.phase !== "landing") { sim.phase = "landing"; d.returnSheet = false; }
      else if (dr.battery <= 25 && !d.countdownDone && (sim.phase === "flying" || sim.phase === "paused")) {
        d.countdown = (d.countdown ?? 10) - dt;
        if (d.countdown <= 0) { d.countdownDone = true; startReturn(d, "Launch point", dr.id); }
      }
      for (const a of activeAlerts(d)) if (!sim.alertsSeen.includes(a.id)) sim.alertsSeen.push(a.id);
    } else if (dr.battery <= 15 && sim.phase !== "returning" && sim.phase !== "landing") {
      startReturn(d, "Home", dr.id); // monitored drones return on their own when low (mock)
    }
  }
  // clear dismissals whose condition ended
  const live = new Set(activeAlertsRaw(d));
  d.dismissed = d.dismissed.filter((x) => live.has(x));
}

function activeAlertsRaw(d: Proto): string[] {
  const keep = d.dismissed; d.dismissed = [];
  const ids = activeAlerts(d).map((a) => a.id);
  d.dismissed = keep;
  return ids;
}

export function alertAction(d: Proto, id: string) {
  const sim = d.sims[d.droneId];
  switch (id) {
    case "A1": d.link = "strong"; break;
    case "A3": d.countdownDone = true; startReturn(d, "Launch point"); break;
    case "A4": sim.phase = "landing"; break;
    case "A5": if (sim.phase === "returning") { sim.phase = "flying"; sim.returnTarget = undefined; } break;
    case "A7": d.obstacle = false; break;
    case "A10": sim.height = Math.max(2, sim.height - 10); break;
    case "A18": d.observerLeftAck = true; break;
    case "A19": if (sim.phase === "flying") sim.phase = "paused"; break;
    case "A23": sim.smartPaused = false; break;
    default: d.dismissed.push(id);
  }
}
