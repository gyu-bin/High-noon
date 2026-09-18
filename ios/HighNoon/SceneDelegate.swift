import Expo
import React
import UIKit

/// iOS 27 / Xcode 27 requires UIScene lifecycle. Without this the simulator
/// traps at launch (`UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions
    )

    // Cold-start deep links / universal links handed via scene connection options.
    if let userActivity = connectionOptions.userActivities.first {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        continue: userActivity,
        restorationHandler: { _ in }
      )
    }
    for context in connectionOptions.urlContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
