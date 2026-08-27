---
name: Firebase 12 React Native auth persistence
description: Firebase’s native persistence helper is hidden behind a React Native package condition while the wrapper exposes web types.
---

Firebase JS SDK 12 ships `getReactNativePersistence` in its React Native auth
entry point. Metro uses that native condition for iOS/Android, but TypeScript
can resolve Firebase’s wrapper to web-only declarations and report the helper
as missing. Use the native persistence helper with AsyncStorage and retain a
small type declaration that mirrors the shipped API.

**Why:** Falling back to in-memory Firebase Auth signs users out after a cold
native app relaunch. Node’s resolver and web declarations do not represent the
native Metro bundle, so they can falsely suggest the helper is unavailable.

**How to apply:** Validate this path with a native-targeted Expo export, not a
Node import. Keep web on browser-local persistence and native platforms on the
AsyncStorage-backed Firebase persistence adapter.