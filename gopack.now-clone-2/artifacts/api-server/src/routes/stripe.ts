import { Router, type RequestHandler } from "express";
import { logger } from "../lib/logger";

const router = Router();

async function getStripe() {
  const Stripe = (await import("stripe")).default;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

async function setFirebasePremium(tripId: string) {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  const dbUrl = "https://gopacknow-83d54-default-rtdb.firebaseio.com";
  const url = `${dbUrl}/trips/${tripId}.json${secret ? `?auth=${secret}` : ""}`;
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPremium: true }),
  });
}

router.post("/stripe/checkout", async (req, res) => {
  const { tripId, uid } = req.body as { tripId?: string; uid?: string };
  if (!tripId) {
    res.status(400).json({ error: "tripId is required" });
    return;
  }

  try {
    const stripe = await getStripe();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const priceId = process.env.STRIPE_PACK_PLUS_PRICE_ID;
    if (!priceId) {
      res.status(503).json({ error: "Stripe product not yet configured. Add STRIPE_PACK_PLUS_PRICE_ID." });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tripId, uid: uid ?? "" },
      success_url: `${baseUrl}/trip/${tripId}?upgraded=1`,
      cancel_url: `${baseUrl}/trip/${tripId}`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err }, "stripe checkout error");
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

export const stripeWebhookHandler: RequestHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;
  try {
    const stripe = await getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } else {
      event = JSON.parse((req.body as Buffer).toString());
    }
  } catch (err: any) {
    logger.error({ err }, "stripe webhook signature error");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const tripId = session.metadata?.tripId;
    if (tripId) {
      try {
        await setFirebasePremium(tripId);
        logger.info({ tripId }, "trip upgraded to premium");
      } catch (err) {
        logger.error({ err, tripId }, "failed to set Firebase premium");
      }
    }
  }

  res.json({ received: true });
};

router.get("/stripe/verify", async (req, res) => {
  const { sessionId, tripId } = req.query as { sessionId?: string; tripId?: string };
  if (!sessionId || !tripId) {
    res.status(400).json({ error: "sessionId and tripId are required" });
    return;
  }
  try {
    const stripe = await getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid" && session.metadata?.tripId === tripId) {
      await setFirebasePremium(tripId);
      res.json({ premium: true });
    } else {
      res.json({ premium: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const stripeRouter = router;
