import SwiftUI
import MapKit

/// Flights (reference "Missions"): rows with drone photo, status, route track with a diamond, from/to,
/// timing. Detail: route map with telemetry tiles (ALT, SPD, HDG, PWR) and actions.
struct FlightsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    @State private var selection: String?

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
                    if let f = model.flights.first(where: { $0.id == id }) { FlightDetail(flight: f) }
                }
            }
        }
    }

    @ViewBuilder private var detail: some View {
        if let id = selection, let f = model.flights.first(where: { $0.id == id }) {
            FlightDetail(flight: f)
        } else {
            ContentUnavailableView("Choose a flight", systemImage: "point.topleft.down.to.point.bottomright.curvepath", description: Text("Its route, height and timing show here."))
                .background { CanvasBackground() }
        }
    }

    private var list: some View {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(model.flights) { f in
                        Button { selection = f.id } label: { FlightRow(flight: f, selected: selection == f.id) }
                            .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
                .card()
                .padding(.horizontal, 16).padding(.bottom, 24)
            }
            .background { CanvasBackground() }
            .navigationTitle("Flights")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button {} label: { Image(systemName: "magnifyingglass") }.accessibilityLabel("Search flights") }
            }
    }
}

struct FlightRow: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var flight: Flight
    var selected: Bool
    var body: some View {
        let d = model.drone(flight.droneID)
        HStack(alignment: .top, spacing: 14) {
            if let d { DroneImage(brand: d.brand).frame(width: 84, height: 56).padding(.top, 6) }
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(flight.id).font(.headline.weight(.regular).monospacedDigit())
                    Image(systemName: flight.status == .live ? "arrow.up.right" : "checkmark").font(.caption).opacity(0.5)
                    Spacer()
                    Image(systemName: "ellipsis").font(.footnote).opacity(0.4)
                }
                StatusLabel(text: flight.status.rawValue, color: flight.status == .live ? p.ok : flight.status == .returned ? p.danger : p.ink3)
                RouteTrack(progress: flight.progress, color: selected ? p.onSelected : p.ink)
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(flight.from).font(.caption)
                        Text(flight.started).font(.caption).opacity(0.55)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(flight.to).font(.caption)
                        Text(flight.delta ?? flight.duration).font(.caption)
                            .foregroundStyle(flight.status == .returned ? p.danger : flight.status == .live ? p.ok : (selected ? p.onSelected.opacity(0.6) : p.ink2))
                    }
                }
            }
        }
        .padding(14)
        .modifier(SelectedRow(selected: selected))
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }
}

private struct SelectedRow: ViewModifier {
    @Environment(\.palette) private var p
    var selected: Bool
    func body(content: Content) -> some View {
        if selected { content.background(p.selected, in: RoundedRectangle(cornerRadius: 12, style: .continuous)).foregroundStyle(p.onSelected).padding(4) }
        else { content.padding(4) }
    }
}

struct FlightDetail: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var flight: Flight
    var body: some View {
        let d = model.drone(flight.droneID)
        let sim = model.sim(flight.droneID)
        let live = flight.status == .live
        TwoPane {
                OpsMap(pitch: 0, distance: 1800, showsDronePhotos: false, focusDroneID: flight.droneID)
                    .frame(height: 340)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(alignment: .bottomLeading) {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack { Text(flight.id).font(.headline.weight(.regular)); Spacer(); Image(systemName: "arrow.up.right").font(.caption) }
                            StatusLabel(text: flight.status.rawValue, color: live ? p.ok : p.ink3)
                            HStack(spacing: 8) {
                                LoadBar(value: Double(live ? Int(sim.height) : flight.maxHeight), max: 120)
                                Text("\(live ? Int(sim.height) : flight.maxHeight) /120 m").font(.caption.monospacedDigit()).opacity(0.7).fixedSize()
                            }
                            Text("Distance:  \(String(format: "%.1f", flight.distanceKm)) km").font(.footnote)
                            Text("Time:  \(flight.duration)").font(.footnote)
                        }
                        .padding(14).frame(width: 230)
                        .background(HUD.ink.opacity(0.92), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .foregroundStyle(.white)
                        .padding(12)
                    }
            } right: {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                    StatTile(label: "ALT", value: "\(live ? Int(sim.height) : flight.maxHeight)", unit: "m", onCard: false)
                    StatTile(label: "SPD", value: "\(live ? Int(sim.speed) : 0)", unit: "km/h", onCard: false)
                    StatTile(label: "HDG", value: "\(Int(sim.heading))", unit: "°", onCard: false)
                    StatTile(label: "PWR", value: "\(d?.battery ?? 0)", unit: "%", onCard: false)
                }
                VStack(spacing: 0) {
                    InfoRow(label: "Drone", value: d.map { "\($0.nickname) · \($0.model)" } ?? "—")
                    InfoRow(label: "Started", value: flight.started)
                    InfoRow(label: "From", value: flight.from)
                    InfoRow(label: "To", value: flight.to)
                    InfoRow(label: "Max height", value: "\(flight.maxHeight) m", divider: false)
                }
                .padding(.horizontal, 16).card()
                VStack(spacing: 10) {
                    if live {
                        WideButton(title: "Open live view", systemImage: "play.rectangle", kind: .primary) { model.flyingDroneID = flight.droneID }
                        WideButton(title: "Return home", systemImage: "house", kind: .destructive) { model.sims[flight.droneID]?.phase = .returning }
                    } else {
                        WideButton(title: "Share flight", systemImage: "square.and.arrow.up") {}
                        WideButton(title: "Fly this route again", systemImage: "arrow.clockwise") { model.preflightDroneID = flight.droneID }
                    }
                }
            }
        .background { CanvasBackground() }
        .navigationTitle(flight.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
