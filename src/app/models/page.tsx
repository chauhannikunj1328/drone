"use client";
import { Drone3D } from "@/components/Drone3D";
import type { BrandId } from "@/lib/data";

// Review gallery for the original low-poly drone models (not part of the app screens).
const ITEMS: [BrandId, string][] = [["dji", "DJI Mavic 4 Pro"], ["antigravity", "Antigravity A1"], ["parrot", "Parrot ANAFI Ai"], ["autel", "Autel EVO Max 4T"], ["skydio", "Skydio X10"]];
export default function Models() {
  return (
    <main style={{ minHeight: "100vh", background: "#ecebee", padding: 24, fontFamily: "-apple-system, system-ui, sans-serif", color: "#141414" }}>
      <h1 style={{ fontSize: 28, margin: "0 0 4px", fontWeight: 700 }}>Skyhand drone models</h1>
      <p style={{ margin: "0 0 20px", color: "#6a696b" }}>Original low-poly models, not exact replicas. Drag a model to turn it.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {ITEMS.map(([b, n]) => (
          <div key={b} style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
            <Drone3D brand={b} w={380} h={250} spin={false} />
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{n}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
