"use client";
import { useState } from "react";
import { activeAlerts, alertAction, droneOf, inAir, startReturn, useProto } from "@/lib/store";
import { AlertCard, HoldButton, Icon, Mock } from "./ui";
import { Scene, StatusBar } from "./art";

// The observer's own phone (S40 Join, S41 Watching). Observer can view, confirm sight, Pause and Return. Cannot fly or land.
export function ObserverPhone() {
  const { s, up } = useProto();
  const [code, setCode] = useState("");
  const d = droneOf(s); const sim = s.sims[s.droneId];
  const crit = activeAlerts(s).filter((a) => a.level === "critical").slice(0, 1);
  const W = 390, H = 844;

  if (s.observer === "invited" || s.observer === "left") {
    const ok = code.replace(/\s/g, "").toUpperCase() === "K7Q2M9";
    return (
      <div className="light desk touch" style={{ position: "absolute", inset: 0, width: W, height: H, padding: "72px 16px 32px" }}>
        <StatusBar platform="iphone" dark />
        <h1 className="t-large" style={{ margin: "8px 0 4px" }}>Join a flight</h1>
        <p className="t-body">{s.observer === "left" ? "You left the flight. Enter the code to rejoin." : "Enter the code from the pilot"}</p>
        <input data-hit aria-label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="K7Q 2M9"
          style={{ width: "100%", minHeight: 52, fontSize: 24, letterSpacing: 6, textAlign: "center", border: "2px solid var(--grey-900)", borderRadius: 12, background: "var(--grey-0)" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" data-hit onClick={() => setCode("K7Q 2M9")}>Fill code <Mock label="Prototype" /></button>
          <button className="btn btn-primary" data-hit disabled={!ok} onClick={() => up((p) => { p.observer = "joined"; p.observerSight = false; p.observerLeftAck = false; })}>Join</button>
        </div>
      </div>
    );
  }
  return (
    <div className="dark desk touch" style={{ position: "absolute", inset: 0, width: W, height: H }}>
      <div style={{ position: "absolute", top: 59, left: 16, right: 16 }}>
        <div className="t-head">Watching</div>
        <div className="t-cap muted">You&apos;re watching {d.nickname}</div>
      </div>
      <StatusBar platform="iphone" dark />
      <div className="video" style={{ left: 0, top: 112, width: W, height: 219 }}>
        <Scene heading={sim.heading} height={sim.height} gimbal={sim.gimbal} />
      </div>
      <div className="scrim t-num" style={{ position: "absolute", left: 16, top: 287, padding: "4px 8px", fontSize: 13 }}>H {sim.height.toFixed(0)} m · D {sim.distance.toFixed(0)} m · {Math.round(d.battery)}%</div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 344 }}>
        {crit.map((a) => <AlertCard key={a.id} a={a} onAct={() => up((p) => alertAction(p, a.id))} />)}
      </div>
      <div style={{ position: "absolute", left: 16, right: 16, top: 470, display: "grid", gap: 12 }}>
        <button className={`btn ${s.observerSight ? "" : "btn-primary"}`} data-hit onClick={() => up((p) => { p.observerSight = true; })}>
          {s.observerSight ? <><Icon kind="pass" /> You confirmed you can see it</> : "I can see the drone"}</button>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "center", marginTop: 8 }}>
          <button data-hit className={`ctl pause stop${sim.phase === "paused" ? " active" : ""}`} style={{ position: "relative", width: 72, height: 72 }} disabled={!inAir(sim.phase)}
            onClick={() => up((p) => { const m = p.sims[p.droneId]; if (m.phase === "flying" || m.phase === "returning") m.phase = "paused"; else if (m.phase === "paused") m.phase = "flying"; })}>
            {sim.phase === "paused" ? "Resume" : "Pause"}</button>
          <div style={{ position: "relative", width: 56, height: 56 }}>
            <HoldButton label="Return" size={56} disabled={!inAir(sim.phase) || sim.phase === "returning"} style={{ position: "absolute", left: 0, top: 0 }}
              onDone={() => up((p) => startReturn(p, "Launch point"))} />
          </div>
        </div>
        <p className="t-cap muted" style={{ textAlign: "center" }}>Observers can Pause and Return. The pilot can cancel a return.</p>
        <button className="btn" data-hit onClick={() => up((p) => { p.observer = "left"; p.observerSight = false; p.observerLeftAck = false; })}>Leave · tell the pilot you can&apos;t see it</button>
      </div>
    </div>
  );
}
