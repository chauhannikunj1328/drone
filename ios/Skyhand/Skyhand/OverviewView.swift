import SwiftUI

/// Overview (reference "Overview" screen): live 3D map with drones, KPI tiles, drones, live flights, notifications.
struct OverviewView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    @Binding var tab: AppTab

    var body: some View {
        NavigationStack {
            Screen(title: "Overview", subtitle: "\(model.place.name), \(model.place.city)") {
                TwoPane {
                    OpsMap()
                        .frame(height: 360)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(alignment: .bottomLeading) {
                            Label("Example location · drone rules not checked", systemImage: "info.circle")
                                .font(.caption2).padding(.horizontal, 8).padding(.vertical, 4)
                                .background(.regularMaterial, in: Capsule()).padding(10)
                        }
                    kpis
                } right: {
                    dronesCard
                    flightsCard
                    notificationsCard
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { tab = .fleet } label: { Image(systemName: "plus") }.accessibilityLabel("Add a drone")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {} label: { Image(systemName: "bell") }.accessibilityLabel("Notifications")
                }
            }
        }
    }

    private var kpis: some View {
        let ready = model.drones.filter { $0.state == .ready }.count
        let air = model.drones.filter { model.sim($0.id).phase != .grounded }.count
        return LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            KPI(label: "Ready to fly", value: "\(ready)", unit: "/\(model.drones.count)")
            KPI(label: "In the air", value: "\(air)", unit: "")
            KPI(label: "Avg. flight time", value: "18.4", unit: "min")
            KPI(label: "Pre-flight pass rate", value: "96.2", unit: "%")
        }
    }

    private var dronesCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            CardHeader(title: "Drones", meta: "\(model.drones.filter { $0.state != .offline }.count) online").padding(.bottom, 8)
            ForEach(model.drones) { d in
                HStack(spacing: 10) {
                    Image(systemName: "airplane").font(.footnote).foregroundStyle(p.ink3).frame(width: 18)
                    Text(d.nickname).font(.subheadline).lineLimit(1).layoutPriority(1)
                    Text(d.model).font(.caption).foregroundStyle(p.ink2).lineLimit(1)
                    Spacer()
                    StatusLabel(text: model.sim(d.id).phase != .grounded ? "Flying" : d.state.rawValue, color: model.sim(d.id).phase != .grounded ? p.live : d.state.color(p))
                }
                .frame(minHeight: 36)
            }
        }
        .padding(16).card()
    }

    private var flightsCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            CardHeader(title: "Flights", meta: "\(model.flights.count) this week").padding(.bottom, 8)
            ForEach(model.flights.prefix(4)) { f in
                HStack(spacing: 10) {
                    Image(systemName: "point.topleft.down.to.point.bottomright.curvepath").font(.footnote).foregroundStyle(p.ink3).frame(width: 18)
                    Text(f.id).font(.subheadline.monospacedDigit())
                    Spacer()
                    Text(f.status == .live ? "In flight" : f.status.rawValue).font(.caption)
                        .foregroundStyle(f.status == .live ? p.live : f.status == .returned ? p.warn : p.ink2)
                }
                .frame(minHeight: 36)
            }
        }
        .padding(16).card()
    }

    private var notificationsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardHeader(title: "Notifications", meta: "Today")
            Note(icon: "checkmark.circle.fill", tint: p.ok, title: "Team finished its orbit pass", sub: "Skydio X10 · monitor only", time: "11:00")
            Note(icon: "exclamationmark.circle.fill", tint: p.danger, title: "360 cam battery below 20%", sub: "Charge before the next flight", time: "10:20")
            Note(icon: "arrow.down.circle.fill", tint: p.ink3, title: "Trail needs an update", sub: "Parrot ANAFI Ai firmware", time: "08:30")
        }
        .padding(16).card()
    }
}

private struct KPI: View {
    @Environment(\.palette) private var p
    var label: String, value: String, unit: String
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(label).font(.caption).foregroundStyle(p.ink2)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value).font(.system(.largeTitle, design: .default).weight(.regular).monospacedDigit()).foregroundStyle(p.ink)
                Text(unit).font(.footnote).foregroundStyle(p.ink2)
            }
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).card()
        .accessibilityElement(children: .combine)
    }
}

private struct Note: View {
    @Environment(\.palette) private var p
    var icon: String, tint: Color, title: String, sub: String, time: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon).font(.title3).foregroundStyle(tint)
                .frame(width: 36, height: 36).background(p.fill, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline).foregroundStyle(p.ink)
                Text(sub).font(.caption).foregroundStyle(p.ink2)
            }
            Spacer(minLength: 8)
            Text(time).font(.caption.monospacedDigit()).foregroundStyle(p.ink3)
        }
        .accessibilityElement(children: .combine)
    }
}
