# Handoff: Skyhand creative design (branch `creative-design`)

Written 2026-11-16 so the work can continue in a new Claude session.

## Goal
Skyhand is a concept drone app by Artonest, not a real product. The user's main device is **iPhone Duo**, and there is no Duo simulator in Xcode 27, so the **web prototype is the way to preview it**. The design is the SwiftUI / iOS style (study of Dribbble "Air Dropper", Phenomenon Studio; no artwork copied) in three versions: **V1 Light, V2 Dark, V3 Map**. Branch rule: creative work goes only to `creative-design`; standard work to `standard-design`; never `main`.

Latest request: make the design match the native app **on all devices** (iPhone, iPad, iPhone Duo closed/open, laptop), in all three versions.

## How to run
```bash
cd antigravity-a1/wireframe-app
npm run dev        # Next.js on 127.0.0.1:3999 (private; port 3000 is deliberately closed)
npm run devices    # public proxies: 4001 iPhone, 4002 iPad, 4003 iPhone Duo, 4004 Laptop
```
- Switch version with the V1 / V2 / V3 buttons on the device apps, or `?look=v1|v2|v3`.
- Review shortcut (read once, not saved): `?screen=dashboard|hangar|flights|rules|settings|summary|fly|...&orient=portrait|landscape`.
- Native app: `ios/Skyhand/Skyhand.xcodeproj` (SwiftUI, main flow only). Settings > iPhone Duo preview on an iPad simulator.

## Done (all on `creative-design`)
- `src/app/looks.css`: per-version tokens, iOS text styles, inset cards, segmented control, switch, sheets, dark glass flight HUD, floating glass tab bar.
- New Overview (clay 3D map, KPI tiles, drones/flights/notifications), Drones cards with cut-out photos and black selected card, Flights rows with route tracks. Now also on the **laptop** (its old dark Dashboard and Hangar were replaced; `Watch` and the Fly cockpit stay dark).
- Air Dropper flight HUD on the web Fly screen (`src/components/Hud.tsx`).
- Latest commits: `93577bc` (screens match native, port 3000 closed), `5f4e704` (HUD), `da55db4` (SwiftUI restyle).

## State of the working copy at handoff
- `tsc` and `eslint` pass.
- Ports 3999, 4001 to 4004 answer; 3000 is closed.
- **Uncommitted changes were found that this session did not write:** Fly layout spacing in `src/lib/layout.ts` (insets from rounded corners, shutter spacing), `ui.tsx` (HoldButton ring, VSlider label side), small edits in `Fly.tsx`, `Cockpit.tsx`, `RealMap.tsx`, and several `ios/Skyhand/*.swift` files. They compile; they are included in the snapshot commit. Check with `git show` before building on them.
- This session's own last edits (not yet visually re-checked after the change): laptop uses the shared Overview and Drones screens; `tabH` 50 to 60; desktop bottom reserve for the in-flight banner; the glass tab-bar CSS now only matches the bottom bar.

## Bugs found and fixed this session
- Glass tab-bar CSS also hit the vertical side rail on iPhone landscape and pushed it over the content (fixed: selector now needs `left: 0px` and `bottom: 0px`).
- Flight summary showed raw alert codes (A3, A5); the laptop start card was dark text on a dark card.

## Not finished
1. **Full audit across every device, pose, orientation and version.** An automatic overlap check (hidden iframes, same origin, e.g. `/duo?screen=hangar&orient=portrait&look=v1`, click the Closed/Open button inside) was running when it was interrupted. The first pass (V1 only) flagged: laptop banner over the last card (fixed), open-Duo portrait list under the floating tab bar (fixed by `tabH` 60), iPhone landscape rail (fixed). The V2/V3 pass and a re-run after the fixes have **not** completed.
2. **User-reported problems in "iPhone Duo closed landscape" and "iPhone Duo open portrait"**: never identified. Ask the user for the screen, or screenshot every screen in those two views.
3. Half-open Duo pose and the Duo closed pose were barely looked at.
4. The Watch tab and the Fly cockpit keep their dark command-centre look.
5. Native app: no onboarding, Add a drone or observer flow; V3 and the Fly screen inside the Duo preview not verified.

## Things to know
- The Browser pane in the desktop app tiles screenshots four times when its size is emulated; reset the viewport (`resize_window` preset desktop) before judging a screenshot.
- Maps load slowly here; wait several seconds before a screenshot.
- Never put the user's name or email in outside requests. Free-licence photos only (Autel has none).
- Docs: `20-creative-versions.md` (design notes), `19-iphone-duo-compliance.md` (Duo rules, fold: vertical in landscape, horizontal in portrait, 24 pt band kept clear).
