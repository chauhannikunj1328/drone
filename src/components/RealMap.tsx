"use client";
// Real maps for Skyhand (MapLibre GL). Satellite: Esri World Imagery. Streets and 3D building heights: OpenFreeMap (OpenStreetMap data).
// RealMap = top-down map with drones, Home, landing spots, no-fly areas and the flight path.
// DroneView = the same real map seen from the drone: tilted by the gimbal, turned by the heading, zoomed by the height, with 3D buildings.
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { offset, type LngLat } from "@/lib/geo";

const SAT = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const OMT = "https://tiles.openfreemap.org/planet";
const ATTR_SAT = "Imagery © Esri, Maxar, Earthstar Geographics";
const ATTR_OSM = "© OpenStreetMap contributors · OpenFreeMap";

function satelliteStyle(buildings: boolean): StyleSpecification {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      sat: { type: "raster", tiles: [SAT], tileSize: 256, maxzoom: 19, attribution: ATTR_SAT },
      omt: { type: "vector", url: OMT, attribution: ATTR_OSM },
    },
    layers: [
      { id: "sat", type: "raster", source: "sat" },
      ...(buildings ? [{ id: "b3d", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 14,
        paint: { "fill-extrusion-color": "#d8d2c8", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.9 } } as never] : []),
    ],
    sky: { "sky-color": "#79acdf", "horizon-color": "#d6e7f5", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.5, "fog-color": "#cddff0", "fog-ground-blend": 0.7 },
  };
}

export type DroneState = "air" | "ready" | "notready" | "offline";
export interface MapDrone { id: string; label: string; at: LngLat; heading: number; state: DroneState; selected?: boolean }
export interface MapPlace { at: LngLat; name: string }
export interface MapZone { name: string; ring: LngLat[]; center: LngLat }

const PIN: Record<DroneState, [string, string]> = { air: ["#18e888", "#0c0c0c"], ready: ["#2880f0", "#ffffff"], notready: ["#f7c600", "#0c0c0c"], offline: ["#4a4a4a", "#e4e4e4"] };
const arrow = (c: string) => `<svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 L20 21 L12 16 L4 21 Z" fill="${c}"/></svg>`;

function droneEl(d: MapDrone, grey: boolean) {
  const [bg, fg] = grey ? (d.state === "air" ? ["#ffffff", "#111111"] : ["#141414", "#ffffff"]) : PIN[d.state];
  const sel = d.selected ? `box-shadow:0 0 0 4px ${grey ? "rgba(255,255,255,.45)" : "rgba(40,128,240,.55)"};` : "box-shadow:0 2px 8px rgba(0,0,0,.5);";
  const icon = d.state === "air" ? `<span style="display:inline-flex;transform:rotate(${d.heading}deg)">${arrow(fg)}</span>` : `<span style="width:8px;height:8px;border-radius:9999px;background:${fg}"></span>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
    <div style="width:28px;height:28px;border-radius:9999px;background:${bg};border:2px solid #fff;display:grid;place-items:center;${sel}">${icon}</div>
    <div style="font:500 12px/16px Inter,system-ui;color:#fff;background:rgba(18,18,18,.88);padding:2px 8px;border-radius:4px;white-space:nowrap">${d.label}</div></div>`;
}
const homeEl = (grey: boolean) => `<div style="width:24px;height:24px;border-radius:9999px;background:${grey ? "#141414" : "#2880f0"};border:2px solid #fff;color:#fff;font:700 12px/20px Inter,system-ui;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.5)">H</div>`;
const landEl = (name: string, grey: boolean) => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
  <div style="width:24px;height:24px;border-radius:6px;background:${grey ? "#ffffff" : "#18e888"};border:2px solid ${grey ? "#141414" : "#0c0c0c"};display:grid;place-items:center"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3v14M5 11l7 7 7-7" stroke="#0c0c0c" stroke-width="3" fill="none"/></svg></div>
  <div style="font:500 12px/16px Inter,system-ui;color:#fff;background:rgba(18,18,18,.88);padding:2px 8px;border-radius:4px;white-space:nowrap">${name}</div></div>`;
const zoneEl = (name: string) => `<div style="font:600 12px/16px Inter,system-ui;color:#fff;background:rgba(224,0,0,.85);padding:2px 8px;border-radius:4px;white-space:nowrap">${name}</div>`;

type ML = typeof import("maplibre-gl");

export function RealMap({ center, zoom = 16, grey = false, drones = [], homes = [], landing = [], noFly = [], path, interactive = true, tools = false, follow, onDrone, attribution = true }: {
  center: LngLat; zoom?: number; grey?: boolean; drones?: MapDrone[]; homes?: LngLat[]; landing?: MapPlace[]; noFly?: MapZone[]; path?: LngLat[];
  interactive?: boolean; tools?: boolean; follow?: LngLat; onDrone?: (id: string) => void; attribution?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const lib = useRef<ML | null>(null);
  const marks = useRef<Map<string, MLMarker>>(new Map());
  const [ready, setReady] = useState(false);
  const [is3d, setIs3d] = useState(false);
  const onDroneRef = useRef(onDrone); onDroneRef.current = onDrone;

  // create the map once
  useEffect(() => {
    let dead = false;
    const markers = marks.current;
    import("maplibre-gl").then((m) => {
      if (dead || !box.current) return;
      lib.current = m;
      const mp = new m.Map({ container: box.current, style: satelliteStyle(true), center, zoom, interactive, attributionControl: attribution ? { compact: true } : false, maxPitch: 85, fadeDuration: 0 });
      map.current = mp;
      mp.on("load", () => {
        mp.addSource("zones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        mp.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": grey ? "#000" : "#e00000", "fill-opacity": 0.18 } });
        mp.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": grey ? "#fff" : "#ff3b30", "line-width": 2, "line-dasharray": [3, 2] } });
        mp.addSource("path", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        mp.addLayer({ id: "path", type: "line", source: "path", paint: { "line-color": grey ? "#fff" : "#2880f0", "line-width": 3, "line-dasharray": [1, 2] } });
        setReady(true);
      });
    });
    return () => { dead = true; markers.forEach((mk) => mk.remove()); markers.clear(); map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // overlays: zones and flight path
  useEffect(() => {
    const mp = map.current; if (!mp || !ready) return;
    (mp.getSource("zones") as unknown as { setData: (d: unknown) => void })?.setData({ type: "FeatureCollection", features: noFly.map((z) => ({ type: "Feature", properties: { name: z.name }, geometry: { type: "Polygon", coordinates: [z.ring] } })) });
    (mp.getSource("path") as unknown as { setData: (d: unknown) => void })?.setData({ type: "FeatureCollection", features: path && path.length > 1 ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: path } }] : [] });
  }, [ready, noFly, path, grey]);

  // HTML markers: drones, homes, landing spots, zone labels
  useEffect(() => {
    const mp = map.current, m = lib.current; if (!mp || !m || !ready) return;
    const want = new Set<string>();
    const put = (key: string, at: LngLat, html: string, click?: () => void, anchor: "center" | "top" = "center") => {
      want.add(key);
      let mk = marks.current.get(key);
      if (!mk) {
        const el = document.createElement("div"); el.innerHTML = html;
        if (click) el.addEventListener("click", (e) => { e.stopPropagation(); click(); });
        mk = new m.Marker({ element: el, anchor }).setLngLat(at).addTo(mp); marks.current.set(key, mk);
      } else { mk.setLngLat(at); const el = mk.getElement(); if (el.innerHTML !== html) el.innerHTML = html; }
    };
    homes.forEach((h, i) => put(`home${i}`, h, homeEl(grey)));
    landing.forEach((l, i) => put(`land${i}`, l.at, landEl(l.name, grey), undefined, "top"));
    noFly.forEach((z, i) => put(`zone${i}`, z.center, zoneEl(z.name)));
    drones.forEach((d) => put(`d-${d.id}`, d.at, droneEl(d, grey), () => onDroneRef.current?.(d.id), "top"));
    marks.current.forEach((mk, k) => { if (!want.has(k)) { mk.remove(); marks.current.delete(k); } });
  }, [ready, drones, homes, landing, noFly, grey]);

  // keep the followed point in view
  useEffect(() => {
    const mp = map.current; if (!mp || !ready || !follow) return;
    const b = mp.getBounds(); if (!b.contains(follow)) mp.easeTo({ center: follow, duration: 600 });
  }, [ready, follow]);

  // recenter when the place changes (country switch)
  useEffect(() => { const mp = map.current; if (mp && ready) mp.jumpTo({ center, zoom }); }, [ready, center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const tool = (label: string, title: string, run: () => void, on?: boolean) =>
    <button className={`fh-tool${on ? " on" : ""}`} title={title} aria-label={title} onClick={run}>{label}</button>;
  return (
    <div style={{ position: "absolute", inset: 0, filter: grey ? "grayscale(1)" : undefined, background: "#1b1f24" }}>
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
      {tools && (
        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", display: "grid", gap: 8, zIndex: 3 }}>
          {tool("N", "Point north", () => map.current?.easeTo({ bearing: 0, pitch: is3d ? 60 : 0 }))}
          {tool(is3d ? "2D" : "3D", is3d ? "Flat map" : "Tilt to 3D", () => { const v = !is3d; setIs3d(v); map.current?.easeTo({ pitch: v ? 60 : 0, duration: 500 }); }, is3d)}
          {tool("◎", "Recenter", () => map.current?.easeTo({ center: follow ?? center, duration: 500 }))}
          {tool("+", "Zoom in", () => map.current?.zoomIn())}
          {tool("−", "Zoom out", () => map.current?.zoomOut())}
        </div>
      )}
    </div>
  );
}

// The drone camera: real imagery and 3D buildings from the drone's position.
export function DroneView({ at, heading, height, gimbal, grey = false, dim = false }: { at: LngLat; heading: number; height: number; gimbal: number; grey?: boolean; dim?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const cam = () => {
    const pitch = Math.max(0, Math.min(84, 84 - gimbal));
    const h = Math.max(2, height + 2);
    const zoom = Math.max(14.5, Math.min(20.5, 20.8 - Math.log2(h / 2)));
    const look = Math.min(900, h * Math.tan((Math.min(pitch, 80) * Math.PI) / 180) * 0.6);
    const a = (heading * Math.PI) / 180;
    return { center: offset(at, Math.sin(a) * look, Math.cos(a) * look), zoom, pitch, bearing: heading };
  };
  useEffect(() => {
    let dead = false;
    import("maplibre-gl").then((m) => {
      if (dead || !box.current) return;
      const mp = new m.Map({ container: box.current, style: satelliteStyle(true), ...cam(), interactive: false, attributionControl: { compact: true }, maxPitch: 85, fadeDuration: 0 });
      map.current = mp;
      // keep the required credits as a collapsed (i) button on camera views
      mp.on("load", () => { setReady(true); box.current?.querySelectorAll(".maplibregl-ctrl-attrib").forEach((e) => e.classList.remove("maplibregl-compact-show")); });
    });
    return () => { dead = true; map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (map.current && ready) map.current.jumpTo(cam()); }); // follow every simulation tick
  return (
    <div className="dv" style={{ position: "absolute", inset: 0, background: "linear-gradient(#79acdf, #d6e7f5)", filter: `${grey ? "grayscale(1) " : ""}${dim ? "brightness(.6)" : ""}` || undefined }}>
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
