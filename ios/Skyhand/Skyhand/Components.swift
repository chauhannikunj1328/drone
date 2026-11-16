import SwiftUI

// MARK: - Status

extension DroneState {
    func color(_ p: Palette) -> Color {
        switch self {
        case .ready: p.ok
        case .inAir: p.live
        case .notReady: p.warn
        case .offline: p.ink3
        case .limited: p.warn
        }
    }
}

/// Small coloured dot + text. Text always carries the meaning (colour is never the only signal).
struct StatusLabel: View {
    @Environment(\.palette) private var p
    var text: String
    var color: Color
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(text).font(.footnote).foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }
}

/// Four battery bars + percentage, as in the reference fleet cards.
struct BatteryBars: View {
    @Environment(\.palette) private var p
    var percent: Int
    var showText = true
    var body: some View {
        let on = max(1, Int((Double(percent) / 25).rounded(.up)))
        let tint: Color = percent < 30 ? p.warn : p.ok
        HStack(spacing: 6) {
            HStack(spacing: 2) {
                ForEach(0..<4, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 1).fill(i < on ? tint : p.ink3.opacity(0.35)).frame(width: 3, height: 11)
                }
            }
            if showText { Text("\(percent)%").font(.footnote.monospacedDigit()) }
        }
        .accessibilityLabel("Battery \(percent) percent")
    }
}

/// Route track: dot at the start, filled line to a diamond (current position), then a faint line to the end.
struct RouteTrack: View {
    @Environment(\.palette) private var p
    var progress: Double
    var color: Color? = nil
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, x = max(6, min(w - 6, w * progress))
            let c = color ?? Color.primary
            ZStack(alignment: .leading) {
                Capsule().fill(c.opacity(0.15)).frame(height: 1.5)
                Capsule().fill(c).frame(width: x, height: 1.5)
                Circle().fill(c).frame(width: 6, height: 6)
                Circle().fill(c.opacity(0.25)).frame(width: 5, height: 5).offset(x: w - 5)
                Rectangle().fill(c).frame(width: 8, height: 8).rotationEffect(.degrees(45)).offset(x: x - 4)
            }
            .frame(height: 10)
            .frame(maxHeight: .infinity)
        }
        .frame(height: 12)
        .accessibilityLabel("Route \(Int(progress * 100)) percent done")
    }
}

/// "1.4 /2.5 kg" style bar: solid part, dashed remainder.
struct LoadBar: View {
    var value: Double
    var max: Double
    var body: some View {
        GeometryReader { g in
            let w = g.size.width * CGFloat(min(1, value / max))
            ZStack(alignment: .leading) {
                Path { p in p.move(to: .init(x: 0, y: 1)); p.addLine(to: .init(x: g.size.width, y: 1)) }
                    .stroke(Color.secondary.opacity(0.35), style: StrokeStyle(lineWidth: 2, dash: [2, 3]))
                Capsule().fill(Color.primary).frame(width: w, height: 3)
            }
        }
        .frame(height: 3)
    }
}

/// Grey stat tile: small label on top, big number with a small unit at the bottom right.
struct StatTile: View {
    @Environment(\.palette) private var p
    var label: String
    var value: String
    var unit: String = ""
    var onCard = true
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label).font(.caption).foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Spacer(minLength: 0)
                Text(value).font(.title2.monospacedDigit()).foregroundStyle(p.ink)
                if !unit.isEmpty { Text(unit).font(.caption).foregroundStyle(.secondary) }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(onCard ? p.fill : p.card, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

/// Label on the left, value on the right, hairline below (reference detail rows). Wraps LabeledContent.
struct InfoRow: View {
    @Environment(\.palette) private var p
    var label: String
    var value: String
    var valueColor: Color? = nil
    var divider = true
    var body: some View {
        VStack(spacing: 0) {
            LabeledContent {
                Text(value).foregroundStyle(valueColor ?? p.ink).monospacedDigit()
            } label: {
                Text(label).font(.footnote).foregroundStyle(p.ink2)
            }
            .font(.subheadline)
            .padding(.vertical, 11)
            if divider { Rectangle().fill(p.line).frame(height: 1) }
        }
    }
}

/// Cut-out drone photo, or a drawn silhouette when no free-licence photo exists (Autel).
struct DroneImage: View {
    var brand: Brand
    var body: some View {
        if let name = brand.photo, let ui = UIImage(named: name) {
            Image(uiImage: ui).resizable().scaledToFit()
                .accessibilityLabel("\(brand.name) drone photo")
        } else {
            DroneSilhouette().accessibilityLabel("\(brand.name) drone, drawing")
        }
    }
}

struct DroneSilhouette: View {
    var body: some View {
        Canvas { ctx, size in
            let w = size.width, h = size.height, c = CGPoint(x: w / 2, y: h * 0.55)
            let arm = min(w, h * 2) * 0.32
            for (dx, dy) in [(-1.0, -0.45), (1.0, -0.45), (-1.0, 0.45), (1.0, 0.45)] {
                var p = Path(); p.move(to: c); p.addLine(to: .init(x: c.x + dx * arm, y: c.y + dy * arm * 0.6))
                ctx.stroke(p, with: .color(.init(hex: 0x3A3A3C)), lineWidth: 5)
                let r = CGRect(x: c.x + dx * arm - arm * 0.32, y: c.y + dy * arm * 0.6 - 3, width: arm * 0.64, height: 4)
                ctx.fill(Path(roundedRect: r, cornerRadius: 2), with: .color(.init(hex: 0x1C1C1E)))
            }
            ctx.fill(Path(roundedRect: CGRect(x: c.x - arm * 0.35, y: c.y - arm * 0.22, width: arm * 0.7, height: arm * 0.44), cornerRadius: arm * 0.14), with: .color(.init(hex: 0xF29B38)))
            ctx.fill(Path(ellipseIn: CGRect(x: c.x - 7, y: c.y + arm * 0.18, width: 14, height: 14)), with: .color(.init(hex: 0x1C1C1E)))
        }
    }
}

/// Filter chip with a count (reference: "All 32", "Flying 20"). Selected chip is solid black (white in V2).
struct CountChip: View {
    @Environment(\.palette) private var p
    var title: String
    var count: Int
    var on: Bool
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title).font(.subheadline.weight(.medium))
                Text("\(count)").font(.caption.monospacedDigit()).foregroundStyle(on ? p.onSelected.opacity(0.7) : p.ink3)
            }
            .padding(.horizontal, 14).frame(minHeight: 36)
            .foregroundStyle(on ? p.onSelected : p.ink)
            .background(on ? AnyShapeStyle(p.selected) : (p.cardMaterial.map { AnyShapeStyle($0) } ?? AnyShapeStyle(p.card)), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .padding(.vertical, 4)                       // 44 pt tap target around the 36 pt chip
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .hoverEffect(.highlight)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

/// Section header used on cards: title + trailing meta text.
struct CardHeader: View {
    @Environment(\.palette) private var p
    var title: String
    var meta: String? = nil
    var body: some View {
        HStack {
            Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(p.ink)
            Spacer()
            if let meta { Text(meta).font(.caption).foregroundStyle(p.ink2) }
        }
    }
}

/// Big outlined / filled full-width buttons from the reference detail panels, made from standard Button styles.
struct WideButton: View {
    @Environment(\.palette) private var p
    enum Kind { case outline, primary, destructive }
    var title: String
    var systemImage: String
    var kind: Kind = .outline
    var action: () -> Void
    var body: some View {
        Button(role: kind == .destructive ? .destructive : nil, action: action) {
            Label(title, systemImage: systemImage).font(.body.weight(.medium)).frame(maxWidth: .infinity, minHeight: 44)
        }
        .modifier(WideStyle(kind: kind))
    }
}

private struct WideStyle: ViewModifier {
    @Environment(\.palette) private var p
    var kind: WideButton.Kind
    func body(content: Content) -> some View {
        switch kind {
        case .primary: content.buttonStyle(.borderedProminent).tint(p.accent).buttonBorderShape(.roundedRectangle(radius: 10))
        case .destructive: content.buttonStyle(.borderedProminent).tint(p.danger).buttonBorderShape(.roundedRectangle(radius: 10))
        case .outline: content.buttonStyle(.plain).foregroundStyle(p.ink)
            .background(p.cardMaterial == nil ? AnyShapeStyle(p.card) : AnyShapeStyle(.thinMaterial), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(p.ink3.opacity(0.5), lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
    }
}

/// Hold-to-confirm control (1 s) for Take off, Return and Land. Also works with VoiceOver via the accessibility action.
struct HoldButton<Label: View>: View {
    var duration: Double = 1
    var action: () -> Void
    @ViewBuilder var label: () -> Label
    @State private var progress: CGFloat = 0
    var body: some View {
        label()
            .overlay(alignment: .bottom) {
                GeometryReader { g in
                    Capsule().fill(Color.white.opacity(0.9)).frame(width: g.size.width * progress, height: 3)
                }
                .frame(height: 3).padding(.horizontal, 10).padding(.bottom, 6)
            }
            .onLongPressGesture(minimumDuration: duration, maximumDistance: 30) {
                progress = 0
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                action()
            } onPressingChanged: { pressing in
                if pressing { withAnimation(.linear(duration: duration)) { progress = 1 } }
                else { withAnimation(.easeOut(duration: 0.15)) { progress = 0 } }
            }
            .accessibilityAddTraits(.isButton)
            .accessibilityHint("Press and hold for one second")
            .accessibilityAction { action() }
    }
}
