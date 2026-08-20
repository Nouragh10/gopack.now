---
name: Expo Go native startup
description: Avoiding native launch failures in GoPack's Expo Go preview.
---

Do not initialize third-party native modules in GoPack's root layout when the app is running in Expo Go. Use React Native built-ins for root-level behavior and defer optional native functionality until the user needs it.

**Why:** Expo Go does not include arbitrary third-party native modules. Loading one at startup can close the iOS Simulator before JavaScript errors reach the normal preview logs.

**How to apply:** Keep providers in the root layout limited to Expo Go-compatible modules. Use React Native keyboard primitives for shared layout behavior, and dynamically import optional export or device modules only at the user action that needs them.