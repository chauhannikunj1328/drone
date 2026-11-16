import SwiftUI

/// Orientation lock: the Fly screen locks to landscape (HIG allows immersive views to lock orientation).
final class AppDelegate: NSObject, UIApplicationDelegate {
    static var lock: UIInterfaceOrientationMask = .all
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask { Self.lock }

    static func lockOrientation(_ mask: UIInterfaceOrientationMask, rotateTo: UIInterfaceOrientationMask) {
        lock = mask
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first else { return }
        for w in scene.windows { w.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations() }
        scene.requestGeometryUpdate(.iOS(interfaceOrientations: rotateTo)) { _ in }
    }
}

@main
struct SkyhandApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model = AppModel()
    var body: some Scene {
        WindowGroup {
            Group { if model.duoPreview { DuoPreviewView() } else { RootView() } }
                .environment(model)
                .environment(\.palette, Palette.of(model.look))
                .preferredColorScheme(Palette.of(model.look).scheme)
                .tint(Palette.of(model.look).accent)
                #if targetEnvironment(macCatalyst)
                .task {   // Mac: resizable window with a sensible minimum (sidebar + two panes)
                    for case let scene as UIWindowScene in UIApplication.shared.connectedScenes {
                        scene.sizeRestrictions?.minimumSize = CGSize(width: 900, height: 600)
                    }
                }
                #endif
        }
        .commands {   // Keyboard shortcuts: Mac menu bar and iPad keyboard shortcut overlay
            CommandMenu("Go") {
                Button("Overview") { model.tab = .overview }.keyboardShortcut("1")
                Button("Drones") { model.tab = .fleet }.keyboardShortcut("2")
                Button("Flights") { model.tab = .flights }.keyboardShortcut("3")
                Button("Rules") { model.tab = .rules }.keyboardShortcut("4")
                Button("Settings") { model.tab = .settings }.keyboardShortcut("5")
            }
        }
    }
}

enum AppTab: Hashable { case overview, fleet, flights, rules, settings }

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    @Environment(\.duoHarness) private var harness
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if harness != nil { harnessBody } else { deviceBody }
    }

    // Inside the iPhone Duo preview: sheet and Fly open inside the device frame.
    private var harnessBody: some View {
        tabs
            .overlay {
                if let id = model.preflightDroneID {
                    HarnessSheet(close: { model.preflightDroneID = nil }) { PreflightSheet(droneID: id) }
                }
            }
            .overlay { if let id = model.flyingDroneID { FlyView(droneID: id) } }
            .animation(reduceMotion ? nil : .snappy, value: model.preflightDroneID)
            .task { await clock() }
    }

    private func clock() async {
        // Simulation clock for the mock drones (4 steps a second).
        while !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(250))
            model.tick()
        }
    }

    private var tabs: some View {
        // Standard iOS tab bar. On regular width (iPhone Duo open, iPad) it adapts to a sidebar.
        @Bindable var model = model
        return TabView(selection: $model.tab) {
            Tab("Overview", systemImage: "square.grid.2x2", value: AppTab.overview) { OverviewView(tab: $model.tab) }
            Tab("Drones", systemImage: "airplane", value: AppTab.fleet) { FleetView() }
            Tab("Flights", systemImage: "point.topleft.down.to.point.bottomright.curvepath", value: AppTab.flights) { FlightsView() }
            Tab("Rules", systemImage: "checkmark.shield", value: AppTab.rules) { RulesView() }
            Tab("Settings", systemImage: "gearshape", value: AppTab.settings) { SettingsView() }
        }
        .tabViewStyle(.sidebarAdaptable)
    }

    private var deviceBody: some View {
        @Bindable var model = model
        return tabs
        .sheet(item: Binding(get: { model.preflightDroneID.map(IDBox.init) }, set: { model.preflightDroneID = $0?.id })) { box in
            PreflightSheet(droneID: box.id)
                .environment(\.palette, p)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(item: Binding(get: { model.flyingDroneID.map(IDBox.init) }, set: { model.flyingDroneID = $0?.id })) { box in
            FlyView(droneID: box.id).environment(\.palette, p)
        }
        .task { await clock() }
    }
}

struct IDBox: Identifiable { let id: String }

/// Shared screen frame: navigation title, version background, standard toolbar.
struct Screen<Content: View>: View {
    @Environment(\.palette) private var p
    var title: String
    var subtitle: String? = nil
    @ViewBuilder var content: () -> Content     // a TwoPane; it owns scrolling
    var body: some View {
        content()
            .background { CanvasBackground() }
            .navigationTitle(title)
            .navigationSubtitleIfAvailable(subtitle)
    }
}

extension View {
    @ViewBuilder func navigationSubtitleIfAvailable(_ s: String?) -> some View {
        if let s, #available(iOS 26.0, *) { self.navigationSubtitle(s) } else { self }
    }
}

/// Two panes that never cross the iPhone Duo fold. Each pane scrolls on its own.
/// - Regular width, landscape (Duo open): left | 24 pt gap at the vertical fold | right.
/// - Regular width, portrait (Duo open): top | 24 pt gap at the horizontal fold | bottom.
/// - Compact width (iPhone, Duo closed): one scrolling column.
struct TwoPane<L: View, R: View>: View {
    @Environment(\.horizontalSizeClass) private var size
    @Environment(\.duoHarness) private var harness
    @ViewBuilder var left: () -> L
    @ViewBuilder var right: () -> R

    private func pane<C: View>(_ c: C, _ edges: EdgeInsets) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) { c }
                .padding(edges)
                .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .scrollContentBackground(.hidden)
    }

    var body: some View {
        GeometryReader { outer in
            layout(wide: size == .regular && outer.size.width >= 600)
        }
    }

    @ViewBuilder private func layout(wide: Bool) -> some View {
        if wide {
            if let h = harness, h.isOpen, !h.landscape {
                GeometryReader { g in
                    let minY = (g.frame(in: .global).minY - h.originY) / max(h.scale, 0.01)
                    let top = max(160, h.size.height / 2 - minY)
                    VStack(spacing: 0) {
                        pane(left(), EdgeInsets(top: 8, leading: 16, bottom: 12, trailing: 16)).frame(height: top)
                        pane(right(), EdgeInsets(top: 12, leading: 16, bottom: 16, trailing: 16))
                    }
                }
            } else {
                HStack(spacing: 0) {
                    pane(left(), EdgeInsets(top: 8, leading: 16, bottom: 16, trailing: 12)).frame(maxWidth: .infinity)
                    pane(right(), EdgeInsets(top: 8, leading: 12, bottom: 16, trailing: 16)).frame(maxWidth: .infinity)
                }
            }
        } else {
            pane(VStack(alignment: .leading, spacing: 16) { left(); right() }, EdgeInsets(top: 8, leading: 16, bottom: 24, trailing: 16))
        }
    }
}
