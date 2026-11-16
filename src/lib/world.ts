// Turns prototype state into real-map data for the current country (see geo.ts for the example places).
import { circle, droneLngLat, homeOf, nearestLanding, offset, SPOTS, type LngLat } from "./geo";
import { inAir, type Proto } from "./store";
import { DRONE_PHOTO } from "./data";
import type { MapDrone, MapPlace, MapZone } from "@/components/RealMap";

export function world(s: Proto) {
  const spot = SPOTS[s.country];
  const homeById: Record<string, LngLat> = {};
  s.drones.forEach((d, i) => { homeById[d.id] = homeOf(spot, i); });
  const posOf = (id: string): LngLat => { const m = s.sims[id]; return inAir(m.phase) ? droneLngLat(homeById[id], m.distance, m.heading) : homeById[id]; };
  const drones: MapDrone[] = s.drones.map((d) => {
    const m = s.sims[d.id];
    const state = inAir(m.phase) ? "air" : d.status === "Ready" || d.status === "Limited" ? "ready" : d.status === "Offline" ? "offline" : "notready";
    return { cut: DRONE_PHOTO[d.brand]?.cut, id: d.id, label: inAir(m.phase) ? `${d.nickname} · ${m.height.toFixed(0)} m` : d.nickname, at: posOf(d.id), heading: m.heading, state, selected: d.id === s.droneId };
  });
  const landing: MapPlace[] = spot.landing.map((l) => ({ name: l.name, at: offset(spot.home, l.east, l.north) }));
  const noFly: MapZone[] = spot.noFly.map((z) => { const c = offset(spot.home, z.east, z.north); return { name: z.name, center: c, ring: circle(c, z.radius) }; });
  const me = posOf(s.droneId);
  const myHome = homeById[s.droneId];
  return { spot, drones, landing, noFly, me, myHome, homes: Object.values(homeById), posOf, nearest: nearestLanding(spot, me), path: inAir(s.sims[s.droneId].phase) ? [myHome, me] : undefined };
}
