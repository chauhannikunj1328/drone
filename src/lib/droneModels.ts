// Original 3D drone models for Skyhand, built from code (three.js primitives). Not exact replicas:
// simplified shapes, proportions and colours that read as each maker's drone. No maker assets, photos or
// scans are used, so they are free to use. Dimensions are in centimetres, roughly to scale between drones.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { BrandId } from "./data";

interface Spec {
  bodyL: number; bodyW: number; bodyH: number; bodyColor: number; bodyRound: number;
  armSpanX: number; armSpanZ: number; armW: number; armColor: number; armDrop: number; // frontDrop: front arms sit lower
  motorR: number; motorH: number; motorColor: number;
  propR: number; propColor: number;
  gimbal: "ball" | "pod" | "none"; gimbalR: number; gimbalColor: number; accent: number;
  legs?: boolean; navCams?: number; domes?: boolean; sensorBumps?: boolean;
}

const SPECS: Record<BrandId, Spec> = {
  // DJI Mavic 4 Pro style: grey folding quad, big gimbal pod at the nose, arms swept back.
  dji: { bodyL: 24, bodyW: 9, bodyH: 8, bodyColor: 0x6b6f75, bodyRound: 2.5, armSpanX: 31, armSpanZ: 25, armW: 2.4, armColor: 0x7a7e84, armDrop: 2.5,
    motorR: 1.8, motorH: 2.6, motorColor: 0x2b2d31, propR: 12, propColor: 0x1a1b1e, gimbal: "pod", gimbalR: 4.6, gimbalColor: 0x1d1f23, accent: 0xe07a2f, legs: false, sensorBumps: true },
  // Antigravity A1 style: compact white 360 drone with a lens dome on top and below.
  antigravity: { bodyL: 17, bodyW: 8.5, bodyH: 7, bodyColor: 0xeceae6, bodyRound: 3, armSpanX: 22, armSpanZ: 19, armW: 2, armColor: 0xf4f2ee, armDrop: 0.5,
    motorR: 1.5, motorH: 2.2, motorColor: 0x2b2d31, propR: 8.5, propColor: 0x232428, gimbal: "none", gimbalR: 3, gimbalColor: 0x17181b, accent: 0x4f5bd5, domes: true },
  // Parrot ANAFI Ai style: white and dark grey, long body, front camera with a large lens.
  parrot: { bodyL: 26, bodyW: 8, bodyH: 7, bodyColor: 0xd9dbdd, bodyRound: 3.2, armSpanX: 30, armSpanZ: 24, armW: 2.2, armColor: 0xcfd1d4, armDrop: 1.2,
    motorR: 1.7, motorH: 2.4, motorColor: 0x3a3c40, propR: 11, propColor: 0x303236, gimbal: "ball", gimbalR: 4, gimbalColor: 0x1d1f23, accent: 0xe05a3a, legs: false },
  // Autel EVO Max 4T style: dark grey with an orange accent, big triple-sensor pod.
  autel: { bodyL: 28, bodyW: 11, bodyH: 9, bodyColor: 0x3d4148, bodyRound: 2.5, armSpanX: 36, armSpanZ: 30, armW: 2.8, armColor: 0x4a4f57, armDrop: 2,
    motorR: 2.1, motorH: 3, motorColor: 0x24262a, propR: 14, propColor: 0x17181b, gimbal: "pod", gimbalR: 5.4, gimbalColor: 0x1a1c20, accent: 0xf0802a, sensorBumps: true },
  // Skydio X10 style: black, six navigation cameras, thick arms, camera on the nose.
  skydio: { bodyL: 30, bodyW: 12, bodyH: 9, bodyColor: 0x23252a, bodyRound: 3, armSpanX: 40, armSpanZ: 33, armW: 3.2, armColor: 0x1d1f23, armDrop: 1.5,
    motorR: 2.4, motorH: 3.2, motorColor: 0x141518, propR: 15, propColor: 0x0f1012, gimbal: "pod", gimbalR: 5, gimbalColor: 0x111215, accent: 0x4f5bd5, navCams: 6 },
};

const mat = (c: number, rough = 0.55, metal = 0.1) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });

/** Build a drone. Y is up, the nose points to +Z. Returns the group and the list of propellers to spin. */
export function buildDrone(brand: BrandId): { group: THREE.Group; props: THREE.Object3D[] } {
  const k = SPECS[brand];
  const g = new THREE.Group();
  const props: THREE.Object3D[] = [];

  // body
  const body = new THREE.Mesh(new RoundedBoxGeometry(k.bodyW, k.bodyH, k.bodyL, 6, k.bodyRound), mat(k.bodyColor, 0.5, 0.15));
  g.add(body);
  // top shell, slightly smaller, gives a two-part body
  const shell = new THREE.Mesh(new RoundedBoxGeometry(k.bodyW * 0.86, k.bodyH * 0.45, k.bodyL * 0.78, 5, k.bodyRound * 0.6), mat(k.bodyColor, 0.4, 0.2));
  shell.position.set(0, k.bodyH * 0.5, -k.bodyL * 0.04); g.add(shell);
  // accent stripe
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(k.bodyW * 0.5, 0.35, k.bodyL * 0.5), mat(k.accent, 0.5, 0.1));
  stripe.position.set(0, k.bodyH * 0.74, -k.bodyL * 0.04); g.add(stripe);

  // arms, motors, propellers
  const corners: [number, number][] = [[1, 1], [-1, 1], [1, -1], [-1, -1]]; // [x sign, z sign]; +z = front
  corners.forEach(([sx, sz]) => {
    const tx = sx * k.armSpanX / 2, tz = sz * k.armSpanZ / 2, ty = sz > 0 ? -k.armDrop : k.armDrop * 0.2;
    const a = new THREE.Vector3(sx * k.bodyW * 0.3, 0.5, sz * k.bodyL * 0.18), b = new THREE.Vector3(tx, ty, tz);
    const len = a.distanceTo(b);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(k.armW * 0.5, k.armW * 0.42, len, 14), mat(k.armColor, 0.55, 0.1));
    arm.position.copy(a.clone().add(b).multiplyScalar(0.5));
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(k.motorR, k.motorR * 1.05, k.motorH, 20), mat(k.motorColor, 0.4, 0.4));
    motor.position.set(tx, ty + k.motorH * 0.55, tz); g.add(motor);
    // propeller: two blades and a faint disc
    const prop = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(k.propR * 2, 0.18, k.propR * 0.17), mat(k.propColor, 0.6, 0));
    prop.add(blade);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(k.propR, 40), new THREE.MeshBasicMaterial({ color: 0x1a1b1e, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = -0.1; prop.add(disc);
    prop.position.set(tx, ty + k.motorH * 1.15, tz);
    prop.rotation.y = (sx * sz > 0 ? 0.5 : -0.5);
    g.add(prop); props.push(prop);
  });

  // gimbal / camera
  if (k.gimbal !== "none") {
    const gz = k.bodyL * 0.5 + (k.gimbal === "pod" ? 0.6 : 0.2);
    const gimbal = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(k.gimbalR, 28, 20), mat(k.gimbalColor, 0.35, 0.3));
    gimbal.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(k.gimbalR * 0.62, k.gimbalR * 0.09, 12, 36), mat(k.accent, 0.35, 0.4));
    ring.position.z = k.gimbalR * 0.78; gimbal.add(ring);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(k.gimbalR * 0.42, k.gimbalR * 0.42, k.gimbalR * 0.5, 24), mat(0x07080a, 0.15, 0.6));
    lens.rotation.x = Math.PI / 2; lens.position.z = k.gimbalR * 0.82; gimbal.add(lens);
    if (k.gimbal === "pod") { const lens2 = lens.clone(); lens2.scale.setScalar(0.5); lens2.position.set(k.gimbalR * 0.45, k.gimbalR * 0.4, k.gimbalR * 0.9); gimbal.add(lens2); const lens3 = lens2.clone(); lens3.position.set(-k.gimbalR * 0.45, k.gimbalR * 0.4, k.gimbalR * 0.9); gimbal.add(lens3); }
    gimbal.position.set(0, -k.bodyH * 0.2, gz); g.add(gimbal);
  }

  // A1: lens domes top and bottom
  if (k.domes) {
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.8, 24, 18), mat(0x17181b, 0.2, 0.5)); top.position.set(0, k.bodyH * 0.62, 2); g.add(top);
    const bot = top.clone(); bot.position.set(0, -k.bodyH * 0.62, 2); g.add(bot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.35, 10, 30), mat(k.accent, 0.4, 0.3)); ring.rotation.x = Math.PI / 2; ring.position.set(0, k.bodyH * 0.55, 2); g.add(ring);
  }
  // front sensor bumps
  if (k.sensorBumps) {
    [-1, 1].forEach((sx) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), mat(0x0a0b0d, 0.2, 0.6)); s.position.set(sx * k.bodyW * 0.32, k.bodyH * 0.15, k.bodyL * 0.5); g.add(s); });
  }
  // X10: navigation cameras around the body
  if (k.navCams) {
    for (let i = 0; i < k.navCams; i++) {
      const a = (i / k.navCams) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), mat(0x0b0c0e, 0.2, 0.6));
      c.position.set(Math.cos(a) * k.bodyW * 0.52, k.bodyH * 0.3, Math.sin(a) * k.bodyL * 0.46); g.add(c);
    }
  }
  // landing feet (rear)
  [-1, 1].forEach((sx) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 3, 10), mat(0x232428, 0.6, 0)); f.position.set(sx * k.bodyW * 0.38, -k.bodyH * 0.55 - 1, -k.bodyL * 0.3); g.add(f); });

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
