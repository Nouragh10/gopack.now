---
name: iOS itinerary exports
description: Native PDF and calendar export constraints for the Expo mobile app.
---

On iOS, defer PDF or calendar sharing until the export modal has fully dismissed. Generate named local files with the Expo SDK-matched file-system module, and share `.ics` files as `text/calendar` with the Apple ICS UTI.

**Why:** Presenting the iOS share sheet while the app's native modal was still closing can fail silently. A mismatched Expo file-system package also risks breaking file creation in TestFlight even when it appears to work elsewhere.

**How to apply:** Queue the selected export, invoke it from the modal-dismiss completion, and retain robust, standards-compliant ICS fields (UID, timestamp, escaped text) before handing the file to the system share sheet.

For native calendar creation, import `expo-calendar` statically and declare its config plugin/permission. Do not attempt to access Metro's module loader through `globalThis.require`.

**Why:** Metro does not reliably install `require` on `globalThis`, so the dynamic lookup silently disables direct calendar creation and always falls back to ICS.

**How to apply:** Use the imported Calendar module only outside web, request calendar access at export time, and retain ICS sharing as the browser/permission-denied fallback.