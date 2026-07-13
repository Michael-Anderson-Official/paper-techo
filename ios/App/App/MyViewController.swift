import UIKit
import Capacitor

// アプリ内プラグインの登録（Capacitor公式のカスタムコード手順）。
// Main.storyboardのViewControllerクラスをこれに差し替えてある。
class MyViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(DeviceCalendarPlugin())
    }
}
