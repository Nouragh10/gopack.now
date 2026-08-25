export default function Refunds() {
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: 720,
      margin: "0 auto",
      padding: "40px 20px 80px",
      lineHeight: 1.6,
      color: "#1a1a1a",
    }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Refund &amp; Cancellation Policy</h1>
      <p style={{ color: "#777", fontSize: 14, marginBottom: 32 }}>Last updated: July 9, 2026</p>

      <p>GoPackNow subscriptions are processed by <strong>Paddle.com</strong>, our Merchant of Record. Paddle handles all billing, refunds, and payment disputes on our behalf.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>Cancellation</h2>
      <p>You may cancel your GoPackNow Plus subscription at any time. Cancellations take effect at the end of your current billing period — you retain access to Plus features until then. After the period ends your subscription will not renew and you will revert to the starter tier.</p>
      <p>To cancel: go to your <strong>Profile</strong> page in the app and tap <strong>Manage Subscription</strong>, or email us at <a href="mailto:support@gopack.now" style={{ color: "#E85D3A" }}>support@gopack.now</a>.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>Refunds</h2>
      <p>We offer a <strong>14-day money-back guarantee</strong> for new subscriptions. If you are not satisfied within the first 14 days of your initial subscription, contact us and we will issue a full refund — no questions asked.</p>
      <p>Refunds are not available for:</p>
      <ul style={{ paddingLeft: 22 }}>
        <li>Renewal charges where a cancellation reminder was not acted on</li>
        <li>Partial billing periods</li>
        <li>Charges older than 14 days (except where required by applicable law)</li>
      </ul>
      <p>If you believe you were charged in error, contact us within 30 days and we will investigate promptly.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>How to Request a Refund</h2>
      <p>Email <a href="mailto:support@gopack.now" style={{ color: "#E85D3A" }}>support@gopack.now</a> with your account email and a brief description. We aim to respond within 2 business days. Approved refunds are processed by Paddle and typically appear on your statement within 5–10 business days depending on your bank.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>Disputes</h2>
      <p>Because Paddle is our Merchant of Record, any billing disputes or chargebacks are handled by Paddle. You can also contact Paddle directly via their <a href="https://www.paddle.com/support" style={{ color: "#E85D3A" }} target="_blank" rel="noopener noreferrer">support page</a>.</p>

      <h2 style={{ fontSize: 20, marginTop: 36, marginBottom: 10 }}>Contact</h2>
      <div style={{ background: "#f7f7f7", borderRadius: 10, padding: "16px 20px", marginTop: 12 }}>
        <p style={{ margin: 0 }}>Questions about billing or refunds?</p>
        <p style={{ margin: "4px 0 0" }}>
          <a href="mailto:support@gopack.now" style={{ color: "#E85D3A" }}>support@gopack.now</a>
        </p>
      </div>
    </div>
  );
}
