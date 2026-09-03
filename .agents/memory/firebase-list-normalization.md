---
name: Firebase list normalization
description: Rules for safely mutating itinerary lists stored in Firebase Realtime Database.
---

Treat itinerary days and activity lists from Firebase as either arrays or keyed objects, and preserve the actual child key when constructing mutation paths. Generate IDs before entering a transaction callback rather than inside it.

**Why:** Realtime Database can return list-shaped data as keyed objects, and transaction callbacks may run more than once. Assuming numeric array paths or creating new IDs on each callback can turn valid activity additions into false stale-itinerary conflicts.

**How to apply:** Normalize both representations before lookup or mutation, retain the original Firebase day key for writes, and keep all values produced by a transaction callback deterministic across retries.