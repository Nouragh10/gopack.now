---
name: Vite preview cache routing
description: Prevent blank web previews when the path router blocks Vite's optimized dependency URLs.
---

For path-routed Vite previews, keep Vite's `cacheDir` outside `node_modules` (for example, `vite-cache` at the artifact root).

**Why:** The preview proxy blocks module requests under `node_modules`, including Vite's default optimized-dependency cache. The dev server still starts, but the browser receives 502 responses for React modules and renders a blank page.

**How to apply:** If a Vite preview connects successfully but has 502 errors for optimized dependencies, configure a visible artifact-local `cacheDir`, restart the web workflow, and verify an optimized module can be fetched through the proxy.