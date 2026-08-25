import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

const STARTER_FEATURES = [
  "Up to 5 trip members",
  "Shared wishlist & voting",
  "2 AI itinerary generations",
  "2 AI packing list generations",
  "Realtime group chat",
];

const PLUS_FEATURES = [
  "Up to 20 trip members",
  "Unlimited AI itinerary generations",
  "Unlimited AI packing list regenerations",
  "One purchase unlocks for your whole trip group",
  "Realtime group chat",
  "Priority support",
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    if (authLoading) return; // wait for Firebase to resolve auth state
    if (!user) {
      sessionStorage.setItem("gopack_auth_redirect", "/pricing");
      setLocation("/login");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/paddle/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: billing,
          uid: user.uid,
          email: user.email ?? undefined,
          returnUrl: `${window.location.origin}/dashboard?upgraded=1`,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || "Could not start checkout");
      }

      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      minHeight: "100vh",
      background: "#faf9f7",
      color: "#1a1a1a",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: "#E85D3A", textTransform: "uppercase", marginBottom: 12 }}>
            Pricing
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15 }}>
            Simple, group-friendly pricing
          </h1>
          <p style={{ fontSize: 18, color: "#555", margin: 0 }}>
            One person pays. Everyone on the trip gets Plus.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex",
            background: "#ece9e3",
            borderRadius: 999,
            padding: 4,
            gap: 4,
          }}>
            <button
              onClick={() => setBilling("monthly")}
              style={{
                padding: "8px 22px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: billing === "monthly" ? "#fff" : "transparent",
                color: billing === "monthly" ? "#1a1a1a" : "#666",
                boxShadow: billing === "monthly" ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              style={{
                padding: "8px 22px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                background: billing === "yearly" ? "#fff" : "transparent",
                color: billing === "yearly" ? "#1a1a1a" : "#666",
                boxShadow: billing === "yearly" ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                transition: "all 0.15s",
              }}
            >
              Yearly&nbsp;&nbsp;<span style={{ background: "#E85D3A", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 8px" }}>Save 83%</span>
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {/* Starter tier */}
          <div style={{
            background: "#fff",
            borderRadius: 20,
            border: "2px solid #e8e4dd",
            padding: "36px 32px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>Starter</p>
            <p style={{ fontSize: 40, fontWeight: 800, margin: "0 0 4px" }}>$0</p>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 28 }}>Core trip planning</p>
            <button
              onClick={() => setLocation(user ? "/dashboard" : "/login")}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 999,
                border: "2px solid #e8e4dd",
                background: "transparent",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                marginBottom: 28,
                color: "#1a1a1a",
              }}
            >
              Get started
            </button>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {STARTER_FEATURES.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#333" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#f0ede7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={11} color="#888" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Plus tier */}
          <div style={{
            background: "#1a1a1a",
            borderRadius: 20,
            border: "2px solid #1a1a1a",
            padding: "36px 32px",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "#E85D3A",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 999,
            }}>
              Popular
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#E85D3A", marginBottom: 8 }}>GoPackNow Plus</p>
            <p style={{ fontSize: 40, fontWeight: 800, margin: "0 0 4px", color: "#fff" }}>
              {billing === "yearly" ? "$19.99" : "$9.99"}
            </p>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 4 }}>
              {billing === "yearly" ? "per year, billed annually · ~$1.67/mo" : "per month, billed monthly"}
            </p>
            <p style={{ color: "#666", fontSize: 12, marginBottom: 28 }}>
              Renews at {billing === "yearly" ? "$19.99/year" : "$9.99/month"} until cancelled
            </p>

            {error && (
              <p style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</p>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading || authLoading}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 999,
                border: "none",
                background: (loading || authLoading) ? "#c4472a" : "#E85D3A",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: (loading || authLoading) ? "not-allowed" : "pointer",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: (loading || authLoading) ? 0.8 : 1,
                transition: "background 0.15s",
              }}
            >
              {(loading || authLoading) && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
              {loading ? "Loading…" : authLoading ? "Loading…" : "Start planning"}
            </button>
            <p style={{ color: "#555", fontSize: 11, textAlign: "center", marginBottom: 28 }}>
              Taxes may apply and will be calculated at checkout.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {PLUS_FEATURES.map(f => (
                <li key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#ccc" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#E85D3A22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={11} color="#E85D3A" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 48, color: "#888", fontSize: 14 }}>
          <p>All payments processed securely by <strong>Paddle</strong> · Cancel anytime · <a href="/refunds" style={{ color: "#E85D3A" }}>14-day money-back guarantee</a></p>
          <p style={{ marginTop: 8, fontSize: 13, color: "#aaa" }}>
            Taxes may apply and will be calculated at checkout.
          </p>
          <p style={{ marginTop: 8 }}>
            <a href="/terms" style={{ color: "#888", marginRight: 16 }}>Terms of Service</a>
            <a href="/privacy" style={{ color: "#888", marginRight: 16 }}>Privacy Policy</a>
            <a href="/refunds" style={{ color: "#888" }}>Refund Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
