// Real-world example flying spots, one per country, with landing places and an example no-fly area.
// CONCEPT DATA: places are real, but suitability for drones was NOT checked. Many city parks ban drones
// (for example London's Royal Parks). The app labels every spot "Example location · not checked".
import type { CountryCode } from "./data";

export type LngLat = [number, number];
export interface LandingSpot { id: string; name: string; note: string; east: number; north: number; }
export interface NoFly { name: string; east: number; north: number; radius: number; }
export interface FlySpot { city: string; place: string; home: LngLat; zoom: number; landing: LandingSpot[]; noFly: NoFly[]; }

export const SPOTS: Record<CountryCode, FlySpot> = {
  US: { city: "San Francisco", place: "Marina Green", home: [-122.4400, 37.8062], zoom: 16,
    landing: [{ id: "l1", name: "Lawn north", note: "Open grass", east: 90, north: 60 }, { id: "l2", name: "Field west", note: "Flat, no paths", east: -170, north: 20 }],
    noFly: [{ name: "Helicopter route (example)", east: 520, north: 260, radius: 220 }] },
  UK: { city: "London", place: "Greenwich Park", home: [-0.0010, 51.4775], zoom: 16,
    landing: [{ id: "l1", name: "Upper lawn", note: "Open grass", east: 110, north: -60 }, { id: "l2", name: "Flower garden edge", note: "Away from paths", east: -150, north: 70 }],
    noFly: [{ name: "Royal Observatory (example)", east: -40, north: 230, radius: 120 }] },
  AE: { city: "Dubai", place: "Kite Beach", home: [55.1990, 25.1585], zoom: 16,
    landing: [{ id: "l1", name: "Beach flat", note: "Hard sand", east: -80, north: 90 }, { id: "l2", name: "Park lawn", note: "Behind the walkway", east: 140, north: -70 }],
    noFly: [{ name: "Burj Al Arab area (example)", east: -900, north: 600, radius: 500 }] },
  AU: { city: "Sydney", place: "Centennial Park", home: [151.2330, -33.8960], zoom: 16,
    landing: [{ id: "l1", name: "Grand Drive lawn", note: "Open grass", east: 120, north: 40 }, { id: "l2", name: "Pond field", note: "Flat, quiet", east: -130, north: -90 }],
    noFly: [{ name: "Hospital helipad (example)", east: -700, north: 450, radius: 250 }] },
  IN: { city: "Mumbai", place: "Marine Drive", home: [72.8235, 18.9430], zoom: 16,
    landing: [{ id: "l1", name: "Promenade gap", note: "Wide walkway", east: -60, north: 120 }, { id: "l2", name: "Oval Maidan", note: "Open ground", east: 380, north: -300 }],
    noFly: [{ name: "Naval area (example)", east: 300, north: -900, radius: 450 }] },
  CH: { city: "Zurich", place: "Zürichhorn", home: [8.5530, 47.3545], zoom: 16,
    landing: [{ id: "l1", name: "Lakeside lawn", note: "Open grass", east: 70, north: -80 }, { id: "l2", name: "Park meadow", note: "Away from trees", east: -140, north: 60 }],
    noFly: [{ name: "Hospital (example)", east: 600, north: 500, radius: 250 }] },
  JP: { city: "Tokyo", place: "Yoyogi Park", home: [139.6950, 35.6717], zoom: 16,
    landing: [{ id: "l1", name: "Central lawn", note: "Open grass", east: 90, north: 70 }, { id: "l2", name: "Field east", note: "Flat", east: 190, north: -90 }],
    noFly: [{ name: "Meiji Shrine (example)", east: 300, north: 600, radius: 300 }] },
  LU: { city: "Luxembourg City", place: "Parc Municipal", home: [6.1260, 49.6110], zoom: 16,
    landing: [{ id: "l1", name: "Park lawn", note: "Open grass", east: 60, north: 70 }, { id: "l2", name: "Playground field", note: "When empty", east: -120, north: -40 }],
    noFly: [{ name: "Government quarter (example)", east: 450, north: -250, radius: 220 }] },
};

const M_PER_DEG_LAT = 111_320;
export function offset([lng, lat]: LngLat, east: number, north: number): LngLat {
  return [lng + east / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)), lat + north / M_PER_DEG_LAT];
}
export function distanceM(a: LngLat, b: LngLat) {
  const dx = (b[0] - a[0]) * M_PER_DEG_LAT * Math.cos((a[1] * Math.PI) / 180), dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  return Math.hypot(dx, dy);
}
// Drone position from the simulation (distance from Home and heading). Each drone gets its own Home spread around the spot.
const HOME_SPREAD: [number, number][] = [[0, 0], [-60, 40], [70, 90], [120, -60], [-110, -70], [40, -120], [-150, 110]];
export function homeOf(spot: FlySpot, index: number): LngLat { const [e, n] = HOME_SPREAD[index % HOME_SPREAD.length]; return offset(spot.home, e, n); }
export function droneLngLat(home: LngLat, distance: number, heading: number): LngLat {
  const a = (heading * Math.PI) / 180; return offset(home, Math.sin(a) * distance, Math.cos(a) * distance);
}
export function nearestLanding(spot: FlySpot, from: LngLat) {
  return spot.landing.map((l) => ({ ...l, at: offset(spot.home, l.east, l.north) })).map((l) => ({ ...l, dist: distanceM(from, l.at) })).sort((a, b) => a.dist - b.dist)[0];
}
export function circle(center: LngLat, radius: number, steps = 48): LngLat[] {
  return Array.from({ length: steps + 1 }, (_, i) => { const a = (i / steps) * 2 * Math.PI; return offset(center, Math.cos(a) * radius, Math.sin(a) * radius); });
}
