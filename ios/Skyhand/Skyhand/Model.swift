import Foundation
import CoreLocation
import Observation

// Skyhand — concept by Artonest. Not a real product. All drone data, telemetry and sign-ins are mock.
// Country rules are shown with their source and check date and are not legal advice.

enum Brand: String, CaseIterable, Identifiable {
    case dji, antigravity, parrot, autel, skydio
    var id: String { rawValue }
    var name: String {
        switch self {
        case .dji: "DJI"; case .antigravity: "Antigravity"; case .parrot: "Parrot"; case .autel: "Autel"; case .skydio: "Skydio"
        }
    }
    /// Cut-out photo in the app bundle (free-licence Wikimedia Commons photos, see Credits). Autel has none.
    var photo: String? { self == .autel ? nil : "drone-\(rawValue).png" }
    var photoCredit: String? {
        switch self {
        case .dji: "C.Stadler/Bwag · CC BY-SA 4.0"
        case .antigravity: "ZLEA · CC BY-SA 4.0"
        case .parrot: "ZLEA · CC BY-SA 4.0"
        case .skydio: "Alexander Kubitza · Public domain"
        case .autel: nil
        }
    }
}

enum DroneState: String {
    case ready = "Ready", notReady = "Not ready", offline = "Offline", limited = "Monitor only", inAir = "In flight"
}

struct Drone: Identifiable, Hashable {
    let id: String
    var nickname: String
    var brand: Brand
    var model: String
    var serial: String
    var weightGrams: Int
    var battery: Int
    var state: DroneState
    var reason: String?
    var maxAltitude: Int
    var maxSpeed: Int
    var flightTime: Int
    var flightHours: Int
    var firmwareOK: Bool
    var registrationDaysLeft: Int?
    var signal: String = "Good"
}

struct Country: Identifiable, Hashable {
    let id: String          // ISO code
    var name: String
    var maxAltitude: Int
    var source: String
    var checked: String
    var rules: [String]
    var canFlyAsVisitor: Bool = true
}

struct Place: Hashable {
    var city: String
    var name: String
    var home: CLLocationCoordinate2D
    var landing: [(name: String, note: String, east: Double, north: Double)]
    var noFly: (name: String, east: Double, north: Double, radius: Double)

    static func == (a: Place, b: Place) -> Bool { a.name == b.name }
    func hash(into h: inout Hasher) { h.combine(name) }

    func offset(east: Double, north: Double) -> CLLocationCoordinate2D {
        let mPerDegLat = 111_320.0
        return CLLocationCoordinate2D(latitude: home.latitude + north / mPerDegLat,
                                      longitude: home.longitude + east / (mPerDegLat * cos(home.latitude * .pi / 180)))
    }
}

enum FlightStatus: String { case live = "In flight", done = "Landed", returned = "Returned early", paused = "Paused" }

struct Flight: Identifiable, Hashable {
    let id: String
    var droneID: String
    var title: String
    var from: String
    var to: String
    var status: FlightStatus
    var progress: Double        // 0...1 along the route
    var started: String
    var duration: String
    var delta: String?          // e.g. "+2 min"
    var maxHeight: Int
    var distanceKm: Double
}

enum Phase: String { case grounded, takingOff, flying, paused, returning, landing }

struct LiveSim: Hashable {
    var phase: Phase = .grounded
    var height: Double = 0
    var distance: Double = 0
    var speed: Double = 0
    var heading: Double = 105
    var tilt: Double = 2
    var photos = 0
    var recording = false
}

// MARK: - Mock data

enum Mock {
    static let drones: [Drone] = [
        Drone(id: "d1", nickname: "Park drone", brand: .dji, model: "DJI Mavic 4 Pro", serial: "1581F-9X42", weightGrams: 1000, battery: 92, state: .ready, maxAltitude: 120, maxSpeed: 90, flightTime: 51, flightHours: 34, firmwareOK: true, registrationDaysLeft: 118),
        Drone(id: "d2", nickname: "360 cam", brand: .antigravity, model: "Antigravity A1", serial: "AGA1-00217", weightGrams: 249, battery: 18, state: .notReady, reason: "Battery too low", maxAltitude: 120, maxSpeed: 43, flightTime: 24, flightHours: 9, firmwareOK: true, registrationDaysLeft: nil),
        Drone(id: "d3", nickname: "Trail", brand: .parrot, model: "Parrot ANAFI Ai", serial: "PI-0408-77", weightGrams: 900, battery: 74, state: .offline, reason: "Update needed", maxAltitude: 120, maxSpeed: 61, flightTime: 32, flightHours: 21, firmwareOK: false, registrationDaysLeft: 40),
        Drone(id: "d4", nickname: "Survey", brand: .autel, model: "Autel EVO Max 4T", serial: "EVO4T-1130", weightGrams: 1600, battery: 81, state: .ready, maxAltitude: 120, maxSpeed: 82, flightTime: 42, flightHours: 57, firmwareOK: true, registrationDaysLeft: 212),
        Drone(id: "d5", nickname: "Team", brand: .skydio, model: "Skydio X10", serial: "X10-55120", weightGrams: 2100, battery: 88, state: .inAir, reason: "Monitor and mission start only", maxAltitude: 120, maxSpeed: 72, flightTime: 40, flightHours: 112, firmwareOK: true, registrationDaysLeft: 301),
    ]

    static let countries: [Country] = [
        Country(id: "US", name: "United States", maxAltitude: 122, source: "FAA, FCC", checked: "Checked Nov 2026",
                rules: ["TRUST certificate for recreational flying", "Registration and Remote ID at 250 g or more", "Keep it in sight, or use an observer next to you", "Paid work counts as Part 107 commercial work"]),
        Country(id: "UK", name: "United Kingdom", maxAltitude: 120, source: "UK CAA", checked: "Partly checked",
                rules: ["Flyer ID at 100 g or more", "Operator ID at 250 g or more, or 100 g or more with a camera", "Remote ID for UK1 to UK3 from 1 Jan 2026", "Observer needed for screen-only flying"]),
        Country(id: "AE", name: "United Arab Emirates", maxAltitude: 120, source: "GCAA, news reports", checked: "Partly checked",
                rules: ["All recreational drones registered, any weight", "Fly only in green zones shown in the official app", "Dubai status not checked (reported suspended)"], canFlyAsVisitor: false),
        Country(id: "AU", name: "Australia", maxAltitude: 120, source: "CASA", checked: "Not checked",
                rules: ["No registration for recreational flying under 250 g", "Registration above 250 g", "Keep it in sight with your own eyes"]),
        Country(id: "IN", name: "India", maxAltitude: 120, source: "DGCA Digital Sky", checked: "Partly checked",
                rules: ["Check the Digital Sky airspace map first", "Register drones over 250 g", "Foreign visitors need permission"], canFlyAsVisitor: false),
        Country(id: "CH", name: "Switzerland", maxAltitude: 120, source: "FOCA", checked: "Partly checked",
                rules: ["Operator registration at 250 g or more", "Keep it in sight", "No flying near airports"]),
        Country(id: "JP", name: "Japan", maxAltitude: 150, source: "MLIT", checked: "Partly checked",
                rules: ["Registration at 100 g or more", "MLIT approval for crowded areas", "Daylight and in sight only"]),
        Country(id: "LU", name: "Luxembourg", maxAltitude: 120, source: "DAC", checked: "Partly checked",
                rules: ["EU operator registration", "Open category A1 to A3 rules", "Check the geozone map"]),
    ]

    static let places: [String: Place] = [
        "US": Place(city: "San Francisco", name: "Marina Green", home: .init(latitude: 37.8062, longitude: -122.4400),
                    landing: [("Lawn north", "Open grass", 90, 60), ("Field west", "Flat, no paths", -170, 20)], noFly: ("Helicopter route (example)", 520, 260, 220)),
        "UK": Place(city: "London", name: "Greenwich Park", home: .init(latitude: 51.4775, longitude: -0.0010),
                    landing: [("Upper lawn", "Open grass", 110, -60), ("Flower garden edge", "Away from paths", -150, 70)], noFly: ("Royal Observatory (example)", -40, 230, 120)),
        "AE": Place(city: "Dubai", name: "Kite Beach", home: .init(latitude: 25.1585, longitude: 55.1990),
                    landing: [("Beach flat", "Hard sand", -80, 90), ("Park lawn", "Behind the walkway", 140, -70)], noFly: ("Burj Al Arab area (example)", -900, 600, 500)),
        "AU": Place(city: "Sydney", name: "Centennial Park", home: .init(latitude: -33.8960, longitude: 151.2330),
                    landing: [("Grand Drive lawn", "Open grass", 120, 40), ("Pond field", "Flat, quiet", -130, -90)], noFly: ("Hospital helipad (example)", -700, 450, 250)),
        "IN": Place(city: "Mumbai", name: "Marine Drive", home: .init(latitude: 18.9430, longitude: 72.8235),
                    landing: [("Promenade gap", "Wide walkway", -60, 120), ("Oval Maidan", "Open ground", 380, -300)], noFly: ("Naval area (example)", 300, -900, 450)),
        "CH": Place(city: "Zurich", name: "Zürichhorn", home: .init(latitude: 47.3545, longitude: 8.5530),
                    landing: [("Lakeside lawn", "Open grass", 70, -80), ("Park meadow", "Away from trees", -140, 60)], noFly: ("Hospital (example)", 600, 500, 250)),
        "JP": Place(city: "Tokyo", name: "Yoyogi Park", home: .init(latitude: 35.6717, longitude: 139.6950),
                    landing: [("Central lawn", "Open grass", 90, 70), ("Field east", "Flat", 190, -90)], noFly: ("Meiji Shrine (example)", 300, 600, 300)),
        "LU": Place(city: "Luxembourg City", name: "Parc Municipal", home: .init(latitude: 49.6110, longitude: 6.1260),
                    landing: [("Park lawn", "Open grass", 60, 70), ("Playground field", "When empty", -120, -40)], noFly: ("Government quarter (example)", 450, -250, 220)),
    ]

    static let flights: [Flight] = [
        Flight(id: "FL 0451", droneID: "d5", title: "Orbit over the lawn", from: "Home point", to: "Lawn north", status: .live, progress: 0.62, started: "09:18", duration: "12 min", delta: "On time", maxHeight: 38, distanceKm: 0.6),
        Flight(id: "FL 0448", droneID: "d1", title: "Sunset reel", from: "Home point", to: "Field west", status: .done, progress: 1, started: "Yesterday 18:42", duration: "21 min", delta: nil, maxHeight: 96, distanceKm: 2.4),
        Flight(id: "FL 0444", droneID: "d4", title: "Roof survey", from: "Home point", to: "Lawn north", status: .returned, progress: 0.4, started: "Mon 10:05", duration: "9 min", delta: "Wind", maxHeight: 60, distanceKm: 1.1),
        Flight(id: "FL 0439", droneID: "d2", title: "360 walk-through", from: "Home point", to: "Field west", status: .done, progress: 1, started: "Sun 16:20", duration: "14 min", delta: nil, maxHeight: 42, distanceKm: 0.9),
        Flight(id: "FL 0431", droneID: "d1", title: "Coast line", from: "Home point", to: "Lawn north", status: .done, progress: 1, started: "Sat 07:55", duration: "33 min", delta: nil, maxHeight: 118, distanceKm: 4.7),
    ]
}

// MARK: - App state

enum Look: String, CaseIterable, Identifiable {
    case light, dark, map
    var id: String { rawValue }
    var title: String { switch self { case .light: "V1 Light"; case .dark: "V2 Dark"; case .map: "V3 Map" } }
    var short: String { switch self { case .light: "V1"; case .dark: "V2"; case .map: "V3" } }
    var detail: String {
        switch self {
        case .light: "Light grey canvas, white cards, black selection, indigo accent"
        case .dark: "The same system in iOS dark mode"
        case .map: "Every screen floats on a muted 3D map, glass cards, graphite accent"
        }
    }
}

@Observable
final class AppModel {
    var look: Look { didSet { UserDefaults.standard.set(look.rawValue, forKey: "skyhand.look") } }
    var countryID = "US"
    var drones = Mock.drones
    var flights = Mock.flights
    var sims: [String: LiveSim] = [:]
    var flyingDroneID: String?          // Fly screen open for this drone
    var preflightDroneID: String?       // pre-flight sheet open for this drone
    var leftHanded = false
    var tab: AppTab = .overview         // selected tab; also driven by the Go menu shortcuts on Mac and iPad keyboards
    /// iPhone Duo preview harness (design review on iPad until an iPhone Duo simulator exists).
    var duoPreview: Bool = UserDefaults.standard.bool(forKey: "duoPreview") { didSet { UserDefaults.standard.set(duoPreview, forKey: "duoPreview") } }

    init() {
        look = Look(rawValue: UserDefaults.standard.string(forKey: "skyhand.look") ?? "") ?? .light
        for d in drones { sims[d.id] = LiveSim() }
        sims["d5"] = LiveSim(phase: .flying, height: 38, distance: 60, speed: 18, heading: 105)
    }

    var country: Country { Mock.countries.first { $0.id == countryID } ?? Mock.countries[0] }
    var place: Place { Mock.places[countryID] ?? Mock.places["US"]! }
    func drone(_ id: String) -> Drone? { drones.first { $0.id == id } }
    func sim(_ id: String) -> LiveSim { sims[id] ?? LiveSim() }

    /// Where a drone is drawn on the map (mock positions around the country's example spot).
    func position(of d: Drone) -> CLLocationCoordinate2D {
        let offsets: [String: (Double, Double)] = ["d1": (-120, -160), "d2": (260, 40), "d3": (-330, 200), "d4": (300, -260), "d5": (20, 210)]
        let o = offsets[d.id] ?? (0, 0)
        let s = sim(d.id)
        let k = s.phase == .grounded ? 0 : min(1, s.distance / 200)
        return place.offset(east: o.0 + 120 * k, north: o.1 + 90 * k)
    }

    /// One simulation step (0.25 s). Concept only: no real drone is connected.
    func tick() {
        for (id, var s) in sims {
            switch s.phase {
            case .takingOff:
                s.height = min(s.height + 1.2, 5); if s.height >= 5 { s.phase = .flying }
            case .flying:
                s.distance += s.speed * 0.25 / 3.6; s.heading = (s.heading + 0.3).truncatingRemainder(dividingBy: 360)
                s.tilt = 2 + sin(s.distance / 7) * 3
            case .returning:
                s.distance = max(0, s.distance - 4); s.speed = 14
                if s.distance == 0 { s.phase = .landing }
            case .landing:
                s.height = max(0, s.height - 1.5); s.speed = 0
                if s.height == 0 { s.phase = .grounded; s.distance = 0 }
            case .grounded, .paused:
                break
            }
            sims[id] = s
        }
    }

    func readiness(_ d: Drone) -> [(String, Bool, String)] {
        let c = country
        return [
            ("Country", true, "Flying in \(c.name)"),
            ("Registration", d.registrationDaysLeft != nil || d.weightGrams < 250, d.registrationDaysLeft.map { "Valid · \($0) days left" } ?? (d.weightGrams < 250 ? "Not needed under 250 g" : "Add registration")),
            ("Remote ID", true, "On"),
            ("Airspace", true, "No closed areas nearby (mock)"),
            ("Wind", true, "12 km/h · OK (mock)"),
            ("Battery", d.battery >= 30, "\(d.battery)%"),
            ("Storage", true, "48 min of video (mock)"),
            ("Firmware", d.firmwareOK, d.firmwareOK ? "Up to date" : "Update needed"),
            ("Keep it in sight", true, "You can see the drone"),
            ("People nearby", true, "Not near a crowd"),
            ("If the link drops", true, "Returns to home point"),
        ]
    }
}
