import SwiftUI

struct RulesView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var body: some View {
        @Bindable var model = model
        let c = model.country
        NavigationStack {
            Screen(title: "Rules", subtitle: c.name) {
                TwoPane {
                    VStack(alignment: .leading, spacing: 14) {
                        Picker("Country", selection: $model.countryID) {
                            ForEach(Mock.countries) { Text($0.name).tag($0.id) }
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        HStack(spacing: 8) {
                            StatTile(label: "Max height", value: "\(c.maxAltitude)", unit: "m")
                            StatTile(label: "Visitors", value: c.canFlyAsVisitor ? "Yes" : "No", unit: "")
                        }
                        if !c.canFlyAsVisitor {
                            Label("Visitors may not be able to fly here. Check before you travel.", systemImage: "exclamationmark.triangle.fill")
                                .font(.footnote).foregroundStyle(p.danger)
                        }
                    }
                    .padding(16).card()
                } right: {
                    VStack(alignment: .leading, spacing: 0) {
                        CardHeader(title: "What applies", meta: c.checked).padding(.bottom, 6)
                        ForEach(Array(c.rules.enumerated()), id: \.offset) { i, r in
                            HStack(alignment: .top, spacing: 12) {
                                Text(String(format: "%02d", i + 1)).font(.caption.monospacedDigit()).foregroundStyle(p.ink3).frame(width: 22, alignment: .leading)
                                Text(r).font(.subheadline).foregroundStyle(p.ink)
                                Spacer(minLength: 0)
                            }
                            .padding(.vertical, 12)
                            if i < c.rules.count - 1 { Rectangle().fill(p.line).frame(height: 1) }
                        }
                        Text("Source: \(c.source). Not legal advice.").font(.caption).foregroundStyle(p.ink2).padding(.top, 10)
                    }
                    .padding(16).card()
                }
            }
        }
    }
}

struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Picker("Design version", selection: $model.look) {
                        ForEach(Look.allCases) { Text($0.short).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text(model.look.title + " · " + model.look.detail).font(.footnote).foregroundStyle(p.ink2)
                    Toggle("iPhone Duo preview", isOn: $model.duoPreview)
                } header: { Text("Creative design") } footer: {
                    Text("Shows the app at iPhone Duo sizes (closed, open, half open) with the fold. Use it on iPad until an iPhone Duo simulator is available.")
                }
                Section("Flying") {
                    Picker("Country", selection: $model.countryID) { ForEach(Mock.countries) { Text($0.name).tag($0.id) } }
                    Toggle("Left-handed controls", isOn: $model.leftHanded)
                    LabeledContent("Return height", value: "60 m")
                    LabeledContent("Hold to confirm", value: "1 second")
                }
                Section("About") {
                    LabeledContent("Skyhand", value: "Concept by Artonest")
                    Text("Not a real product. Not affiliated with DJI, Antigravity, Parrot, Autel or Skydio. All drone data, telemetry and maps of drone positions are mock. Country rules are not legal advice.")
                        .font(.footnote).foregroundStyle(p.ink2)
                }
                Section("Photo credits") {
                    ForEach(Brand.allCases) { b in
                        LabeledContent(b.name, value: b.photoCredit ?? "Drawn (no free photo)")
                    }
                    Text("Wikimedia Commons photos, cut out for the app. CC BY-SA 4.0 adaptations are shared under the same licence. Map data © Apple and its data providers.")
                        .font(.footnote).foregroundStyle(p.ink2)
                }
            }
            .scrollContentBackground(.hidden)
            .background { CanvasBackground() }
            .navigationTitle("Settings")
        }
    }
}

/// Pre-flight check as a standard sheet (medium/large detents).
struct PreflightSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    @Environment(\.dismiss) private var dismiss
    var droneID: String
    var body: some View {
        if let d = model.drone(droneID) {
            let checks = model.readiness(d)
            let passed = checks.filter(\.1).count
            NavigationStack {
                List {
                    Section {
                        HStack(spacing: 14) {
                            DroneImage(brand: d.brand).frame(width: 80, height: 50)
                            VStack(alignment: .leading, spacing: 6) {
                                Text(d.nickname).font(.headline)
                                HStack(spacing: 8) {
                                    ProgressView(value: Double(passed), total: Double(checks.count)).tint(passed == checks.count ? p.ok : p.danger)
                                    Text("\(passed) /\(checks.count)").font(.caption.monospacedDigit()).foregroundStyle(p.ink2).fixedSize()
                                }
                                Text(passed == checks.count ? "Ready to fly" : "Fix \(checks.count - passed) item\(checks.count - passed == 1 ? "" : "s") first")
                                    .font(.footnote).foregroundStyle(passed == checks.count ? p.ok : p.danger)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    Section("Checks · \(model.country.name)") {
                        ForEach(checks, id: \.0) { c in
                            LabeledContent {
                                Text(c.2).foregroundStyle(c.1 ? p.ink2 : p.danger)
                            } label: {
                                Label {
                                    Text(c.0).foregroundStyle(p.ink)
                                } icon: {
                                    Image(systemName: c.1 ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle(c.1 ? p.ok : p.danger)
                                }
                            }
                            .font(.subheadline)
                        }
                    }
                }
                .navigationTitle("Before you fly")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Fly") {
                            model.preflightDroneID = nil
                            Task { try? await Task.sleep(for: .milliseconds(350)); model.flyingDroneID = droneID }
                        }
                        .disabled(passed < checks.count)
                    }
                }
            }
        }
    }
}
