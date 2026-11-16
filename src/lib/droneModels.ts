// Original 3D drone models for Skyhand, built from code (three.js primitives). Not exact replicas:
// simplified shapes, proportions and colours that read as each maker's drone. No maker assets, photos or
// scans are used, so they are free to use. Dimensions are in centimetres, roughly to scale between drones.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BrandId } from "./data";

// Low-poly, flat-shaded builders. Y is up, the nose points to +Z, units are centimetres. Proportions follow each drone's public
// photos (thin flat arms with a motor on top and a foot bending down at the tip, camera housing on the nose), simplified to facets.
const FLAT = (c: number, rough = 0.75, metal = 0.08) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, flatShading: true });
type P = [number, number]; // [x, z] in the top view

function body(points: P[], h: number, color: number, y = 0, bevel = 0.5) {
  const sh = new THREE.Shape();
  points.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, -(h - bevel * 2) / 2, 0);
  const m = new THREE.Mesh(geo, FLAT(color)); m.position.y = y; return m;
}
function box(w: number, h: number, l: number, color: number, x = 0, y = 0, z = 0, rough = 0.75, metal = 0.08) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), FLAT(color, rough, metal)); m.position.set(x, y, z); return m;
}
function cyl(r: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 8, metal = 0.2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, seg), FLAT(color, 0.5, metal)); m.position.set(x, y, z); return m;
}
function lens(r: number, x: number, y: number, z: number, ring = 0x55595f) {
  const g = new THREE.Group();
  const housing = cyl(r * 1.25, r * 0.5, ring, 0, 0, 0, 8, 0.4); housing.rotation.x = Math.PI / 2; g.add(housing);
  const glass = cyl(r * 0.8, r * 0.7, 0x07080a, 0, 0, r * 0.12, 8, 0.7); glass.rotation.x = Math.PI / 2; g.add(glass);
  g.position.set(x, y, z); return g;
}
/** Flat arm bar from a to b, with a foot bending down at the tip. */
function arm(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, color: number, foot: number, round = false) {
  const g = new THREE.Group(); const len = a.distanceTo(b);
  const bar = round ? new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2.2, len, 7), FLAT(color)) : new THREE.Mesh(new THREE.BoxGeometry(w, h, len), FLAT(color));
  bar.position.copy(a.clone().add(b).multiplyScalar(0.5));
  const dir = b.clone().sub(a).normalize();
  bar.quaternion.setFromUnitVectors(round ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1), dir);
  g.add(bar);
  if (foot > 0) { const f = box(w * 0.85, foot, w * 0.7, color, b.x, b.y - foot / 2 + h * 0.2, b.z); f.rotation.z = (b.x > 0 ? -1 : 1) * 0.12; g.add(f); }
  return g;
}
function blades(R: number, color: number, tip?: number, n = 2) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const bl = new THREE.Group();
    const sh = new THREE.Shape(); sh.moveTo(0, -R * 0.07); sh.lineTo(R, -R * 0.045); sh.lineTo(R * 1.0, R * 0.05); sh.lineTo(0, R * 0.08); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
    bl.add(new THREE.Mesh(geo, FLAT(color, 0.6, 0)));
    if (tip !== undefined) { const t = box(R * 0.14, 0.14, R * 0.13, tip, R * 0.93, 0.06, 0); bl.add(t); }
    bl.rotation.y = (i / n) * Math.PI * 2; g.add(bl);
  }
  return g;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface ArmSet { front: [number, number, number, number, number, number]; rear: [number, number, number, number, number, number]; w: number; h: number; color: number; foot: number; round?: boolean;
  motorR: number; motorH: number; motorColor: number; capColor: number; R: number; bladeColor: number; tip?: number; accent?: number }
function addArms(g: THREE.Group, props: THREE.Object3D[], k: ArmSet) {
  ([[1, k.front, 1], [-1, k.front, 1], [1, k.rear, -1], [-1, k.rear, -1]] as [number, ArmSet["front"], number][]).forEach(([sx, f]) => {
    const a = V(sx * f[0], f[1], f[2]), b = V(sx * f[3], f[4], f[5]);
    g.add(arm(a, b, k.w, k.h, k.color, k.foot, k.round));
    g.add(cyl(k.motorR, k.motorH, k.motorColor, b.x, b.y + k.motorH * 0.5 + k.h * 0.4, b.z, 8, 0.3));
    g.add(cyl(k.motorR * 0.7, 0.5, k.capColor, b.x, b.y + k.motorH + k.h * 0.4 + 0.25, b.z, 8, 0.3));
    if (k.accent !== undefined) g.add(cyl(k.motorR * 1.1, 0.35, k.accent, b.x, b.y + k.h * 0.4 + 0.5, b.z, 8, 0.2));
    const pr = blades(k.R, k.bladeColor, k.tip); pr.position.set(b.x, b.y + k.motorH + k.h * 0.4 + 0.6, b.z); pr.rotation.y = (sx * f[2] > 0 ? 0.6 : -0.6);
    g.add(pr); props.push(pr);
  });
}

const BUILDERS: Record<BrandId, (g: THREE.Group, props: THREE.Object3D[]) => void> = {
  // DJI Mavic 4 Pro: grey flat body, big round camera housing on the nose, thin arms with a foot bending down, battery under the rear.
  dji(g, props) {
    g.add(body([[-3.2, -11], [3.2, -11], [4.2, -3], [3.7, 6], [2.3, 10], [-2.3, 10], [-3.7, 6], [-4.2, -3]], 5.2, 0x7d8288));
    g.add(box(7, 3, 9.5, 0x555a60, 0, -4, -3.5));
    const hs = new THREE.Group();
    const ring = cyl(4.6, 2.6, 0x6d7278, 0, 0, 0, 10, 0.3); ring.rotation.x = Math.PI / 2; hs.add(ring);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.7, 9, 6), FLAT(0x1f2125, 0.4, 0.3)); dome.position.z = 1.2; hs.add(dome);
    hs.add(lens(1.5, 1.1, 0.9, 4.2, 0x3a3d42)); hs.add(lens(0.9, -1.3, 0.3, 4.2, 0x3a3d42)); hs.add(lens(0.9, -1.3, -1.5, 4.0, 0x3a3d42));
    hs.position.set(0.8, 0.2, 11.4); g.add(hs);
    g.add(box(1.8, 1.2, 1.2, 0x16171a, -3, -0.4, 10.6), box(1.8, 1.2, 1.2, 0x16171a, 3.4, -0.4, 10.4));
    addArms(g, props, { front: [3.6, 0.6, 6, 17.5, 0.9, 9.5], rear: [3.9, 0.6, -6, 17.5, 0.9, -9.5], w: 1.5, h: 1.0, color: 0x858a90, foot: 3.6,
      motorR: 1.5, motorH: 2.2, motorColor: 0x1b1c1f, capColor: 0x2d2f33, R: 12, bladeColor: 0x16171a });
  },
  // Antigravity A1: white body, chin lens pod under the nose, black dome on top, tubular white arms, black props with grey tips.
  antigravity(g, props) {
    g.add(body([[-3.6, -7], [3.6, -7], [4.1, 0], [3.5, 5], [2.5, 7.5], [-2.5, 7.5], [-3.5, 5], [-4.1, 0]], 5.6, 0xf1f2f2));
    g.add(box(5.4, 4.2, 4.8, 0xe9eaea, 0, -3.6, 5.2));
    g.add(lens(1.2, 0, -4.2, 7.9, 0xcfd1d3));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 8, 5), FLAT(0x15161a, 0.3, 0.4)); dome.position.set(0, 3.6, 4.6); dome.scale.y = 0.8; g.add(dome);
    g.add(lens(1.0, 0, 2.5, 6.6, 0x2a2b2f));
    g.add(box(2.6, 0.5, 5, 0x1b1c1f, 0, 2.9, -2));
    addArms(g, props, { front: [3.3, 0.8, 3.5, 11.5, -0.6, 9], rear: [3.2, 0.8, -3, 11.8, 0.2, -8.5], w: 1.9, h: 1.9, color: 0xf4f5f5, foot: 0, round: true,
      motorR: 1.35, motorH: 1.7, motorColor: 0xeeeeee, capColor: 0x1d1e21, accent: 0xd9863a, R: 8.8, bladeColor: 0x1c1d20, tip: 0x8b8e92 });
  },
  // Parrot ANAFI Ai: white tubular arms with a foot, rear vent, camera on dark brackets with an orange ball.
  parrot(g, props) {
    g.add(body([[-3.8, -8.5], [3.8, -8.5], [4.5, -1], [4, 5], [2.7, 8.6], [-2.7, 8.6], [-4, 5], [-4.5, -1]], 6.4, 0xeef0f1));
    g.add(box(4.6, 3.4, 0.8, 0x2a2b2e, 0, -0.4, -8.9)); g.add(box(6.6, 2.6, 7.5, 0xe2e4e6, 0, -4, -1.5));
    const cam = new THREE.Group();
    cam.add(box(1, 3.8, 1.6, 0x4a4640, 2.5, 0, 0), box(1, 3.8, 1.6, 0x4a4640, -2.5, 0, 0));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(2.3, 8, 6), FLAT(0xc98a48, 0.35, 0.5)); cam.add(ball);
    cam.add(lens(1.3, 0, 0, 2.2, 0x6b4a26));
    cam.position.set(0, -0.2, 10.4); g.add(cam);
    addArms(g, props, { front: [3.9, 1.2, 5, 14, 1.4, 8.6], rear: [4.2, 1.2, -3.5, 15, 1.4, -9], w: 2.1, h: 2.1, color: 0xf3f4f5, foot: 3.2, round: true,
      motorR: 1.75, motorH: 2.1, motorColor: 0xe9ebec, capColor: 0x3a3c40, R: 11, bladeColor: 0x4a4d52 });
  },
  // Autel EVO Max 4T: grey body, tall dark nose pod with a 2x2 lens block, four obstacle sensors, thick arms with an orange ring on the motors.
  autel(g, props) {
    g.add(body([[-5, -13], [5, -13], [6, -4], [5.2, 7], [3.4, 13], [-3.4, 13], [-5.2, 7], [-6, -4]], 7, 0xb9bdc2, 0.8));
    g.add(body([[-4.6, -12], [4.6, -12], [5.4, -4], [4.7, 7], [3, 12], [-3, 12], [-4.7, 7], [-5.4, -4]], 3, 0x3b3f45, -4));
    const pod = new THREE.Group();
    pod.add(box(7.6, 6.4, 5.4, 0x24262a, 0, 0, 0));
    pod.add(lens(1.5, -1.9, 1.5, 2.9, 0x8a8e94), lens(1.5, 1.9, 1.5, 2.9, 0x8a8e94), lens(1.5, -1.9, -1.6, 2.9, 0x8a8e94), lens(0.9, 1.9, -1.6, 2.9, 0xf0802a));
    pod.position.set(0, -1.4, 13.5); g.add(pod);
    [-1, 1].forEach((sx) => g.add(lens(0.7, sx * 4.4, 1.5, 12.8, 0x2a2c30)));
    addArms(g, props, { front: [5, 0.8, 4, 19, 1, 10.5], rear: [5.2, 0.8, -6, 20, 1, -10.5], w: 2.9, h: 1.4, color: 0x50555c, foot: 4,
      motorR: 2, motorH: 2.8, motorColor: 0x1f2125, capColor: 0x34373c, accent: 0xf0802a, R: 14, bladeColor: 0x15161a });
  },
  // Skydio X10: light-grey shell over a dark base, wide black arms with tall feet, side camera pod, six dark navigation cameras.
  skydio(g, props) {
    g.add(body([[-5, -13], [5, -13], [7, -4], [6, 6], [3.5, 13], [-3.5, 13], [-6, 6], [-7, -4]], 5.5, 0xc9ccd0, 1.6));
    g.add(body([[-4.4, -12], [4.4, -12], [6.2, -4], [5.2, 6], [3, 12], [-3, 12], [-5.2, 6], [-6.2, -4]], 3.5, 0x2a2c30, -2.4));
    const pod = new THREE.Group();
    pod.add(box(6, 5, 6, 0x8c9096, 0, 0, 0));
    pod.add(lens(1.5, -1.3, 0.4, 3.1, 0x2b2d31), lens(1.0, 1.4, 1.2, 3.1, 0x2b2d31), lens(1.0, 1.4, -1.0, 3.1, 0x2b2d31));
    pod.position.set(-2.4, -0.2, 13.2); g.add(pod);
    g.add(box(0.8, 0.6, 0.6, 0xe5251c, 3.6, 1.2, 12.5));
    [[-4.2, 3, 12.2], [4.2, 3, 12.2], [0, 3.6, -12.6], [-6.4, 1.4, -2], [6.4, 1.4, -2], [0, 3.4, 4]].forEach(([x, y, z]) => g.add(cyl(0.8, 0.5, 0x0d0e10, x, y, z, 8, 0.6)));
    addArms(g, props, { front: [6.2, 0.6, 3, 21, 1, 8], rear: [6.4, 0.6, -6, 22, 1, -9], w: 3.4, h: 1.3, color: 0x1d1f23, foot: 5.5,
      motorR: 2.3, motorH: 3, motorColor: 0x141518, capColor: 0xe5251c, R: 17, bladeColor: 0x0f1012 });
  },
};

/** Build a drone. Y is up, the nose points to +Z. Returns the group and the list of propellers to spin. */
export function buildDrone(brand: BrandId): { group: THREE.Group; props: THREE.Object3D[] } {
  const g = new THREE.Group(); const props: THREE.Object3D[] = [];
  BUILDERS[brand](g, props);
  g.rotation.order = "YXZ";
  return { group: g, props };
}

// ---------- Still renderer (one shared WebGL context) ----------
let renderer: THREE.WebGLRenderer | null = null;
const stills = new Map<string, string>();
const listeners = new Set<() => void>();

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc4, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-30, 60, 40); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe6ff, 0.9); rim.position.set(40, 20, -30); scene.add(rim);
}

/** Render a drone to a transparent PNG (3/4 view from the front and above). Cached per brand, angle and size. */
export function droneStill(brand: BrandId, w = 360, h = 240, yaw = -0.62): string | null {
  const key = `${brand}:${w}x${h}:${yaw}`;
  const hit = stills.get(key); if (hit) return hit;
  if (typeof document === "undefined") return null;
  try {
    if (!renderer) renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1); renderer.setSize(w, h, false); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); lights(scene);
    const { group } = buildDrone(brand);
    group.rotation.y = yaw; group.rotation.x = 0.12; scene.add(group);
    const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    group.position.sub(c);
    const cam = new THREE.PerspectiveCamera(28, w / h, 1, 500);
    const r = Math.max(size.x, size.z) * 1.35 + 12;
    cam.position.set(0, r * 0.52, r * 0.9); cam.lookAt(0, -size.y * 0.1, 0);
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL("image/png");
    scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    stills.set(key, url); listeners.forEach((f) => f());
    return url;
  } catch { return null; }
}
export const onStills = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };
/** Cached still only; never renders (safe to call while rendering). */
export const stillPeek = (brand: BrandId, w = 360, h = 240, yaw = -0.62) => stills.get(`${brand}:${w}x${h}:${yaw}`) ?? null;
/** Render every brand once at the sizes the app uses. Call from an effect. */
export function pregenerateStills() { for (const b of MODEL_BRANDS) { droneStill(b, 360, 240); droneStill(b, 192, 128); } }

export const MODEL_BRANDS: BrandId[] = ["dji", "antigravity", "parrot", "autel", "skydio"];
export { THREE };
