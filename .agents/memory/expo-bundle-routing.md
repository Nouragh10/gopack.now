---
name: Expo bundle routing
description: Keeping a path-based Expo preview able to load its JavaScript bundle in Replit.
---

For an Expo artifact served under a path-based preview route, its service must also own Metro’s absolute `/node_modules/` bundle route.

**Why:** Expo emits its development entry bundle at an absolute `/node_modules/.../entry.bundle` URL. Without a matching artifact route, the preview proxy returns 502 before JavaScript starts, leaving the native iOS Simulator loading indefinitely.

**How to apply:** Preserve the artifact’s normal preview path and add `/node_modules/` to that service’s paths using the validated artifact configuration workflow. Confirm that both web and iOS variants of the `entry.bundle` endpoint return HTTP 200 after restarting Expo.