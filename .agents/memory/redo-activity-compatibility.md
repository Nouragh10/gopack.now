---
name: Redo activity compatibility
description: Backward-compatible handling of activity-redo requests and responses across mobile/API releases.
---

Redo clients must normalize the entire response body rather than assuming an `activity` property, and redo requests should use the trip destination when legacy itinerary days lack a city.

**Why:** Mobile builds and the deployed API can roll out at different times. Older response wrappers can still contain a valid replacement activity, while older saved day records can omit city and otherwise trigger a preventable validation failure.

**How to apply:** Preserve the normalized `{ activity }` API response as the canonical contract, but keep the client wrapper-tolerant during rollout. Resolve city from the day first and the trip destination second on both request validation and prompt construction.