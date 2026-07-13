import Capacitor
import EventKit

// 端末のカレンダー（iCloud・Google等、iOSのカレンダーに入っているすべて）から予定を読むプラグイン。
// 読み取り専用。ネイティブ版ではWebのGoogle OAuthを使わず、これ1本でまかなう。
@objc(DeviceCalendarPlugin)
public class DeviceCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceCalendarPlugin"
    public let jsName = "DeviceCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "listEvents", returnType: CAPPluginReturnPromise)
    ]

    private let store = EKEventStore()

    @objc func listEvents(_ call: CAPPluginCall) {
        guard let fromMs = call.getDouble("from"), let toMs = call.getDouble("to") else {
            call.reject("from/to (ms) が必要です")
            return
        }
        let finish: (Bool) -> Void = { granted in
            guard granted else {
                call.resolve(["granted": false, "events": [] as [[String: Any]]])
                return
            }
            let start = Date(timeIntervalSince1970: fromMs / 1000)
            let end = Date(timeIntervalSince1970: toMs / 1000)
            let predicate = self.store.predicateForEvents(withStart: start, end: end, calendars: nil)
            let events: [[String: Any]] = self.store.events(matching: predicate).map { ev in
                [
                    "title": ev.title ?? "",
                    "allDay": ev.isAllDay,
                    "start": ev.startDate.timeIntervalSince1970 * 1000,
                    "end": ev.endDate.timeIntervalSince1970 * 1000
                ]
            }
            call.resolve(["granted": true, "events": events])
        }
        if #available(iOS 17.0, *) {
            store.requestFullAccessToEvents { granted, _ in
                DispatchQueue.main.async { finish(granted) }
            }
        } else {
            store.requestAccess(to: .event) { granted, _ in
                DispatchQueue.main.async { finish(granted) }
            }
        }
    }
}
