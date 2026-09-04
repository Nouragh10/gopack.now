---
name: Narrow Firebase activity transactions
description: Avoid false conflicts when members add, edit, or delete itinerary activities in Firebase RTDB.
---

Shared activity writes should verify current trip membership and resolve the requested itinerary day from a fresh snapshot, then transact only on that day’s activity list. For update/delete, confirm the target is in that day; if not, locate a unique matching activity across all days before writing.

**Why:** Whole-trip RTDB transactions aborted repeatedly during valid activity additions and surfaced a misleading “itinerary changed” error. Existing iPhone builds can retain stale IDs, while legacy itineraries can have drifted or duplicated day numbers and optional activity fields. Matching only inside the initially resolved day therefore blocks valid redo and remove actions.

**How to apply:** Keep authorization immediately before the write and transact only on one day’s activities. Prefer exact ID, then normalized name with time/optional-field ranking. If the requested day has no match, search all days and use only a unique match. New clients should also send the visible activity index as a guarded final fallback.