import SwiftUI

/// iPhone Duo preview harness (design review only).
/// Xcode 27 on this Mac has no iPhone Duo simulator, so this runs the real app inside a frame with the
/// Duo display sizes assumed by the Skyhand prototype (closed 466×678 pt, open 626×890 pt), the matching
/// size class (compact closed, regular open), the fold line, and a 24 pt reserved band when half open.
/// On a real iPhone Duo the system provides the side bars and fold handling; this harness does not fake them.
@Observable
final class DuoHarness {
    enum Pose: String, CaseIterable, Identifiable { case closed = "Closed", open = "Open", half = "Half open"; var id: String { rawValue } }
    var pose: Pose = .open
    var landscape = false
    /// Where the device screen sits on the iPad (global points) and its scale, so panes can find the fold.
    var originY: CGFloat = 0
    var scale: CGFloat = 1
    var size: CGSize {
        switch pose {
        case .closed: landscape ? CGSize(width: 678, height: 466) : CGSize(width: 466, height: 678)
        case .open, .half: landscape ? CGSize(width: 890, height: 626) : CGSize(width: 626, height: 890)
        }
    }
    var isOpen: Bool { pose != .closed }
}

private struct HarnessKey: EnvironmentKey { static let defaultValue: DuoHarness? = nil }
extension EnvironmentValues {
    var duoHarness: DuoHarness? {
        get { self[HarnessKey.self] }
        set { self[HarnessKey.self] = newValue }
    }
}

struct DuoPreviewView: View {
    @Environment(AppModel.self) private var model
    @State private var h = DuoHarness()

    var body: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Text("iPhone Duo preview").font(.headline)
                Spacer()
                Picker("Pose", selection: $h.pose) { ForEach(DuoHarness.Pose.allCases) { Text($0.rawValue).tag($0) } }
                    .pickerStyle(.segmented).frame(width: 320)
                Button { withAnimation(.snappy) { h.landscape.toggle() } } label: { Label(h.landscape ? "Portrait" : "Landscape", systemImage: "rotate.right") }
                    .buttonStyle(.bordered)
                Picker("Version", selection: Binding(get: { model.look }, set: { model.look = $0 })) { ForEach(Look.allCases) { Text($0.short).tag($0) } }
                    .pickerStyle(.segmented).frame(width: 150)
            }
            .padding(.horizontal, 24)
            Text("\(h.pose.rawValue) · \(Int(h.size.width)) × \(Int(h.size.height)) pt · \(h.isOpen ? "regular" : "compact") width · sizes assumed, no Duo simulator yet")
                .font(.caption).foregroundStyle(.secondary)
            GeometryReader { g in
                let s = h.size
                let scale = min(1, (g.size.width - 32) / (s.width + 28), (g.size.height - 16) / (s.height + 28))
                device(s)
                    .scaleEffect(scale)
                    .frame(width: g.size.width, height: g.size.height)
                    .onGeometryChange(for: CGRect.self) { $0.frame(in: .global) } action: { r in
                        h.scale = scale
                        h.originY = r.midY - s.height * scale / 2
                    }
            }
        }
        .padding(.top, 12)
        .background(Color(hex: 0xD9D8DC).ignoresSafeArea())
        .environment(\.duoHarness, h)
    }

    private func device(_ s: CGSize) -> some View {
        RootView()
            .environment(\.horizontalSizeClass, h.isOpen ? .regular : .compact)
            .environment(\.duoHarness, h)
            .frame(width: s.width, height: s.height)
            .clipShape(RoundedRectangle(cornerRadius: 34, style: .continuous))
            .overlay { fold(s) }
            .overlay(alignment: .topTrailing) {
                if h.pose == .closed { Circle().fill(.black).frame(width: 14, height: 14).padding(16) }
            }
            .padding(14)
            .background(Color(hex: 0x141414), in: RoundedRectangle(cornerRadius: 46, style: .continuous))
            .shadow(color: .black.opacity(0.25), radius: 30, y: 16)
    }

    @ViewBuilder private func fold(_ s: CGSize) -> some View {
        if h.isOpen {
            let half = h.pose == .half
            let band: CGFloat = half ? 24 : 1
            let shade = LinearGradient(colors: [.clear, .black.opacity(half ? 0.28 : 0.12), .clear],
                                       startPoint: h.landscape ? .leading : .top, endPoint: h.landscape ? .trailing : .bottom)
            if h.landscape {
                Rectangle().fill(shade).frame(width: band).frame(maxHeight: .infinity).allowsHitTesting(false)
            } else {
                Rectangle().fill(shade).frame(height: band).frame(maxWidth: .infinity).allowsHitTesting(false)
            }
        }
    }
}

/// Inside the harness, sheets open on one side of the fold (HIG: components adapt to the fold).
struct HarnessSheet<Content: View>: View {
    @Environment(\.duoHarness) private var h
    var close: () -> Void
    @ViewBuilder var content: () -> Content
    var body: some View {
        let split = h?.isOpen == true
        let land = h?.landscape == true
        ZStack(alignment: split && land ? .trailing : .bottom) {
            Color.black.opacity(0.3).ignoresSafeArea().onTapGesture(perform: close)
            content()
                .frame(maxWidth: split && land ? (h!.size.width / 2 - 12) : .infinity,
                       maxHeight: split && !land ? (h!.size.height / 2 - 12) : (split ? .infinity : h.map { $0.size.height * 0.7 } ?? 600))
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(split && land ? 8 : 0)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}
