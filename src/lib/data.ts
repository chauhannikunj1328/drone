// All data here is MOCK for the Skyhand concept wireframe (Artonest).
// Real figures used: Antigravity A1 249 g, country rules from 07 section 6 with their verification labels.

export type BrandId = "dji" | "antigravity" | "parrot" | "autel" | "skydio";
export type CountryCode = "US" | "UK" | "AE" | "AU" | "IN" | "CH" | "JP" | "LU";
export type Verification = "Checked Nov 2026" | "Partly checked" | "Not checked";
export type FlagLevel = "few" | "rules" | "cant";

export interface Drone {
  id: string;
  nickname: string;
  brand: BrandId;
  model: string;
  weightGrams: number;
  weightIsMock: boolean;
  hasCamera: boolean;
  battery: number;
  status: "Ready" | "Not ready" | "Offline" | "Limited";
  statusReason?: string;
  firmwareOk: boolean;
  monitorOnly: boolean; // Skydio X10 in this concept
  is360: boolean;
}

export const DRONES: Drone[] = [
  { id: "d1", nickname: "Park drone", brand: "dji", model: "DJI Mavic 4 Pro", weightGrams: 1000, weightIsMock: true, hasCamera: true, battery: 92, status: "Ready", firmwareOk: true, monitorOnly: false, is360: false },
  { id: "d2", nickname: "360 cam", brand: "antigravity", model: "Antigravity A1", weightGrams: 249, weightIsMock: false, hasCamera: true, battery: 18, status: "Not ready", statusReason: "battery", firmwareOk: true, monitorOnly: false, is360: true },
  { id: "d3", nickname: "Trail", brand: "parrot", model: "Parrot ANAFI Ai", weightGrams: 900, weightIsMock: true, hasCamera: true, battery: 74, status: "Offline", firmwareOk: false, monitorOnly: false, is360: false },
  { id: "d4", nickname: "Survey", brand: "autel", model: "Autel EVO Max 4T", weightGrams: 1600, weightIsMock: true, hasCamera: true, battery: 81, status: "Ready", firmwareOk: true, monitorOnly: false, is360: false },
  { id: "d5", nickname: "Team", brand: "skydio", model: "Skydio X10", weightGrams: 2100, weightIsMock: true, hasCamera: true, battery: 88, status: "Limited", statusReason: "monitor and mission-start only", firmwareOk: true, monitorOnly: true, is360: false },
];

export const BRANDS: { id: BrandId; name: string; model: string }[] = [
  { id: "dji", name: "DJI", model: "DJI Mavic 4 Pro" },
  { id: "antigravity", name: "Antigravity", model: "Antigravity A1" },
  { id: "parrot", name: "Parrot", model: "Parrot ANAFI Ai" },
  { id: "autel", name: "Autel", model: "Autel EVO Max 4T" },
  { id: "skydio", name: "Skydio", model: "Skydio X10" },
];

// ---------- Maker sign-in (16-app-start-and-accounts.md section 2) ----------
export const BRAND_ACCOUNT: Record<BrandId, { label: string; need: "required" | "optional" | "unknown"; why: string; verification: string }> = {
  dji: { label: "DJI account", need: "required", why: "DJI activates each aircraft with a DJI account and internet before its first flight.", verification: "Partly checked" },
  antigravity: { label: "Antigravity account", need: "required", why: "A1 is activated in the Antigravity app. Without it, flight is limited to 30 m height and 50 m range.", verification: "Checked (A1 manual)" },
  parrot: { label: "Parrot.Cloud", need: "optional", why: "Parrot recommends an account but you can fly without one. Anonymous sharing is the default.", verification: "Partly checked" },
  autel: { label: "Autel account", need: "unknown", why: "Autel's sign-in steps for the EVO Max 4T were not found.", verification: "Not checked" },
  skydio: { label: "Skydio Cloud", need: "required", why: "Skydio X10 is claimed in Skydio Cloud before flying.", verification: "Checked (Skydio support)" },
};

// ---------- Real drone photos (Wikimedia Commons, free licences; cropped and resized for the app) ----------
// Autel EVO Max 4T has no free-licence photo yet, so it keeps the drawn render.
export interface DronePhoto { cut: string; src: string; pos: string; author: string; license: string; source: string }
export const DRONE_PHOTO: Partial<Record<BrandId, DronePhoto>> = {
  dji: { cut: "/drones/cut-dji.png", src: "/drones/dji.jpg", pos: "62% 45%", author: "C.Stadler/Bwag", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:DJI_-_Drohne_Mavic_4_Pro.JPG" },
  antigravity: { cut: "/drones/cut-antigravity.png", src: "/drones/antigravity.jpg", pos: "50% 40%", author: "ZLEA", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Antigravity_DE001_A1_(1-17-2026).jpg" },
  parrot: { cut: "/drones/cut-parrot.png", src: "/drones/parrot.jpg", pos: "45% 45%", author: "ZLEA", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Parrot_PF728330_ANAFI_Ai_(FA3KP379LP)_(2-25-2024).jpg" },
  skydio: { cut: "/drones/cut-skydio.png", src: "/drones/skydio.jpg", pos: "52% 50%", author: "Alexander Kubitza", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:Skydio_X10_in_flight.jpg" },
};

// ---------- Skins (official names from 07 section 5) ----------
export interface Skin {
  brand: BrandId;
  appCopied: string;
  modeLabel: string;
  modes: { short: string; name: string }[];
  readOnlyMode?: string;
  record: string;
  shutter: string;
  toggle: string;
  slider: string;
  slider2?: string;
  left: "stick" | "flightSlider" | "none";
  right: "stick" | "throttle" | "none";
  stickName: string;
  tray: { name: string; sub?: string; disabled?: string }[];
  takeoffNote: string;
  extras: string[];
}

export const SKINS: Record<BrandId, Skin> = {
  dji: {
    brand: "dji", appCopied: "DJI Fly with DJI RC 2",
    modeLabel: "Flight Mode Switch", modes: [{ short: "C", name: "Cine" }, { short: "N", name: "Normal" }, { short: "S", name: "Sport" }],
    record: "Record", shutter: "Focus / Shutter", toggle: "Photo / Video", slider: "Gimbal Dial", slider2: "Camera Control Dial (zoom)",
    left: "stick", right: "stick", stickName: "Control Stick",
    tray: [{ name: "FocusTrack", sub: "Spotlight · Point of Interest · ActiveTrack" }, { name: "MasterShots" }, { name: "QuickShots" }, { name: "Hyperlapse" }, { name: "Waypoint Flight" }, { name: "C1" }, { name: "C2" }],
    takeoffNote: "DJI: Takeoff icon, then press and hold",
    extras: ["Vision window (obstacles)"],
  },
  antigravity: {
    brand: "antigravity", appCopied: "A1 Grip and Vision goggles HUD",
    modeLabel: "Flight Mode Toggle", modes: [{ short: "N", name: "Normal" }, { short: "S", name: "Sport" }, { short: "C", name: "Cine" }],
    record: "Record Button", shutter: "Shutter Button", toggle: "Hold to switch mode", slider: "360 Dial Button (drag video)",
    left: "flightSlider", right: "throttle", stickName: "Throttle Trigger",
    tray: [{ name: "Sky Genie", sub: "Orbit · Fly Away · Ascend · Spiral Ascent · Oval Orbit · Arc Shot · Antigravity Line · Arch out" }, { name: "Deep Track", sub: "Auto Mode · Circle Mode" }, { name: "Sky Path" }, { name: "C1" }, { name: "C2: Free Motion / FPV" }],
    takeoffNote: "A1: Flight Slider, two short pushes to unlock, then hold up",
    extras: ["Radar / Mini Map", "Virtual Cockpit (FPV)"],
  },
  parrot: {
    brand: "parrot", appCopied: "FreeFlight 7 with Skycontroller 4",
    modeLabel: "Speed mode", modes: [{ short: "F", name: "Film" }, { short: "S", name: "Sport" }],
    record: "Media recording", shutter: "Soft shutter", toggle: "Imaging mode", slider: "Gimbal tilt trigger", slider2: "Zoom trigger",
    left: "stick", right: "stick", stickName: "Control stick",
    tray: [{ name: "Missions" }, { name: "Touch & Fly", sub: "Waypoint · POI" }, { name: "Cameraman" }, { name: "Flight Plan" }, { name: "Optics reset" }],
    takeoffNote: "Parrot: Take-off / Landing button (hold added here)",
    extras: ["Obstacle shield", "Center drone / controller"],
  },
  autel: {
    brand: "autel", appCopied: "Autel Enterprise App",
    modeLabel: "Flight speed", modes: [{ short: "Sl", name: "Slow" }, { short: "Sm", name: "Smooth" }, { short: "St", name: "Standard" }, { short: "L", name: "Ludicrous" }],
    readOnlyMode: "GNSS (set by drone)",
    record: "Video Recording Button", shutter: "Photo Capture Button", toggle: "Lens: Wide · Zoom · IR · NV", slider: "Gimbal Pitch Control Dial", slider2: "Camera Zoom Control Dial",
    left: "stick", right: "stick", stickName: "Command Stick",
    tray: [{ name: "Waypoint" }, { name: "Polygon" }, { name: "Quick" }, { name: "Orbit" }, { name: "Tripod" }],
    takeoffNote: "Autel: Takeoff / RTH Button, hold 2 s",
    extras: ["Attitude ball: ATL · V/S · D · H/S"],
  },
  skydio: {
    brand: "skydio", appCopied: "Skydio Flight Deck",
    modeLabel: "Flight Skills", modes: [{ short: "Sk", name: "Skills" }, { short: "3D", name: "3D Scan" }],
    record: "Camera Mode", shutter: "Shutter", toggle: "View Selector", slider: "Zoom",
    left: "none", right: "none", stickName: "",
    tray: [{ name: "Orbit Point" }, { name: "Shadow Track and Follow" }, { name: "Waypoints" }, { name: "Track in Place" }, { name: "Manual", disabled: "Not available in this concept. The X10 is operated only through Skydio software." }],
    takeoffNote: "Skydio: Fly Now, then slide or hold to launch",
    extras: ["Navigation health", "Action Wheel (long press)"],
  },
};

// ---------- Countries (07 section 6, short concept copy) ----------
export interface Country {
  code: CountryCode;
  name: string;
  level: FlagLevel;
  verification: Verification;
  source: string;
  maxAltitude: number;
  rules: string[];
  redForVisitors?: string[];
  approvalPath?: boolean; // Japan: approval document clears red in this concept
  screenOnlyNeedsObserver: boolean;
  crowd: string;
}

export const COUNTRIES: Record<CountryCode, Country> = {
  US: { code: "US", name: "United States", level: "rules", verification: "Checked Nov 2026", source: "FAA, FCC", maxAltitude: 122, screenOnlyNeedsObserver: true,
    rules: ["TRUST certificate for recreational flying", "Registration and Remote ID at 250 g or more (weight only)", "Keep it in sight, or use an observer next to you", "Paid work counts as Part 107 commercial work"],
    crowd: "Flying over people who are not taking part needs Part 107 categories. Paid wedding work is Part 107." },
  UK: { code: "UK", name: "United Kingdom", level: "rules", verification: "Partly checked", source: "UK CAA", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["Flyer ID at 100 g or more", "Operator ID at 250 g or more, or 100 g or more with a camera", "Remote ID for UK1 to UK3 from 1 Jan 2026", "Observer needed for screen-only flying (partly checked)"],
    crowd: "Drones under 250 g may fly over people not taking part, but not over crowds." },
  AE: { code: "AE", name: "United Arab Emirates", level: "cant", verification: "Partly checked", source: "GCAA, news reports", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["All recreational drones registered, any weight", "Fly only in green zones shown in the official app", "Dubai status not checked (reported suspended)"],
    redForVisitors: ["News reports say visitors are not eligible to register.", "All recreational drones must be registered, any weight.", "Dubai recreational flying was reported suspended. Current status not checked."],
    crowd: "Strict privacy law. Do not film people without consent." },
  AU: { code: "AU", name: "Australia", level: "rules", verification: "Not checked", source: "CASA (pages did not load)", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["No registration for recreational flying under 250 g (not checked)", "Registration above 250 g (not checked)", "Keep it in sight with your own eyes (not checked)"],
    crowd: "Stay 30 m from people (not checked)." },
  IN: { code: "IN", name: "India", level: "cant", verification: "Partly checked", source: "PIB backgrounder", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["Nano up to 250 g, micro 250 g to 2 kg", "No pilot licence for nano or non-commercial micro", "Green zone up to 120 m without permission"],
    redForVisitors: ["Bringing a foreign-made drone into India may not be allowed (partly checked).", "Check import rules before you travel."],
    crowd: "Check zones on the airspace map." },
  CH: { code: "CH", name: "Switzerland", level: "rules", verification: "Checked Nov 2026", source: "BAZL", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["Registration for any drone with a camera, any weight (CHF 10)", "Remote ID on (C0 and legacy exempt)", "Observer beside you for screen-only flying"],
    crowd: "No flying over assemblies of people." },
  JP: { code: "JP", name: "Japan", level: "cant", verification: "Checked Nov 2026", source: "MLIT", maxAltitude: 150, screenOnlyNeedsObserver: true, approvalPath: true,
    rules: ["Registration and Remote ID at 100 g or more, no visitor exemption", "Screen-only flying needs MLIT approval", "Approval to fly over towns, events or above 150 m"],
    redForVisitors: ["Registration and Remote ID are needed at 100 g or more, with no visitor exemption.", "Flying by screen only counts as out of sight and needs MLIT approval. An observer does not replace it."],
    crowd: "Flying over events needs approval. Keep 30 m from people." },
  LU: { code: "LU", name: "Luxembourg", level: "rules", verification: "Checked Nov 2026", source: "DAC", maxAltitude: 120, screenOnlyNeedsObserver: true,
    rules: ["Registration above 250 g, or below 250 g with a camera", "Observer beside you for screen-only flying", "Remote ID not checked"],
    crowd: "No flying over gatherings." },
};

export const FLAG_WORD: Record<FlagLevel, string> = { few: "Few limits", rules: "Rules apply", cant: "Can't fly here" };

// Documents a pilot needs for this drone in this country (concept rules, see 10 F8)
export function requiredDocs(c: Country, d: Drone, resident: boolean): string[] {
  const g = d.weightGrams;
  switch (c.code) {
    case "US": return g >= 250 ? ["TRUST certificate", "FAA registration", "Remote ID"] : ["TRUST certificate"];
    case "UK": return [...(g >= 100 ? ["Flyer ID"] : []), ...(g >= 250 || (g >= 100 && d.hasCamera) ? ["Operator ID"] : [])];
    case "CH": return d.hasCamera || g >= 250 ? ["Operator registration"] : [];
    case "LU": return g > 250 || d.hasCamera ? ["Operator registration"] : [];
    case "JP": return g >= 100 ? ["Registration", "Remote ID", "MLIT approval"] : ["MLIT approval"];
    case "AE": return resident ? ["GCAA registration", "Training certificate"] : [];
    case "IN": return g > 250 ? ["UIN registration"] : [];
    case "AU": return g > 250 ? ["Registration (not checked)"] : [];
  }
}

// ---------- Alert copy (13 section 7) ----------
export type Level = "info" | "warning" | "critical";
export interface AlertDef { id: string; level: Level; title: string; message: string; button: string; }
export const ALERTS: Record<string, AlertDef> = {
  A1: { id: "A1", level: "critical", title: "Link lost", message: "The drone is following its own link-loss plan.", button: "Try again" },
  A2: { id: "A2", level: "warning", title: "Weak signal", message: "Move closer or lower your distance to keep the video steady.", button: "Show signal" },
  A3: { id: "A3", level: "warning", title: "Battery low", message: "Return now to land safely with some battery left.", button: "Return now" },
  A4: { id: "A4", level: "critical", title: "Battery critical", message: "The drone is landing or returning on its own.", button: "Land now" },
  A5: { id: "A5", level: "info", title: "Returning", message: "The drone is on its way back.", button: "Cancel return" },
  A7: { id: "A7", level: "warning", title: "Obstacle ahead", message: "The drone is braking. Fly away from it.", button: "Got it" },
  A10: { id: "A10", level: "warning", title: "Height limit reached", message: "The limit here is {n} m.", button: "Descend" },
  A18: { id: "A18", level: "warning", title: "Observer left", message: "Confirm that you can still see the drone.", button: "I can see it" },
  A19: { id: "A19", level: "critical", title: "Controls locked", message: "The phone is moving. Only Pause and Return work.", button: "Pause" },
  A20: { id: "A20", level: "critical", title: "Passenger only", message: "Controls are off while you are driving.", button: "OK" },
  A23: { id: "A23", level: "info", title: "Paused", message: "The smart mode is paused.", button: "Resume" },
};
export const ALERT_PRIORITY = ["A1", "A4", "A19", "A20", "A3", "A2", "A18", "A10", "A7", "A5", "A23"];
