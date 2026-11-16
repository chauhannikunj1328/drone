"use client";
import { CheckCircle2, AlertCircle, ArrowDownCircle, Info } from "lucide-react";
import { COUNTRIES } from "@/lib/data";
import { frameSize } from "@/lib/layout";
import { droneOf, inAir, useProto } from "@/lib/store";
import { world } from "@/lib/world";
import { RealMap } from "./RealMap";
import { Columns, Page } from "./Screens";
import { DroneCutout } from "./art";

// Overview (touch devices): live 3D city map with drone photos, four KPI tiles, drones, flights, notifications.
// Same layout as ios/Skyhand/OverviewView.swift, on every device.
// All numbers are mock.

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="card" style={{ padding: 14, display: "grid", gap: 14 }}>
      <span className="t-cap muted">{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="num" style={{ fontSize: 34, lineHeight: "40px", fontWeight: 400, letterSpacing: "-.02em" }}>{value}</span>
        {unit && <span className="t-cap muted">{unit}</span>}
      </span>
    </div>
  );
}

function Dot({ c }: { c: string }) { return <span style={{ width: 6, height: 6, borderRadius: 9999, background: c, flex: "none" }} />; }

function Note({ icon, tint, title, sub, time }: { icon: React.ReactNode; tint: string; title: string; sub: string; time: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--fill)", color: tint, display: "grid", placeItems: "center", flex: "none" }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}><span className="t-label" style={{ display: "block" }}>{title}</span><span className="t-cap muted">{sub}</span></span>
      <span className="t-cap num" style={{ color: "var(--text-3)" }}>{time}</span>
    </div>
  );
}

export function OverviewScreen() {
  const { s } = useProto();
  const w = world(s);
  const { W } = frameSize(s.platform, s.orient);
  const c = COUNTRIES[s.country];
  const ready = s.drones.filter((d) => d.status === "Ready").length;
  const air = s.drones.filter((d) => inAir(s.sims[d.id].phase)).length;
  const wide = W >= 600;
  const laptop = s.platform === "laptop";
  const duoPortrait = s.platform === "duoOpen" && s.orient === "portrait";
  const map = (
    <div style={{ position: "relative", height: duoPortrait ? 196 : laptop ? 440 : wide ? 360 : 300, borderRadius: 16, overflow: "hidden", background: "#efede8" }}>
      <RealMap look="clay" pitch={55} bearing={25} zoom={15} center={w.spot.home} drones={w.drones} homes={[w.myHome]} landing={w.landing} noFly={w.noFly} path={w.path} interactive={false} attribution={false} />
      <span className="chip" style={{ position: "absolute", left: 10, bottom: 10, zIndex: 2, background: "rgba(255,255,255,.88)", color: "#141414" }}><Info size={12} />Example location · drone rules not checked</span>
    </div>
  );
  const kpis = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
      <Kpi label="Ready to fly" value={String(ready)} unit={`/${s.drones.length}`} />
      <Kpi label="In the air" value={String(air)} />
      <Kpi label="Avg. flight time" value="18.4" unit="min" />
      <Kpi label="Pre-flight pass rate" value="96.2" unit="%" />
    </div>
  );
  const drones = (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><b className="t-label">Drones</b><span className="t-cap muted">{s.drones.filter((d) => d.status !== "Offline").length} online</span></div>
      {s.drones.map((d) => {
        const flying = inAir(s.sims[d.id].phase);
        const col = flying ? "var(--live)" : d.status === "Ready" ? "var(--ok)" : d.status === "Offline" ? "var(--text-3)" : "var(--warn)";
        return (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44 }}>
            <DroneCutout brand={d.brand} w={44} h={28} />
            <span className="t-label" style={{ whiteSpace: "nowrap" }}>{d.nickname}</span>
            <span className="t-cap muted" style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.model}</span>
            <span className="t-cap" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)" }}><Dot c={col} />{flying ? "Flying" : d.status}</span>
          </div>
        );
      })}
    </div>
  );
  const flights = (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><b className="t-label">Flights</b><span className="t-cap muted">{s.flights.length + 3} this week</span></div>
      {[...s.flights.map((f) => [f.id, "Landed"]), ["m1", "Landed"], ["m2", "Landed"], ["m3", "Returned early"]].slice(0, 4).map(([id, st], i) => (
        <div key={`${id}${i}`} style={{ display: "flex", justifyContent: "space-between", minHeight: 40, alignItems: "center" }}>
          <span className="t-label num">FL {String(451 - i * 3).padStart(4, "0")}</span>
          <span className="t-cap" style={{ color: st === "Returned early" ? "var(--warn)" : "var(--text-2)" }}>{st}</span>
        </div>
      ))}
    </div>
  );
  const notes = (
    <div className="card" style={{ padding: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}><b className="t-label">Notifications</b><span className="t-cap muted">Today</span></div>
      <Note icon={<CheckCircle2 size={20} />} tint="var(--ok)" title={`${droneOf(s, "d5").nickname} finished its orbit pass`} sub="Skydio X10 · monitor only" time="11:00" />
      <Note icon={<AlertCircle size={20} />} tint="var(--danger)" title="360 cam battery below 20%" sub="Charge before the next flight" time="10:20" />
      <Note icon={<ArrowDownCircle size={20} />} tint="var(--text-3)" title="Trail needs an update" sub="Parrot ANAFI Ai firmware" time="08:30" />
    </div>
  );
  return (
    <Page title="Overview" sub={`${w.spot.place}, ${w.spot.city} · max ${c.maxAltitude} m`} full={wide}>
      <Columns ratio={laptop ? "1.5fr 1fr" : "1fr 1fr"} left={<>{map}{kpis}</>} right={<div style={{ display: "grid", gap: 12 }}>{drones}{flights}{notes}</div>} />
    </Page>
  );
}
