---
name: Expo web auth startup
description: Keep GoPack's Expo web preview from getting stuck or crashing during initial auth routing.
---

Treat Expo Router's initial empty segment as a public sign-in route, and wait for the root navigation state before any auth redirect.

**Why:** On web, the first route can be represented as an empty segment while the root navigator mounts. Treating it as protected causes a premature `router.replace` and Expo Router crashes before the initial screen renders.

**How to apply:** Keep the native auth restoration gate, but allow web previews to show the sign-in route immediately. Any redirect in the root layout must check for a mounted root navigation key and handle an empty first segment as `/`.