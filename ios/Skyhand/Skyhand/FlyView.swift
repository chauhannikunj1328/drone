import SwiftUI
import MapKit

/// Fly screen (reference landscape HUD): full-bleed live view, telemetry in the top bar, tick ladders on
/// both edges, horizon and compass gauges, a diamond marker for the nearest landing spot.
/// Skyhand adds the safety cluster (Pause, Return, Land) and two on-screen sticks.
/// The "live view" is a simulated drone camera made from Apple Maps 3D satellite imagery (concept only).
/// Regular width + landscape (iPhone Duo open): live view on one side of the fold, map and telemetry on the other.
struct FlyView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    @Environment(\.horizontalSizeClass) private var hSize
    @Environment(\.duoHarness) private var harness
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var wasLandscape = false
    var droneID: String

    @State private var camera: MapCameraPosition = .automatic
    @State private var leftStick: CGPoint = .zero
    @State private var rightStick: CGPoint = .zero
    @State private var confirmLeave = false
    private let clock = Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()

    var body: some View {
        GeometryReader { g in
            let split = hSize == .regular && g.size.width > g.size.height && g.size.width > 700
            Group {
                if split {
                    HStack(spacing: 24) {   // 24 pt gap keeps both panes clear of the Duo fold
                        live.frame(width: (g.size.width - 24) / 2)
                        sidePanel.frame(width: (g.size.width - 24) / 2)
                    }
                } else {
                    live
                }
            }
        }
        .background(Color.black)
        .ignoresSafeArea(edges: .vertical)
        .statusBarHidden()
        .persistentSystemOverlays(.hidden)
        .onAppear { recenter(animated: false); rotate(.landscape) }
        .onDisappear { rotate(.portrait) }
        .onReceive(clock) { _ in applySticks(); recenter(animated: true) }
        .confirmationDialog("Leave the flight screen?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave · drone keeps hovering") { model.sims[droneID]?.phase = .paused; close() }
            Button("Return home and leave", role: .destructive) { model.sims[droneID]?.phase = .returning; close() }
        } message: { Text("The drone is in the air. Pause or return before you leave.") }
    }

    // MARK: Live view + HUD

    private var drone: Drone? { model.drone(droneID) }
    private var sim: LiveSim { model.sim(droneID) }
    private var flying: Bool { sim.phase != .grounded }
    private var monitorOnly: Bool { drone?.brand == .skydio }

    private var live: some View {
        ZStack {
            Map(position: $camera, interactionModes: []) {}
                .mapStyle(.imagery(elevation: .realistic))
                .allowsHitTesting(false)
            LinearGradient(colors: [.black.opacity(0.45), .clear], startPoint: .top, endPoint: .center).allowsHitTesting(false)
            TickLadder().frame(width: 40).frame(maxWidth: .infinity, alignment: .leading).padding(.leading, 56).padding(.vertical, 90).allowsHitTesting(false)
            TickLadder(trailing: true).frame(width: 40).frame(maxWidth: .infinity, alignment: .trailing).padding(.trailing, 56).padding(.vertical, 90).allowsHitTesting(false)
            Crosshair().allowsHitTesting(false)
            LandingMarker(distance: nearestLandingDistance).offset(x: -150, y: -70)
            VStack(spacing: 0) {
                topBar
                Spacer()
                bottomRow
            }
            .padding(.horizontal, 44).padding(.top, 20).padding(.bottom, 16)
            safetyCluster.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: model.leftHanded ? .trailing : .leading).padding(.horizontal, 44).padding(.top, 80)
            cameraButtons.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: model.leftHanded ? .leading : .trailing).padding(.horizontal, 44).padding(.top, 80)
            if !flying && !monitorOnly { takeOff }
        }
        .clipped()
        .environment(\.colorScheme, .dark)
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)   // fixed-size HUD controls: cap text growth
    }

    private var topBar: some View {
        HStack(spacing: 20) {
            Button {
                if flying && sim.phase != .paused { confirmLeave = true } else { close() }
            } label: { Image(systemName: "chevron.left").font(.title3.weight(.semibold)).frame(width: 44, height: 44) }
            .accessibilityLabel("Back")
            .keyboardShortcut(.cancelAction)   // Esc on Mac and iPad keyboards
            .hoverEffect(.highlight)
            Text(drone?.nickname ?? "").font(.title3)
            if monitorOnly { Text("Monitor only").font(.caption).padding(.horizontal, 8).padding(.vertical, 3).background(.white.opacity(0.18), in: Capsule()) }
            Spacer()
            Label("\(Int(sim.height)) m", systemImage: "arrow.up").accessibilityLabel("Height \(Int(sim.height)) metres")
            Label("\(Int(sim.speed)) km/h", systemImage: "gauge.with.dots.needle.33percent").accessibilityLabel("Speed \(Int(sim.speed)) kilometres an hour")
            Label("\(Int(sim.distance)) m", systemImage: "point.topleft.down.to.point.bottomright.curvepath").accessibilityLabel("Distance \(Int(sim.distance)) metres")
            BatteryBars(percent: drone?.battery ?? 0)
        }
        .font(.subheadline.monospacedDigit())
        .labelStyle(.titleAndIcon)
        .foregroundStyle(.white)
        .shadow(color: .black.opacity(0.4), radius: 3)
    }

    private var bottomRow: some View {
        HStack(alignment: .bottom, spacing: 16) {
            if monitorOnly {
                Label("Skydio missions start from the Skydio app. Here you can watch, pause or bring it home.", systemImage: "eye")
                    .font(.footnote).padding(12).frame(maxWidth: 320, alignment: .leading)
                    .glass(in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                Stick(value: $leftStick, label: "Climb · turn", enabled: flying)
            }
            Spacer()
            HorizonGauge(tilt: sim.tilt).frame(width: 84, height: 84)
            CompassGauge(heading: sim.heading).frame(width: 84, height: 84)
            Spacer()
            if !monitorOnly { Stick(value: $rightStick, label: "Move", enabled: flying) }
        }
    }

    private var safetyCluster: some View {
        GlassGroup(spacing: 10) { safetyStack }
    }

    private var safetyStack: some View {
        VStack(spacing: 10) {
            Button {
                let paused = sim.phase == .paused
                model.sims[droneID]?.phase = paused ? .flying : .paused
                if !paused { model.sims[droneID]?.speed = 0 }
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            } label: {
                VStack(spacing: 2) {
                    Image(systemName: sim.phase == .paused ? "play.fill" : "pause.fill").font(.title2)
                    Text(sim.phase == .paused ? "Resume" : "Pause").font(.caption2.weight(.semibold))
                }
                .frame(width: 64, height: 64).foregroundStyle(.white)
                .background(p.danger, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .disabled(!flying)
            .opacity(flying ? 1 : 0.45)
            .accessibilityHint("Stops the drone where it is")
            .keyboardShortcut(.space, modifiers: [])
            .hoverEffect(.highlight)
            HoldButton(action: { model.sims[droneID]?.phase = .returning }) { hudKey("house", "Return") }
                .disabled(!flying).opacity(flying ? 1 : 0.45)
            HoldButton(action: { model.sims[droneID]?.phase = .landing }) { hudKey("arrow.down.to.line", "Land") }
                .disabled(!flying).opacity(flying ? 1 : 0.45)
        }
    }

    private func hudKey(_ icon: String, _ title: String) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon).font(.body.weight(.semibold))
            Text(title).font(.caption2.weight(.semibold))
            Text("Hold").font(.caption2).opacity(0.7)
        }
        .frame(width: 56, height: 56).foregroundStyle(.white)
        .glass(in: RoundedRectangle(cornerRadius: 14, style: .continuous), interactive: true)
        .hoverEffect(.highlight)
        .accessibilityLabel(title)
    }

    private var cameraButtons: some View {
        VStack(spacing: 14) {
            Button { model.sims[droneID]?.recording.toggle() } label: {
                ZStack {
                    Circle().stroke(.white, lineWidth: 3).frame(width: 52, height: 52)
                    RoundedRectangle(cornerRadius: sim.recording ? 4 : 20).fill(p.danger).frame(width: sim.recording ? 18 : 38, height: sim.recording ? 18 : 38)
                }
            }
            .accessibilityLabel(sim.recording ? "Stop recording" : "Record video")
            Button { model.sims[droneID]?.photos += 1; UIImpactFeedbackGenerator(style: .light).impactOccurred() } label: {
                ZStack {
                    Circle().stroke(.white, lineWidth: 3).frame(width: 52, height: 52)
                    Circle().fill(.white).frame(width: 40, height: 40)
                }
            }
            .accessibilityLabel("Take photo")
            Text("\(sim.photos) photos").font(.caption2.monospacedDigit()).foregroundStyle(.white).shadow(radius: 2)
        }
        .disabled(!flying)
        .opacity(flying ? 1 : 0.45)
    }

    private var takeOff: some View {
        VStack(spacing: 10) {
            Text("Ready to fly").font(.headline).foregroundStyle(.white)
            HoldButton(action: {
                model.sims[droneID]?.phase = .takingOff
                model.sims[droneID]?.speed = 0
            }) {
                Label("Take off", systemImage: "arrow.up.to.line").font(.headline)
                    .padding(.horizontal, 28).frame(height: 52)
                    .foregroundStyle(.black).background(.white, in: Capsule())
            }
            Text("Press and hold for 1 second").font(.caption).foregroundStyle(.white.opacity(0.8))
        }
        .padding(20)
        .glass(in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    // MARK: Side panel (regular width)

    private var sidePanel: some View {
        VStack(spacing: 12) {
            OpsMap(pitch: 0, distance: 1300, showsDronePhotos: false, focusDroneID: droneID)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                StatTile(label: "ALT", value: "\(Int(sim.height))", unit: "m", onCard: false)
                StatTile(label: "SPD", value: "\(Int(sim.speed))", unit: "km/h", onCard: false)
                StatTile(label: "DIST", value: "\(Int(sim.distance))", unit: "m", onCard: false)
                StatTile(label: "PWR", value: "\(drone?.battery ?? 0)", unit: "%", onCard: false)
            }
            VStack(spacing: 0) {
                InfoRow(label: "Nearest landing spot", value: "\(model.place.landing[0].name) · \(nearestLandingDistance) m")
                InfoRow(label: "Return to", value: "Home point · \(model.place.name)", divider: false)
            }
            .padding(.horizontal, 16).card()
        }
        .padding(16)
        .background { CanvasBackground() }
        .environment(\.colorScheme, p.scheme)
    }

    // MARK: Logic

    private var nearestLandingDistance: Int {
        let l = model.place.landing[0]
        return Int((l.east * l.east + l.north * l.north).squareRoot() + sim.distance * 0.3)
    }

    private func applySticks() {
        guard var s = model.sims[droneID], s.phase == .flying, !monitorOnly else { return }
        let maxH = Double(model.country.maxAltitude)
        s.height = min(maxH, max(2, s.height - Double(leftStick.y) * 1.2))
        s.heading = (s.heading + Double(leftStick.x) * 4 + 360).truncatingRemainder(dividingBy: 360)
        s.speed = max(0, min(Double(drone?.maxSpeed ?? 50), Double(-rightStick.y) * 45))
        model.sims[droneID] = s
    }

    private func recenter(animated: Bool) {
        guard let d = drone else { return }
        let pos = model.position(of: d)
        let cam = MapCamera(centerCoordinate: pos, distance: 220 + sim.height * 5, heading: sim.heading, pitch: 72)
        if animated && !reduceMotion { withAnimation(.linear(duration: 0.25)) { camera = .camera(cam) } } else { camera = .camera(cam) }
    }

    private func close() { model.flyingDroneID = nil }

    private func rotate(_ mask: UIInterfaceOrientationMask) {
        if let h = harness {   // iPhone Duo preview: turn the preview device instead of the iPad
            if mask == .landscape { wasLandscape = h.landscape; withAnimation(.snappy) { h.landscape = true } }
            else { withAnimation(.snappy) { h.landscape = wasLandscape } }
            return
        }
        if mask == .landscape { AppDelegate.lockOrientation(.landscape, rotateTo: .landscapeRight) }
        else { AppDelegate.lockOrientation(.all, rotateTo: .portrait) }
    }
}

// MARK: - HUD parts

struct TickLadder: View {
    var trailing = false
    var body: some View {
        Canvas { ctx, size in
            let n = 22
            for i in 0...n {
                let y = size.height * CGFloat(i) / CGFloat(n)
                let long = i % 5 == 0
                let w: CGFloat = long ? 26 : 14
                let x: CGFloat = trailing ? size.width - w : 0
                ctx.fill(Path(CGRect(x: x, y: y, width: w, height: 1)), with: .color(.white.opacity(long ? 0.8 : 0.5)))
            }
        }
    }
}

struct Crosshair: View {
    var body: some View {
        ZStack {
            Path { p in p.move(to: .init(x: 0, y: 30)); p.addLine(to: .init(x: 60, y: 30)) }.stroke(.white.opacity(0.8), style: .init(lineWidth: 1, dash: [4, 4]))
            Path { p in p.move(to: .init(x: 30, y: 0)); p.addLine(to: .init(x: 30, y: 60)) }.stroke(.white.opacity(0.8), style: .init(lineWidth: 1, dash: [4, 4]))
        }
        .frame(width: 60, height: 60)
    }
}

struct LandingMarker: View {
    @Environment(\.palette) private var p
    var distance: Int
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "arrow.down.to.line").font(.footnote.weight(.bold)).foregroundStyle(p.live)
                .frame(width: 30, height: 30)
                .background(Rectangle().fill(.white).frame(width: 30, height: 30).rotationEffect(.degrees(45)))
            Text("Land \(distance) m").font(.caption.weight(.medium)).foregroundStyle(.white).shadow(radius: 2)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Nearest landing spot \(distance) metres")
    }
}

struct HorizonGauge: View {
    var tilt: Double
    var body: some View {
        ZStack {
            Color.clear.glass(in: Circle())
            VStack(spacing: 5) { ForEach(0..<7) { _ in Rectangle().fill(.white.opacity(0.5)).frame(width: 14, height: 1) } }
            Path { p in
                p.move(to: .init(x: 0, y: 42)); p.addLine(to: .init(x: 28, y: 42)); p.addLine(to: .init(x: 34, y: 36)); p.addLine(to: .init(x: 40, y: 48))
                p.addLine(to: .init(x: 46, y: 38)); p.addLine(to: .init(x: 52, y: 42)); p.addLine(to: .init(x: 84, y: 42))
            }
            .stroke(.white, lineWidth: 1.5).frame(width: 84, height: 84)
            .rotationEffect(.degrees(tilt))
            Rectangle().fill(HUD.red).frame(height: 1).rotationEffect(.degrees(tilt))
        }
        .clipShape(Circle())
        .overlay(alignment: .leading) { Text("\(Int(tilt))°").font(.caption2.monospacedDigit()).foregroundStyle(.white).offset(x: -24) }
        .accessibilityLabel("Horizon, tilt \(Int(tilt)) degrees")
    }
}

struct CompassGauge: View {
    var heading: Double
    var body: some View {
        ZStack {
            Color.clear.glass(in: Circle())
            Path { p in p.move(to: .init(x: 42, y: 42)); p.addArc(center: .init(x: 42, y: 42), radius: 40, startAngle: .degrees(-115), endAngle: .degrees(-65), clockwise: false); p.closeSubpath() }
                .fill(LinearGradient(colors: [HUD.indigo.opacity(0.8), .clear], startPoint: .top, endPoint: .center))
                .frame(width: 84, height: 84)
            ZStack {
                ForEach(Array(["N", "E", "S", "W"].enumerated()), id: \.offset) { i, t in
                    Text(t).font(.caption2.weight(.semibold)).foregroundStyle(t == "N" ? HUD.red : .white)
                        .offset(y: -32).rotationEffect(.degrees(Double(i) * 90))
                }
            }
            .rotationEffect(.degrees(-heading))
            Rectangle().fill(.white).frame(width: 7, height: 7).rotationEffect(.degrees(45))
            Text("\(Int(heading))°").font(.caption2.monospacedDigit()).foregroundStyle(.white).offset(y: 16)
        }
        .accessibilityLabel("Heading \(Int(heading)) degrees")
    }
}

/// On-screen stick. Drag moves the knob; release springs back to centre (like a real remote's sticks).
struct Stick: View {
    @Binding var value: CGPoint
    var label: String
    var enabled: Bool
    private let size: CGFloat = 128
    var body: some View {
        ZStack {
            Color.clear.glass(in: Circle())
            Circle().stroke(.white.opacity(0.35), lineWidth: 1).padding(22)
            Path { p in p.move(to: .init(x: size / 2, y: 10)); p.addLine(to: .init(x: size / 2, y: size - 10)); p.move(to: .init(x: 10, y: size / 2)); p.addLine(to: .init(x: size - 10, y: size / 2)) }
                .stroke(.white.opacity(0.25), lineWidth: 1)
            Circle().fill(.white).frame(width: 46, height: 46).shadow(color: .black.opacity(0.35), radius: 6, y: 3)
                .offset(x: value.x * (size / 2 - 23), y: value.y * (size / 2 - 23))
        }
        .frame(width: size, height: size)
        .overlay(alignment: .bottom) { Text(enabled ? label : "Locked").font(.caption2).foregroundStyle(.white.opacity(0.8)).offset(y: 16) }
        .opacity(enabled ? 1 : 0.5)
        .gesture(DragGesture(minimumDistance: 0)
            .onChanged { g in
                guard enabled else { return }
                let r = size / 2 - 23
                var x = g.translation.width / r, y = g.translation.height / r
                let len = (x * x + y * y).squareRoot()
                if len > 1 { x /= len; y /= len }
                value = CGPoint(x: x, y: y)
            }
            .onEnded { _ in withAnimation(.spring(duration: 0.2)) { value = .zero } })
        .accessibilityElement()
        .accessibilityLabel("\(label) stick")
        .accessibilityAdjustableAction { dir in
            value = CGPoint(x: 0, y: dir == .increment ? -0.6 : 0.6)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { value = .zero }
        }
    }
}
