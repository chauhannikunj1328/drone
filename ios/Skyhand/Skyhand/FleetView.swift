import SwiftUI

/// Drones (reference "Drone Fleet"): filter chips with counts, drone cards, detail with stats and actions.
/// NavigationSplitView = list | detail on regular width (iPhone Duo open: one side of the fold each),
/// a normal push stack on compact width.
struct FleetView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    enum Filter: String, CaseIterable { case all = "All", ready = "Ready", air = "In flight", notReady = "Not ready", offline = "Offline" }
    @State private var filter: Filter = .all
    @State private var selection: String?
    @State private var search = ""

    private func matches(_ d: Drone) -> Bool {
        let f: Bool
        switch filter {
        case .all: f = true
        case .ready: f = d.state == .ready
        case .air: f = model.sim(d.id).phase != .grounded
        case .notReady: f = d.state == .notReady || d.state == .limited
        case .offline: f = d.state == .offline
        }
        return f && (search.isEmpty || d.nickname.localizedCaseInsensitiveContains(search) || d.model.localizedCaseInsensitiveContains(search))
    }
    @Environment(\.horizontalSizeClass) private var size

    var body: some View {
        if size == .regular {
            // List | detail, exactly one half each, so the split sits on the iPhone Duo fold.
            GeometryReader { g in
                HStack(spacing: 0) {
                    NavigationStack { list }.frame(width: g.size.width / 2)
                    Rectangle().fill(.quaternary).frame(width: 1)
                    NavigationStack { detail }.frame(maxWidth: .infinity)
                }
            }
        } else {
            NavigationStack {
                list.navigationDestination(item: $selection) { id in
                    if let d = model.drone(id) { DroneDetail(drone: d) }
                }
            }
        }
    }

    @ViewBuilder private var detail: some View {
        if let id = selection, let d = model.drone(id) {
            DroneDetail(drone: d)
        } else {
            ContentUnavailableView("Choose a drone", systemImage: "airplane", description: Text("Its battery, readiness and actions show here."))
                .background { CanvasBackground() }
        }
    }

    private var list: some View {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(Filter.allCases, id: \.self) { f in
                                CountChip(title: f.rawValue, count: countFor(f), on: filter == f) { filter = f }
                            }
                        }
                    }
                    ForEach(model.drones.filter(matches)) { d in
                        Button { selection = d.id } label: { DroneCard(drone: d, selected: selection == d.id) }
                            .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16).padding(.bottom, 24)
            }
            .background { CanvasBackground() }
            .navigationTitle("Drones")
            .searchable(text: $search, prompt: "Search drones")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {} label: { Image(systemName: "plus") }.accessibilityLabel("Add a drone")
                }
            }
    }

    private func countFor(_ f: Filter) -> Int {
        model.drones.filter { d in
            switch f {
            case .all: true
            case .ready: d.state == .ready
            case .air: model.sim(d.id).phase != .grounded
            case .notReady: d.state == .notReady || d.state == .limited
            case .offline: d.state == .offline
            }
        }.count
    }
}

/// Fleet card: photo left; name, model, status top right; battery-style load bar; battery bars, signal, storage.
struct DroneCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var drone: Drone
    var selected = false

    var body: some View {
        let sim = model.sim(drone.id)
        let flying = sim.phase != .grounded
        HStack(spacing: 14) {
            DroneImage(brand: drone.brand).frame(width: 96, height: 64)
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(drone.nickname).font(.headline.weight(.regular))
                        Text(drone.model).font(.caption).opacity(0.6)
                    }
                    Spacer()
                    StatusLabel(text: flying ? "Flying" : drone.state.rawValue, color: flying ? p.live : drone.state.color(p))
                }
                HStack(spacing: 8) {
                    LoadBar(value: flying ? sim.height : 0, max: Double(drone.maxAltitude))
                    Text(flying ? "\(Int(sim.height)) /\(drone.maxAltitude) m" : "0 /\(drone.maxAltitude) m")
                        .font(.caption.monospacedDigit()).opacity(0.7).fixedSize()
                }
                HStack(spacing: 14) {
                    BatteryBars(percent: drone.battery)
                    Label(drone.state == .offline ? "No link" : drone.signal, systemImage: "wifi").font(.footnote)
                    Label("2/4", systemImage: "sdcard").font(.footnote).accessibilityLabel("Storage 2 of 4 slots")
                }
                .labelStyle(.titleAndIcon)
            }
        }
        .padding(14)
        .card(selected: selected)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }
}

struct DroneDetail: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var drone: Drone

    var body: some View {
        let sim = model.sim(drone.id)
        let flying = sim.phase != .grounded
        TwoPane {
                VStack(spacing: 8) {
                    HStack {
                        BatteryBars(percent: drone.battery)
                        Spacer()
                        Label("2/4", systemImage: "sdcard").font(.footnote)
                        Label(drone.signal, systemImage: "wifi").font(.footnote)
                    }
                    ZStack {
                        Ellipse().stroke(p.ink3.opacity(0.4), lineWidth: 1).frame(height: 44).offset(y: 70)
                        DroneImage(brand: drone.brand).frame(height: 170).padding(.horizontal, 12)
                    }
                    .frame(height: 220)
                    if let credit = drone.brand.photoCredit {
                        Text("Photo: \(credit) · cut-out").font(.caption2).foregroundStyle(p.ink3)
                    }
                }
                .padding(16).card()
            } right: {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(drone.nickname).font(.title2)
                        Spacer()
                        StatusLabel(text: flying ? "In flight" : drone.state.rawValue, color: flying ? p.live : drone.state.color(p))
                    }
                    Text("\(drone.model) · Serial \(drone.serial)").font(.subheadline).foregroundStyle(p.ink2)
                    if let r = drone.reason { Label(r, systemImage: "info.circle").font(.footnote).foregroundStyle(p.ink2) }
                    HStack(spacing: 8) {
                        StatTile(label: "Max altitude", value: "\(model.country.maxAltitude)", unit: "m")
                        StatTile(label: "Max speed", value: "\(drone.maxSpeed)", unit: "km/h")
                        StatTile(label: "Flight time", value: "\(drone.flightTime)", unit: "min")
                    }
                    VStack(spacing: 0) {
                        InfoRow(label: "Home point", value: model.place.name)
                        InfoRow(label: "Flight hours", value: "\(drone.flightHours) h")
                        InfoRow(label: "Weight", value: "\(drone.weightGrams) g")
                        InfoRow(label: "Firmware", value: drone.firmwareOK ? "Up to date" : "Update needed", valueColor: drone.firmwareOK ? nil : p.warn)
                        InfoRow(label: "Registration", value: drone.registrationDaysLeft.map { "Valid  \($0)d left" } ?? "Not needed under 250 g",
                                valueColor: drone.registrationDaysLeft == nil ? nil : p.ok, divider: false)
                    }
                    VStack(spacing: 10) {
                        if flying {
                            WideButton(title: drone.state == .limited || drone.brand == .skydio ? "Watch live" : "Open live view", systemImage: "play.rectangle", kind: .primary) { model.flyingDroneID = drone.id }
                            WideButton(title: "Return home", systemImage: "house", kind: .destructive) {
                                model.sims[drone.id]?.phase = .returning
                            }
                        } else {
                            WideButton(title: "Pre-flight check", systemImage: "checklist") { model.preflightDroneID = drone.id }
                            WideButton(title: "Fly \(drone.nickname)", systemImage: "paperplane", kind: .primary) { model.preflightDroneID = drone.id }
                                .disabled(drone.state == .offline)
                        }
                    }
                    .padding(.top, 6)
                }
                .padding(16).card()
            }
        .background { CanvasBackground() }
        .navigationTitle(drone.nickname)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Rename", systemImage: "pencil") {}
                    Button("Remove from hangar", systemImage: "trash", role: .destructive) {}
                } label: { Image(systemName: "ellipsis") }
                .accessibilityLabel("More")
            }
        }
    }
}
