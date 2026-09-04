---
name: Narrow Firebase activity transactions
description: Avoid false conflicts when members add, edit, or delete itinerary activities in Firebase RTDB.
---

Shared activity writes should verify membership and resolve the requested day from a fresh snapshot. Support stable IDs, legacy numeric IDs, and a unique time/category slot; recover cold-child transaction aborts from a fresh child snapshot.

**Why:** Existing TestFlight builds may send numeric IDs or stale records. In this RTDB runtime, transactions on an array-valued activities child repeatedly received `null` despite a preceding read, so valid update/delete callbacks aborted with 409 while the child still contained activities.

**How to apply:** Keep authorization immediately before the write and scope writes to one day. Prefer exact ID, numeric index, then normalized fields or one unambiguous time/category slot. If the transaction sees a cold empty child, re-read that child, resolve again, and persist only when resolution is unambiguous.