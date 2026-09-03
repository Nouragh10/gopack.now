---
name: Narrow Firebase activity transactions
description: Avoid false conflicts when members add, edit, or delete itinerary activities in Firebase RTDB.
---

Shared activity writes should verify current trip membership and resolve the requested itinerary day from a fresh snapshot, then transact only on that day’s activity list. Update/delete matching must fall back from a stale client activity ID to normalized name and time, using optional fields only to rank duplicates.

**Why:** Whole-trip RTDB transactions aborted repeatedly during valid activity additions and surfaced a misleading “itinerary changed” error. Existing iPhone builds can retain IDs that differ from legacy Firebase records, while optional fields such as description or suggester may be missing or formatted differently; exact full-record matching therefore blocks valid redo and remove actions.

**How to apply:** Keep authorization and day validation immediately before the write. Use a narrow transaction for the selected day’s activities. Prefer an exact ID match, then match normalized name and time; if several records match, rank them by matching description, suggester, tag, and wish state.