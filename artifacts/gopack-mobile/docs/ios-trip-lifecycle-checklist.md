# Packyo iOS trip-lifecycle verification

Run these checks on a physical iPhone using a fresh EAS preview or production build. Expo Go cannot validate remote push delivery.

1. Confirm `POST /api/reserve-invite-code` on Packyo's published domain returns
   `401` (not `404`) without a bearer token. Then sign in, create a trip, and
   select an existing pack. Confirm pack members receive an invite and the trip
   appears in the pack.
2. Create another trip with a new inline pack name. Confirm both records remain available after relaunching.
3. Join from a second account using only the eight-character invite code. Also verify a legacy `/join/<trip-id>` link.
4. Open accommodation voting. Confirm every swipe and ranked card has a photo or stable hotel fallback.
5. Open an itinerary activity and tap directions. Google Maps should open when installed; after uninstalling it, Safari should open Google Maps web.
6. In Notifications, tap **Enable** and allow permission. Trigger chat, itinerary-ready, and confirmed-stay updates from another member; tap each alert and verify its Packyo destination.
7. Set a test trip's end date in the past. Submit a rating, text, and photos, then create/open the AI memory guide.
8. Open Profile and confirm all confirmed accommodations appear under **My stays**, with images and working trip links.
9. With four members, verify a wish with two upvotes is included and a wish with one upvote is excluded from both Voting Summary and the generated itinerary.

Production push delivery additionally requires valid Apple Push Notification credentials in the Expo/EAS project and a newly installed build after notification capability changes.