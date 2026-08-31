# Packyo iOS trip-lifecycle verification record

**Recorded:** 2026-08-31  
**Release status:** BLOCKED — physical-device verification remains outstanding

## Checks completed in the workspace

- `pnpm run typecheck` — passed.
- `CI=1 pnpm exec expo install --check` — passed.
- `pnpm dlx expo-doctor@latest` — 18/18 checks passed.
- `pnpm exec expo export --platform ios` — passed; the iOS JavaScript bundle and assets exported successfully.
- Mobile web preview at `/sign-in` — rendered at a 400 × 720 viewport without a crash.
- Source review — push requests exclude the sender, read recipient tokens from the user-owned `userTrips/{uid}/pushTokens` branch, and include `tripId` plus a route in notification data.
- Source review — lifecycle send points exist for accommodation options, confirmed stay, chat, and itinerary-ready updates. Notification rows route invitations, accommodation votes, chat, and itinerary-ready alerts to their Packyo destinations.

## Signed-build readiness

- Expo config resolves with app name `packyo`, scheme `gopack-mobile`, bundle ID `com.gopacknow.app`, and EAS project ID `246de177-cc0e-49f6-9a96-5d088306ca39`.
- The resolved iOS config includes the `expo-notifications`, `expo-apple-authentication`, and `expo-calendar` plugins. Google Maps URL handling is declared in `LSApplicationQueriesSchemes`.
- The production profile targets `packyo.replit.app`, includes the three public Google client IDs, and enables automatic build-number incrementing.
- The workspace export is not a signed `.ipa` and cannot prove Apple signing credentials, APNs credentials, TestFlight installation, or native entitlements.
- Use Replit's **Publishing → Launch** flow to create the fresh signed iOS/TestFlight build. Do not reuse an older install made before notification capability changes.

## Release-blocking checks not completed

The workspace cannot install or operate a signed iOS build on a physical iPhone. The browser preview and Expo Go are not valid substitutes for these checks:

1. Sign in on two separate authenticated accounts using a fresh signed iOS build.
2. Enable notifications on both devices and confirm an Expo push token is registered.
3. Open and accept a pack invitation from the Notifications screen.
4. Confirm chat, accommodation-ready, confirmed-stay, and itinerary-ready alerts arrive while Packyo is backgrounded or closed, and that tapping each alert opens the correct destination.
5. Complete a trip, submit separate reviews with photos from both members, and confirm each member sees their own memory guide.
6. Verify native Google and Apple sign-in, session persistence after relaunch, directions fallback, photo-library access, and calendar/export behavior.

## Reproduction / handoff

1. Create a fresh Expo Launch/TestFlight iOS build after notification capability changes.
2. Install it on two real iPhones and authenticate as two different Packyo accounts.
3. Follow `ios-trip-lifecycle-checklist.md` in order, recording the trip ID, notification title, received/not-received state, and destination opened for each push.
4. Mark the release unblocked only after every item above passes. Any missing alert should include the sender account, recipient account, app state (foreground/background/closed), timestamp, and the notification payload route.

No product failure was reproduced in the workspace checks. The blocker is the unexecuted signed-build/physical-device gate, including APNs delivery and native-provider behavior.