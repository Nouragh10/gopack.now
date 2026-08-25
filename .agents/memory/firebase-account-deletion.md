---
name: Account deletion recovery
description: How to safely coordinate Packyo Firebase Auth and Realtime Database account deletion.
---

Account deletion must run through the trusted API, not entirely in the mobile client. Require a valid, non-revoked Firebase ID token for every request and a recent authentication only when starting a deletion. After the atomic Realtime Database cleanup, retain a server-only deletion marker until Firebase Auth removal succeeds; an existing marker can be resumed by a valid token even if its original freshness window has elapsed.

**Why:** Firebase Auth and Realtime Database cannot be deleted in a single client-side transaction. Network failure between the two actions otherwise leaves either a partially cleaned account or a guest account that cannot reauthenticate to finish deletion.

**How to apply:** Keep cleanup and marker creation in one Admin SDK multi-location update, make Auth user-not-found retry-idempotent, and force-refresh the mobile ID token after any client reauthentication.