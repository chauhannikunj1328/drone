"use client";
import { useEffect, useRef } from "react";
import type { BrandId } from "@/lib/data";
import { buildDrone, THREE } from "@/lib/droneModels";

// Interactive 3D drone: spins slowly, drag to turn it, propellers turn. One WebGL context per instance, so use it for one
// hero at a time; lists and map pins use the cached still images from droneModels.ts.
export function Drone3D({ brand, w, h, spin = true }: { brand: BrandId; w: number; h: number; spin?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current; if (!el) return;
    let raf = 0, dead = false;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h); renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block"; renderer.domElement.style.touchAction = "none"; renderer.domElement.style.cursor = "grab";
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bcc4, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-30, 60, 40); scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe6ff, 0.9); rim.position.set(40, 20, -30); scene.add(rim);
    const { group, props } = buildDrone(brand);
    const pivot = new THREE.Group(); pivot.add(group); scene.add(pivot);
    const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3()); group.position.sub(box.getCenter(new THREE.Vector3()));
    const cam = new THREE.PerspectiveCamera(28, w / h, 1, 500);
    const r = Math.max(size.x, size.z) * 1.3 + 12; cam.position.set(0, r * 0.5, r * 0.9); cam.lookAt(0, -size.y * 0.1, 0);
    pivot.rotation.x = 0.1; pivot.rotation.y = -0.62;
    let dragging = false, lastX = 0, vel = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = "grabbing"; };
    const move = (e: PointerEvent) => { if (!dragging) return; vel = (e.clientX - lastX) * 0.01; pivot.rotation.y += vel; lastX = e.clientX; };
    const up = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => {
      if (dead) return;
      if (!dragging && spin && !reduce) pivot.rotation.y += 0.006 + vel * 0.0;
      if (!reduce) props.forEach((p, i) => { p.rotation.y += (i % 2 ? 1 : -1) * 0.5; });
      renderer.render(scene, cam); raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { dead = true; cancelAnimationFrame(raf); renderer.domElement.remove(); renderer.dispose(); scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); }); };
  }, [brand, w, h, spin]);
  return <div ref={host} role="img" aria-label={`${brand} drone, 3D model. Drag to turn it.`} style={{ width: w, height: h }} />;
}
