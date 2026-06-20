---
name: expo-clipboard version for Expo SDK 54
description: The correct expo-clipboard version for Expo SDK 54 is ~8.0.8, not the latest npm version
---

Running `pnpm add expo-clipboard` installs version 56.x (latest) which is incompatible with Expo SDK 54. Expo warns: `expo-clipboard@56.0.4 - expected version: ~8.0.8`.

**Why:** expo-clipboard follows Expo SDK versioning in later releases but older SDKs use different version ranges.

**How to apply:** Always pin explicitly: `pnpm add expo-clipboard@~8.0.8` when working with Expo SDK 54 projects.
