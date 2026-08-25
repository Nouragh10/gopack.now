---
name: Firebase RTDB user paths
description: Firebase Realtime Database authorization constraint for Packyo user-owned records.
---

Store user-owned Realtime Database records under the established `userTrips/{uid}` branch unless the Firebase rules are explicitly updated to permit a new path.

**Why:** The deployed Firebase rules rejected a write to a newly introduced root-level user collection, while the existing per-user trip index is the authorized namespace.

**How to apply:** Before adding persistent per-user mobile data, reuse the established per-user branch or update and validate the Firebase rules for a dedicated collection. Keep reads and writes on the same authorized path.