import SwiftUI
import MapKit

// Design tokens for the three creative versions. Style study of "Air Dropper" (Phenomenon Studio, Dribbble):
// flat light canvas, white cards, black selected card, indigo accent, red for destructive and no-fly,
// cut-out drone photos, label–value rows, route tracks with a diamond marker, battery bars.
// Built only from iOS-standard parts: SF Pro text styles, SF Symbols, materials, List/Form, sheets, TabView.

struct Palette {
    var canvas: Color
    var card: Color
    var cardMaterial: Material?          // V3 uses glass cards over the map
    var fill: Color                      // stat tiles, inputs, quiet buttons
    var ink: Color
    var ink2: Color
    var ink3: Color
    var line: Color
    var accent: Color
    var live: Color                      // in-flight status, routes, landing spots
    var selected: Color                  // selected card background
    var onSelected: Color
    var danger: Color
    var ok: Color
    var warn: Color
    var scheme: ColorScheme
    var mapCanvas: Bool

    static func of(_ look: Look) -> Palette {
        switch look {
        case .light:
            Palette(canvas: Color(hex: 0xECEBEE), card: .white, cardMaterial: nil, fill: Color(hex: 0xF4F3F6),
                    ink: Color(hex: 0x141414), ink2: Color(hex: 0x6A696B), ink3: Color(hex: 0xA2A1A6), line: Color(hex: 0xE6E5E8),
                    accent: Color(hex: 0x4F5BD5), live: Color(hex: 0x4F5BD5), selected: Color(hex: 0x141414), onSelected: .white,
                    danger: Color(hex: 0xD9534F), ok: Color(hex: 0x2E9E5B), warn: Color(hex: 0xD9A13B), scheme: .light, mapCanvas: false)
        case .dark:
            Palette(canvas: Color(hex: 0x0E0E10), card: Color(hex: 0x1C1B1E), cardMaterial: nil, fill: Color(hex: 0x26252A),
                    ink: Color(hex: 0xF2F1F4), ink2: Color(hex: 0xA2A1A6), ink3: Color(hex: 0x6A696B), line: Color(hex: 0x2C2B30),
                    accent: Color(hex: 0x7380FF), live: Color(hex: 0x7380FF), selected: Color(hex: 0xF2F1F4), onSelected: Color(hex: 0x141414),
                    danger: Color(hex: 0xE5605B), ok: Color(hex: 0x3FC274), warn: Color(hex: 0xE5B34B), scheme: .dark, mapCanvas: false)
        case .map:
            Palette(canvas: Color(hex: 0xE9E8EB), card: .white.opacity(0.72), cardMaterial: .regularMaterial, fill: Color.black.opacity(0.05),
                    ink: Color(hex: 0x141414), ink2: Color(hex: 0x5E5D60), ink3: Color(hex: 0x8F8E93), line: Color.black.opacity(0.08),
                    accent: Color(hex: 0x141414), live: Color(hex: 0x4F5BD5), selected: Color(hex: 0x141414), onSelected: .white,
                    danger: Color(hex: 0xD9443F), ok: Color(hex: 0x2E9E5B), warn: Color(hex: 0xC98F22), scheme: .light, mapCanvas: true)
        }
    }
}

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255, opacity: alpha)
    }
}

private struct PaletteKey: EnvironmentKey { static let defaultValue = Palette.of(.light) }
extension EnvironmentValues {
    var palette: Palette {
        get { self[PaletteKey.self] }
        set { self[PaletteKey.self] = newValue }
    }
}

// MARK: - Surfaces

struct CardBackground: ViewModifier {
    @Environment(\.palette) private var p
    var radius: CGFloat = 16
    var selected = false
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        if selected {
            content.background(p.selected, in: shape).foregroundStyle(p.onSelected)
        } else if let m = p.cardMaterial {
            content.background(m, in: shape).overlay(shape.strokeBorder(.white.opacity(0.6), lineWidth: 0.5))
        } else {
            content.background(p.card, in: shape)
        }
    }
}

extension View {
    func card(radius: CGFloat = 16, selected: Bool = false) -> some View { modifier(CardBackground(radius: radius, selected: selected)) }
}

/// Screen background. V3 shows a muted 3D map of the current example spot behind every screen.
struct CanvasBackground: View {
    @Environment(\.palette) private var p
    @Environment(AppModel.self) private var model
    var body: some View {
        if p.mapCanvas {
            Map(initialPosition: .camera(MapCamera(centerCoordinate: model.place.home, distance: 1400, heading: 30, pitch: 60)), interactionModes: [])
                .mapStyle(.standard(elevation: .realistic, emphasis: .muted, pointsOfInterest: .excludingAll, showsTraffic: false))
                .mapControls { }
                .overlay(Color.white.opacity(0.35))
                .id(model.countryID)
                .ignoresSafeArea()
                .allowsHitTesting(false)
        } else {
            p.canvas.ignoresSafeArea()
        }
    }
}
