// Frames, safe areas and Fly-screen zone layouts (from 11 section 2 and 15 layout options).
// Sizes are provisional; safe-area insets and fold width are MOCK values.

export type Platform = "iphone" | "duoClosed" | "duoOpen" | "tablet" | "laptop";
export type Orientation = "portrait" | "landscape";

export interface Rect { x: number; y: number; w: number; h: number; }
export interface Insets { t: number; r: number; b: number; l: number; }

export const PLATFORM_LABEL: Record<Platform, string> = {
  iphone: "iPhone", duoClosed: "Duo closed", duoOpen: "Duo open", tablet: "Tablet", laptop: "Laptop",
};

// One standalone app per device: /iphone, /ipad, /duo (opens and closes), /laptop
export interface DeviceAppDef { slug: string; label: string; start: Platform; controls: ("rotate" | "fold")[]; }
export const DEVICE_APPS: DeviceAppDef[] = [
  { slug: "iphone", label: "iPhone", start: "iphone", controls: ["rotate"] },
  { slug: "ipad", label: "iPad", start: "tablet", controls: ["rotate"] },
  { slug: "duo", label: "iPhone Duo", start: "duoClosed", controls: ["fold", "rotate"] },
  { slug: "laptop", label: "Laptop", start: "laptop", controls: [] },
];
// Older addresses still work by sending you to the new one.
export const OLD_SLUGS: Record<string, string> = { tablet: "ipad", "duo-closed": "duo", "duo-open": "duo" };
export const appFromSlug = (slug: string) => DEVICE_APPS.find((a) => a.slug === slug);

const SIZES: Record<Platform, { portrait: [number, number]; landscape: [number, number] }> = {
  iphone: { portrait: [390, 844], landscape: [844, 390] },
  duoClosed: { portrait: [466, 678], landscape: [678, 466] },
  duoOpen: { portrait: [626, 890], landscape: [890, 626] },
  tablet: { portrait: [820, 1180], landscape: [1180, 820] },
  laptop: { portrait: [1440, 900], landscape: [1440, 900] },
};

export function frameSize(p: Platform, o: Orientation): { W: number; H: number } {
  const [W, H] = SIZES[p][p === "laptop" ? "landscape" : o];
  return { W, H };
}

export function safeArea(p: Platform, o: Orientation): Insets {
  if (p === "iphone") return o === "portrait" ? { t: 59, r: 0, b: 34, l: 0 } : { t: 0, r: 48, b: 20, l: 48 };
  if (p === "duoClosed" || p === "duoOpen") return { t: 8, r: 8, b: 8, l: 8 };
  if (p === "tablet") return { t: 24, r: 0, b: 20, l: 0 };
  return { t: 0, r: 0, b: 0, l: 0 };
}

export interface Reserved extends Rect { label: string; kind: "island" | "camera" | "fold"; }
// iPhone Duo (Apple HIG "Designing for iPhone Duo", 9 Sep 2026; see 19-iphone-duo-compliance.md):
// controls move to the side on the outer display (any orientation) and on the inner display in landscape.
export const sideControls = (p: Platform, o: Orientation) => p === "duoClosed" || (p === "duoOpen" && o === "landscape");
// Width of the vertical system column (outer camera / Dynamic Island + status bar) on Duo side layouts.
export const DUO_SYS_W = 48;

export function reservedRegions(p: Platform, o: Orientation, half = false): Reserved[] {
  const { W, H } = frameSize(p, o);
  if (p === "iphone") return o === "portrait"
    ? [{ x: W / 2 - 63, y: 11, w: 126, h: 37, label: "Dynamic Island", kind: "island" }]
    : [{ x: 11, y: H / 2 - 63, w: 37, h: 126, label: "Island", kind: "island" }];
  if (p === "duoClosed") return [{ x: W - 44, y: 8, w: 36, h: 36, label: "Outer camera", kind: "camera" }];
  // The folding region is reserved only when the device is partially folded (HIG: "conditional").
  if (p === "duoOpen" && !half) return [];
  if (p === "duoOpen") return o === "landscape"
    ? [{ x: 0, y: H / 2 - 12, w: W, h: 24, label: "Fold (mock 24 pt)", kind: "fold" }]
    : [{ x: W / 2 - 12, y: 0, w: 24, h: H, label: "Fold", kind: "fold" }];
  return [];
}

// Fly is landscape-only on Duo (closed and open) and laptop (decided in Step 11).
export function flyOrientation(p: Platform, o: Orientation): Orientation {
  return p === "iphone" || p === "tablet" ? o : "landscape";
}

// Command centre screens (Dashboard, Watch wall) are on laptop and iPad. The Fly cockpit layout is laptop and iPad landscape.
export const hasCommandCentre = (p: Platform) => p === "laptop" || p === "tablet";
export const isCockpit = (p: Platform, o: Orientation) => p === "laptop" || (p === "tablet" && o === "landscape");

export type ZoneKey = "status" | "alert" | "pause" | "return" | "land" | "map" | "telemetry" | "tray" | "slider" | "slider2"
  | "record" | "shutter" | "toggle" | "stickL" | "stickR" | "video" | "panel" | "panel2" | "panel3" | "keys" | "others";

export type FlyLayout = { kind: "rails" | "deck" | "split" | "side"; zones: Partial<Record<ZoneKey, Rect>>; };

function railsZones(W: number, H: number, s: Insets, x0 = 0, panelW = 0): Partial<Record<ZoneKey, Rect>> {
  const L = x0 + s.l + 16, R = W - panelW - s.r - 16, T = 8, B = H - s.b - 8;
  const z: Partial<Record<ZoneKey, Rect>> = {};
  z.status = { x: L - 8, y: T, w: R - L + 16, h: 44 };
  z.alert = { x: L + (R - L) / 2 - 150, y: T + 4, w: 300, h: 36 };
  z.pause = { x: L, y: T + 56, w: 72, h: 72 };
  z.return = { x: L + 8, y: T + 144, w: 56, h: 56 };
  z.land = { x: L + 8, y: T + 216, w: 56, h: 56 };
  z.map = W - panelW > 760 ? { x: L + 88, y: T + 56, w: 144, h: 80 } : { x: L + 88, y: T + 56, w: 120, h: 68 };
  z.record = { x: R - 60, y: T + 56, w: 56, h: 56 };
  z.shutter = { x: R - 64, y: T + 128, w: 64, h: 64 };
  z.toggle = { x: R - 54, y: T + 208, w: 44, h: 44 };
  z.slider = { x: R - 116, y: T + 56, w: 44, h: 160 };
  z.stickL = { x: L + 102, y: B - 140, w: 140, h: 140 };
  z.stickR = { x: R - 272, y: B - 140, w: 140, h: 140 };
  const trayX = z.stickL.x + 156, trayW = z.stickR.x - 16 - trayX;
  z.tray = { x: trayX, y: B - 48, w: trayW, h: 48 };
  z.telemetry = trayW >= 150 ? { x: trayX, y: B - 104, w: trayW, h: 40 } : { x: z.map.x, y: z.map.y + z.map.h + 8, w: z.map.w, h: 36 };
  const below = trayW >= 150 ? z.map.y + z.map.h : z.telemetry.y + z.telemetry.h;
  z.others = { x: z.map.x, y: below + 8, w: 236, h: 48 };
  return z;
}

export function flyLayout(p: Platform, o: Orientation, mirror: boolean, half = false): FlyLayout {
  const fo = flyOrientation(p, o);
  const { W: FW, H } = frameSize(p, fo);
  const s0 = safeArea(p, fo);
  const duo = p === "duoClosed" || p === "duoOpen";
  // Duo: keep the HUD clear of the side system column (camera, status). Immersive full width is allowed elsewhere.
  const s = duo ? { ...s0, r: s0.r + DUO_SYS_W } : s0;
  const W = FW;
  let out: FlyLayout;
  if (fo === "portrait") {
    const vTop = s.t + 48, vH = Math.round((W * 9) / 16), row = vTop + vH + 12, sy = row + 84, sticks = sy + 138;
    out = { kind: "deck", zones: {
      status: { x: 16, y: s.t, w: W - 32, h: 44 }, alert: { x: W / 2 - 110, y: s.t + 4, w: 220, h: 36 },
      video: { x: 0, y: vTop, w: W, h: vH }, map: { x: W - 96, y: vTop + 8, w: 88, h: 56 },
      telemetry: { x: 16, y: vTop + vH - 44, w: Math.min(260, W - 32), h: 36 },
      slider: { x: 16, y: row, w: 44, h: 160 }, slider2: { x: W - 60, y: row, w: 44, h: 160 },
      record: { x: W / 2 - 104, y: row + 4, w: 56, h: 56 }, shutter: { x: W / 2 - 32, y: row, w: 64, h: 64 }, toggle: { x: W / 2 + 48, y: row + 10, w: 44, h: 44 },
      pause: { x: W / 2 - 108, y: sy, w: 72, h: 72 }, return: { x: W / 2 - 20, y: sy + 8, w: 56, h: 56 }, land: { x: W / 2 + 52, y: sy + 8, w: 56, h: 56 },
      stickL: { x: W / 4 - 70, y: sticks, w: 140, h: 140 }, stickR: { x: (3 * W) / 4 - 70, y: sticks, w: 140, h: 140 },
      tray: { x: 16, y: sticks + 164, w: W - 32, h: 48 },
    } };
    const free = sticks + 164 + 48 + 16, room = H - s.b - 16 - free;
    out.zones.others = { x: 16, y: vTop + 8, w: 236, h: 48 };
    if (room >= 120) {
      const pw = (W - 48) / 2;
      out.zones.panel = { x: 16, y: free, w: pw, h: room }; out.zones.panel2 = { x: 32 + pw, y: free, w: pw, h: room };
    }
  } else if (p === "duoOpen" && half) {
    // Partially folded: overlay arrangement puts the live view and the controls on each side of the fold.
    const W = FW - DUO_SYS_W;
    const halfH = H / 2 - 12; const vH = halfH - 56, vW = Math.round((vH * 16) / 9);
    out = { kind: "split", zones: {
      status: { x: 16, y: 8, w: W - 32, h: 44 }, alert: { x: W / 2 - 130, y: 12, w: 260, h: 36 },
      video: { x: (W - vW) / 2, y: 56, w: vW, h: vH },
      pause: { x: 40, y: 64, w: 72, h: 72 }, return: { x: 48, y: 152, w: 56, h: 56 }, land: { x: 48, y: 224, w: 56, h: 56 },
      slider: { x: W - 170, y: 64, w: 44, h: 160 }, record: { x: W - 100, y: 64, w: 56, h: 56 }, shutter: { x: W - 104, y: 136, w: 64, h: 64 }, toggle: { x: W - 94, y: 216, w: 44, h: 44 },
      stickL: { x: 40, y: H / 2 + 67, w: 140, h: 140 }, stickR: { x: W - 180, y: H / 2 + 67, w: 140, h: 140 },
      map: { x: 200, y: H / 2 + 24, w: 230, h: 120 }, telemetry: { x: 446, y: H / 2 + 24, w: 244, h: 120 },
      tray: { x: 200, y: H / 2 + 156, w: 490, h: 48 }, panel: { x: 200, y: H / 2 + 216, w: 490, h: 80 },
    } };
  } else if (p === "tablet" || p === "laptop") {
    const panelW = 320;
    const z = railsZones(W, H, s, 0, panelW);
    z.panel = { x: W - panelW + 8, y: 8, w: panelW - 16, h: 220 };
    z.panel2 = { x: W - panelW + 8, y: 236, w: panelW - 16, h: 180 };
    z.panel3 = { x: W - panelW + 8, y: 424, w: panelW - 16, h: H - 432 - s.b };
    if (p === "laptop") { delete z.stickL; delete z.stickR; z.keys = { x: (W - panelW) / 2 - 220, y: H - 120, w: 440, h: 56 };
      z.tray = { x: (W - panelW) / 2 - 220, y: H - 56, w: 440, h: 48 }; z.telemetry = { x: (W - panelW) / 2 - 220, y: H - 176, w: 440, h: 40 }; }
    out = { kind: "side", zones: { ...z, video: { x: 0, y: 0, w: W - panelW, h: H } } };
  } else {
    out = { kind: "rails", zones: { ...railsZones(W, H, s), video: { x: 0, y: 0, w: W, h: H } } };
  }
  if (mirror) {
    for (const k of Object.keys(out.zones) as ZoneKey[]) {
      if (k === "status" || k === "alert" || k === "video") continue;
      const r = out.zones[k]!; out.zones[k] = { ...r, x: W - r.x - r.w };
    }
  }
  return out;
}

export const ZONE_LABEL: Partial<Record<ZoneKey, string>> = {
  status: "Z1", pause: "Z2", return: "Z2", land: "Z2", video: "Z3", record: "Z4", shutter: "Z4", toggle: "Z4", slider: "Z4",
  stickL: "Z5", map: "Z6", tray: "Z7", stickR: "Z8",
};
