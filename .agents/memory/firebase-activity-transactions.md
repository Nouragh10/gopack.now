---
name: Narrow Firebase activity transactions
description: Avoid false conflicts when members add, edit, or delete itinerary activities in Firebase RTDB.
---

Shared activity writes should verify current trip membership and resolve the requested itinerary day from a fresh snapshot, then transact only on that day’s activity list.

**Why:** Whole-trip RTDB transactions aborted repeatedly during valid activity additions and surfaced a misleading “itinerary changed” error, even though the itinerary and requested day were present.

**How to apply:** Keep authorization and day validation immediately before the write. Use a narrow transaction for the selected day’s activities so unrelated trip updates do not contend with activity changes.