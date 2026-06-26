export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#2B2723",
        color: "#FFFDF9",
        fontFamily: "sans-serif",
        gap: "16px",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "48px" }}>🌍</div>
      <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px" }}>
        go<span style={{ color: "#E85D3A" }}>pack</span>now
      </div>
      <div style={{ fontSize: "16px", color: "#A89F98", maxWidth: "320px", lineHeight: 1.6 }}>
        The web app is temporarily offline. Download the mobile app to keep planning your trip.
      </div>
    </div>
  );
}
