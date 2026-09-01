---
name: iOS itinerary exports
description: Native PDF and calendar export constraints for the Expo mobile app.
---

On iOS, defer PDF or calendar sharing until the export modal has fully dismissed. Generate named local files with the Expo SDK-matched file-system module, and share `.ics` files as `text/calendar` with the Apple ICS UTI.

**Why:** Presenting the iOS share sheet while the app's native modal was still closing can fail silently. A mismatched Expo file-system package also risks breaking file creation in TestFlight even when it appears to work elsewhere.

**How to apply:** Queue the selected export, invoke it from the modal-dismiss completion, and retain robust, standards-compliant ICS fields (UID, timestamp, escaped text) before handing the file to the system share sheet.

The calendar export action must add itinerary activities directly to the
iPhone Calendar after permission is granted. Keep `.ics` sharing only as the
fallback when Calendar access or a writable calendar is unavailable.

**Why:** The user explicitly confirmed that downloading or sharing a calendar
file alone does not satisfy Packyo's iOS export requirement.

**How to apply:** Treat successful direct insertion as the primary iOS outcome.
A downloadable or shareable calendar file is only a fallback, not equivalent
completion of the export request.