---
name: Narrow Firebase activity transactions
description: Avoid false conflicts when members add, edit, or delete itinerary activities in Firebase RTDB.
---

Shared activity writes should verify current trip membership and resolve the requested itinerary day from a fresh snapshot, then transact only on that day’s activity list. Update/delete matching must fall back from a stale client activity ID to stable legacy fields.

**Why:** Whole-trip RTDB transactions aborted repeatedly during valid activity additions and surfaced a misleading “itinerary changed” error. Existing iPhone builds can also retain activity IDs that differ from legacy Firebase records, blocking redo and remove even when the full target activity is supplied.

**How to apply:** Keep authorization and day validation immediately before the write. Use a narrow transaction for the selected day’s activities. Prefer an exact ID match, then compare stable activity fields so older mobile builds remain compatible.