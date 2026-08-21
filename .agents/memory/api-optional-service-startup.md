---
name: Optional service startup
description: Keep unrelated API routes available when optional service credentials are absent.
---

Initialize optional third-party clients only inside the routes that need them, rather than while loading the API router.

**Why:** Firebase Admin and email delivery credentials may be intentionally absent in development. Eager initialization prevents the complete server from starting, even when independent functionality such as AI itinerary generation is fully configured.

**How to apply:** Validate the needed credentials at the boundary of the specific route and return a clear feature-level error when unavailable. Keep shared boot code limited to dependencies required by every route.