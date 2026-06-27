export default function Privacy() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: 720,
      margin: "0 auto",
      padding: "40px 20px 80px",
      lineHeight: 1.6,
      color: "#1a1a1a",
    }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#777", fontSize: 14, marginBottom: 32 }}>Last updated: June 27, 2026</p>

      <p>gopack.now ("gopack," "we," "us," or "our") provides a collaborative group travel planning app. This policy explains what information we collect, how we use it, and your choices.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>1. Information We Collect</h2>

      <h3 style={{ fontSize: 16, marginTop: 20, marginBottom: 6 }}>Account Information</h3>
      <p>When you sign up, we use Firebase Authentication to manage your account. This includes your name, email address, and (if you sign in with Google) your Google profile name and photo.</p>

      <h3 style={{ fontSize: 16, marginTop: 20, marginBottom: 6 }}>Trip &amp; Usage Data</h3>
      <p>We store the information you create while using the app in Firebase Realtime Database, including:</p>
      <ul style={{ paddingLeft: 22 }}>
        <li>Trips you create or join, including destinations, dates, and trip names</li>
        <li>Wishlist items, votes, and chat messages shared with your trip group</li>
        <li>Itineraries and packing lists generated for your trips</li>
        <li>Your membership and role within a trip (e.g. host or guest)</li>
      </ul>
      <p>This information is visible to other members of the same trip, since the app is designed for group collaboration.</p>

      <h3 style={{ fontSize: 16, marginTop: 20, marginBottom: 6 }}>Purchase Information</h3>
      <p>If you unlock a trip, subscribe to Plus, or subscribe to Pro, your purchase is processed through Apple's In-App Purchase system and managed by RevenueCat, our subscription management provider. RevenueCat receives a device/user identifier and transaction details (product purchased, price, renewal status) to verify your purchase and manage your entitlements. We do not see or store your payment card details — these are handled entirely by Apple.</p>

      <h3 style={{ fontSize: 16, marginTop: 20, marginBottom: 6 }}>Device &amp; Diagnostic Information</h3>
      <p>We may collect basic technical information such as app version, device type, and crash/error logs to help us fix bugs and improve the app.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>2. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 22 }}>
        <li>To operate the core functionality of the app — creating trips, syncing wishlists, generating itineraries</li>
        <li>To verify and manage purchases and subscriptions</li>
        <li>To communicate with you about your account or trips (e.g. notifications when someone joins your trip)</li>
        <li>To maintain, debug, and improve the app</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>3. How We Share Your Information</h2>
      <p>We do not sell your personal information. We share data only with the service providers necessary to run the app:</p>
      <ul style={{ paddingLeft: 22 }}>
        <li><strong>Firebase (Google)</strong> — authentication and data storage</li>
        <li><strong>RevenueCat</strong> — subscription and purchase management</li>
        <li><strong>Apple</strong> — payment processing for in-app purchases</li>
        <li><strong>Anthropic</strong> — trip details are sent to generate AI itineraries and packing lists; this data is used only to generate your results and is not used to train AI models</li>
      </ul>
      <p>Trip content (wishlist items, votes, chat, itinerary) is shared with the other members of that specific trip, since that's the point of the app.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>4. Data Retention &amp; Deletion</h2>
      <p>We retain your account and trip data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting us at <a href="mailto:support@gopack.now" style={{ color: "#E85D3A" }}>support@gopack.now</a>.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>5. Your Choices</h2>
      <ul style={{ paddingLeft: 22 }}>
        <li>You can edit or delete trip content you've created directly in the app</li>
        <li>You can manage or cancel subscriptions through your Apple ID account settings</li>
        <li>You can request a copy of your data or full account deletion by emailing us</li>
      </ul>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>6. Children's Privacy</h2>
      <p>gopack.now is not directed at children under 13, and we do not knowingly collect personal information from children under 13.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>7. Changes to This Policy</h2>
      <p>We may update this policy as the app evolves. We'll update the "Last updated" date above when changes are made.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>8. Contact Us</h2>
      <div style={{ background: "#f7f7f7", borderRadius: 10, padding: "16px 20px", marginTop: 12 }}>
        <p style={{ margin: 0 }}>Questions about this policy or your data?</p>
        <p style={{ margin: "4px 0 0" }}>
          <a href="mailto:support@gopack.now" style={{ color: "#E85D3A" }}>support@gopack.now</a>
        </p>
      </div>
    </div>
  );
}
