import SwiftUI
import MapKit

/// Operations map: drones (cut-out photo + label), home point, landing spots, example no-fly area and
/// the live route. "Clay" 3D city look = MapKit standard style, realistic elevation, muted emphasis.
struct OpsMap: View {
    @Environment(AppModel.self) private var model
    @Environment(\.palette) private var p
    enum Layer: String, CaseIterable, Identifiable { case all = "View all", drones = "Drones", landing = "Landing spots", noFly = "No-fly areas"; var id: String { rawValue } }
    var pitch: Double = 55
    var distance: Double = 2200
    var interactive = true
    var showsDronePhotos = true
    var focusDroneID: String? = nil
    @State private var layer: Layer = .all
    @State private var position: MapCameraPosition = .automatic

    var body: some View {
        let place = model.place
        Map(position: $position, interactionModes: interactive ? .all : []) {
            if layer == .all || layer == .noFly {
                let z = place.offset(east: place.noFly.east, north: place.noFly.north)
                MapCircle(center: z, radius: place.noFly.radius)
                    .foregroundStyle(p.danger.opacity(0.14))
                    .stroke(p.danger, style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                Annotation(place.noFly.name, coordinate: z) {
                    Image(systemName: "exclamationmark.triangle.fill").font(.footnote).foregroundStyle(.white)
                        .padding(5).background(p.danger, in: Circle())
                }
            }
            if layer == .all || layer == .landing {
                ForEach(place.landing, id: \.name) { l in
                    Annotation(l.name, coordinate: place.offset(east: l.east, north: l.north)) {
                        Rectangle().fill(p.live).frame(width: 12, height: 12).rotationEffect(.degrees(45))
                            .overlay(Rectangle().stroke(.white, lineWidth: 2).frame(width: 12, height: 12).rotationEffect(.degrees(45)))
                    }
                }
            }
            Annotation("Home", coordinate: place.home) {
                Image(systemName: "house.fill").font(.caption2.weight(.bold)).foregroundStyle(p.onSelected)
                    .frame(width: 24, height: 24).background(p.selected, in: Circle()).overlay(Circle().stroke(.white, lineWidth: 2))
            }
            if let live = model.drones.first(where: { model.sim($0.id).phase != .grounded }) {
                MapPolyline(coordinates: [place.home, model.position(of: live), place.offset(east: place.landing[0].east, north: place.landing[0].north)])
                    .stroke(p.live, style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
            }
            if layer == .all || layer == .drones {
                ForEach(model.drones) { d in
                    Annotation("", coordinate: model.position(of: d), anchor: .center) {
                        DroneMarker(drone: d, photo: showsDronePhotos && (focusDroneID == nil || focusDroneID == d.id))
                    }
                }
            }
        }
        .mapStyle(.standard(elevation: .realistic, emphasis: .muted, pointsOfInterest: .excludingAll, showsTraffic: false))
        .mapControls { if interactive { MapCompass() } }
        .overlay(alignment: .topLeading) {
            if interactive {
                Menu {
                    Picker("Show", selection: $layer) { ForEach(Layer.allCases) { Text($0.rawValue).tag($0) } }
                } label: {
                    Image(systemName: "square.3.layers.3d").font(.body.weight(.medium)).frame(width: 44, height: 44)
                        .glass(in: RoundedRectangle(cornerRadius: 12, style: .continuous), interactive: true)
                }
                .padding(10)
                .accessibilityLabel("Map layers")
            }
        }
        .onAppear { recenter() }
        .onChange(of: model.countryID) { recenter() }
    }

    private func recenter() {
        let center = focusDroneID.flatMap { model.drone($0) }.map { model.position(of: $0) } ?? model.place.home
        position = .camera(MapCamera(centerCoordinate: center, distance: distance, heading: 25, pitch: pitch))
    }
}

struct DroneMarker: View {
    @Environment(\.palette) private var p
    var drone: Drone
    var photo: Bool
    var body: some View {
        VStack(spacing: 4) {
            Text(drone.nickname).font(.caption2.weight(.medium)).foregroundStyle(HUD.ink)
                .padding(.horizontal, 6).padding(.vertical, 3)
                .background(.white, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
                .shadow(color: .black.opacity(0.08), radius: 2, y: 1)
            if photo {
                DroneImage(brand: drone.brand).frame(width: 64, height: 34)
                    .shadow(color: .black.opacity(0.35), radius: 6, y: 8)
                    .opacity(drone.state == .offline ? 0.5 : 1)
            } else {
                Image(systemName: "dot.radiowaves.left.and.right").font(.caption.weight(.bold)).foregroundStyle(.white)
                    .frame(width: 26, height: 26).background(drone.state.color(p), in: Circle())
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(drone.nickname), \(drone.state.rawValue)")
    }
}
