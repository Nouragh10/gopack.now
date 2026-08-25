---
name: Expo web auth startup
description: Keep GoPack's Expo web preview from getting stuck or crashing during initial auth routing.
---

Treat Expo Router's initial empty segment as a public sign-in route, and wait for the root navigation state before any auth redirect. Always mount the root `<Stack>` while waiting—only overlay a loading state.

**Why:** On web, the first route can be represented as an empty segment while the root navigator mounts. Treating it as protected causes a premature `router.replace`; conditionally withholding the Stack while waiting for its navigation key creates a mount deadlock.

**How to apply:** Keep the native auth restoration gate, but allow web previews to show the sign-in route immediately. Any redirect in the root layout must check for a mounted root navigation key and handle an empty first segment as `/`; show a non-interactive overlay rather than returning a non-navigator loading screen. Verify a nested protected URL directly as well as `/`: testing only the root route can miss this premature-navigation failure.