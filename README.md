# Skyhand — drone control app (wireframe prototype)

A clickable, high-fidelity **greyscale wireframe** for a concept app that lets you watch and fly a drone from an iPhone, iPad, iPhone Duo or laptop, with no goggles and no physical remote. On-screen controls copy each maker's own controller layout.

> **Concept by Artonest. Not a real product.** It is not affiliated with or approved by DJI, Antigravity, Parrot, Autel or Skydio. All drone data, telemetry, maps and sign-ins are mock. Country rules are shown with their source and check date and are not legal advice.

## What's inside

- **Five controller skins:** DJI Mavic 4 Pro, Antigravity A1, Parrot ANAFI Ai, Autel EVO Max 4T, Skydio X10 (monitor and mission-start only).
- **Flight simulation:** take off, sticks or the A1 Flight Slider, smart modes, return (Home / Launch point / My position), landing, flight summary.
- **Safety cluster on every skin:** Pause, Return and Land, with hold-to-confirm.
- **Country rules for 8 countries:** USA, UK, UAE, Australia, India, Switzerland, Japan, Luxembourg, with red flags where flying is a problem.
- **Pre-flight:** country, use case, checklist, line-of-sight check and observer invite.
- **First launch:** welcome, safety, permissions, country, experience, first drone. Maker sign-in happens inside Add a drone. The optional Skyhand account is only for sync across devices.
- **Platforms:** iPhone, iPad, iPhone Duo (open and closed), laptop.

## Creative design versions (this branch: `creative-design`)

Two apps share one design, in the SwiftUI / iOS style, based on a style study of "Air Dropper" (Phenomenon Studio, Dribbble). No artwork from it is used.

| Version | Style |
|---|---|
| V1 Light | Light grey canvas, white cards, black selection, indigo accent |
| V2 Dark | The same system in iOS dark mode |
| V3 Map | Every screen floats on a muted city map, glass cards, graphite accent |

The flight screens (Fly, cockpit) are dark glass over the live view in every version.

- **Web prototype (this folder):** the way to preview iPhone Duo, because Xcode has no Duo simulator. Switch versions in the sidebar on port 3000, with the V1 / V2 / V3 buttons on the device apps, or with `?look=v2` in the URL. It covers all devices (iPhone, iPad, iPhone Duo, laptop). Styles are in `src/app/looks.css`.
- **Native SwiftUI app:** `ios/Skyhand` (open `Skyhand.xcodeproj` in Xcode). Main flow only. Settings > iPhone Duo preview shows the Duo sizes and fold on an iPad simulator.

## Run it

```bash
npm install
npm run dev        # full prototype with test sidebar on http://localhost:3000
npm run devices    # one standalone app per device (needs the dev server running)
```

| Address | App |
|---|---|
| http://localhost:3000 | Full prototype with the test sidebar (screens, events, overlays) |
| http://localhost:4001 | iPhone (rotate) |
| http://localhost:4002 | iPad (rotate) |
| http://localhost:4003 | iPhone Duo (open/close, rotate) |
| http://localhost:4004 | Laptop |

The device apps are served by the same Next.js server through a small proxy (`scripts/device-ports.mjs`). Each one keeps its own state.

## Code map

| Path | What |
|---|---|
| `src/lib/data.ts` | Mock drones, brand skins, country rules, alert copy, maker sign-in needs |
| `src/lib/layout.ts` | Device sizes, safe areas, Fly screen zones, device apps |
| `src/lib/store.tsx` | Prototype state and the 250 ms flight simulation |
| `src/components/Fly.tsx` | Fly screen (HUD, skins, safety cluster, sheets) |
| `src/components/Screens.tsx` | Hangar, add drone, pre-flight, flights, rules, settings |
| `src/components/Onboarding.tsx` | First launch and Skyhand account |
| `src/components/art.tsx` | Greyscale illustrations: camera scene, map, drones, system bars |
| `src/components/Shell.tsx` | Test sidebar and standalone device app frame |

Stack: Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS v4, lucide-react icons. Black, white and grey only.

## Credits

Drone photos come from Wikimedia Commons, cropped and resized for the app. CC BY-SA 4.0 adaptations are shared under the same licence.

| Drone | Photo | Licence |
|---|---|---|
| DJI Mavic 4 Pro | [C.Stadler/Bwag](https://commons.wikimedia.org/wiki/File:DJI_-_Drohne_Mavic_4_Pro.JPG) | CC BY-SA 4.0 |
| Antigravity A1 | [ZLEA](https://commons.wikimedia.org/wiki/File:Antigravity_DE001_A1_(1-17-2026).jpg) | CC BY-SA 4.0 |
| Parrot ANAFI Ai | [ZLEA](https://commons.wikimedia.org/wiki/File:Parrot_PF728330_ANAFI_Ai_(FA3KP379LP)_(2-25-2024).jpg) | CC BY-SA 4.0 |
| Skydio X10 | [Alexander Kubitza](https://commons.wikimedia.org/wiki/File:Skydio_X10_in_flight.jpg) | Public domain |
| Autel EVO Max 4T | Drawn render (no free-licence photo found) | — |

Maps: © OpenStreetMap contributors · OpenFreeMap. Satellite imagery © Esri, Maxar, Earthstar Geographics. Map engine: MapLibre GL.
Brand and product names belong to their owners. Skyhand is not affiliated with any drone maker.
