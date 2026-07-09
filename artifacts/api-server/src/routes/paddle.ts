import { Router } from "express";
import { EventName } from "@paddle/paddle-node-sdk";
import { getPaddle } from "../lib/paddle";
import { getAdminDb } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

const router = Router();

const MONTHLY_PRICE_ID = process.env.PADDLE_MONTHLY_PRICE_ID ?? "";
const YEARLY_PRICE_ID = process.env.PADDLE_YEARLY_PRICE_ID ?? "";

router.post("/paddle/checkout", async (req, res) => {
  const { tripId, plan, uid, email, returnUrl } = req.body as {
    tripId?: string;
    plan?: "monthly" | "yearly";
    uid?: string;
    email?: string;
    returnUrl?: string;
  };

  if (!tripId || !plan || !uid) {
    res.status(400).json({ error: "tripId, plan, and uid are required" });
    return;
  }

  const priceId = plan === "yearly" ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
  if (!priceId) {
    res.status(503).json({
      error: `Paddle price ID for '${plan}' plan not configured. Set PADDLE_MONTHLY_PRICE_ID and PADDLE_YEARLY_PRICE_ID.`,
    });
    return;
  }

  try {
    const paddle = getPaddle();
    const domain =
      process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { tripId, uid },
      checkout: { url: returnUrl ?? `${baseUrl}/trip/${tripId}?upgraded=1` },
    });

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      res.status(500).json({ error: "Paddle did not return a checkout URL" });
      return;
    }
    res.json({ url: checkoutUrl });
  } catch (err: any) {
    logger.error({ err }, "paddle checkout error");
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

export const paddleWebhookHandler = async (
  req: any,
  res: any,
) => {
  const signature = req.headers["paddle-signature"] as string | undefined;
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    res.status(400).json({ error: "Missing paddle-signature or webhook secret" });
    return;
  }

  let event: any;
  try {
    const paddle = getPaddle();
    const rawBody = (req.body as Buffer).toString("utf-8");
    event = paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
  } catch (err: any) {
    logger.error({ err }, "paddle webhook signature error");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  try {
    await handlePaddleEvent(event);
  } catch (err: any) {
    logger.error({ err, eventType: event?.eventType }, "paddle webhook handler error");
  }

  res.json({ received: true });
};

async function handlePaddleEvent(event: any) {
  const data = event.data;
  const customData = data?.customData ?? {};
  const uid: string | undefined = customData.uid;
  const tripId: string | undefined = customData.tripId;

  if (!uid) return;

  const db = getAdminDb();
  const userPremiumRef = db.ref(`userPremium/${uid}`);
  const eventType = event.eventType as string;

  if (
    eventType === EventName.SubscriptionCreated ||
    eventType === EventName.SubscriptionUpdated
  ) {
    const status = data.status;
    const isActive = status === "active" || status === "trialing";
    const scheduledChange = data.scheduledChange;
    const isCanceling =
      scheduledChange?.action === "cancel" && isActive;

    const currentPeriodEnd: string | null =
      data.currentBillingPeriod?.endsAt ?? null;

    await userPremiumRef.set({
      active: isActive && !isCanceling,
      cancelAtPeriodEnd: isCanceling,
      subscriptionId: data.id,
      status,
      currentPeriodEnd,
      updatedAt: new Date().toISOString(),
    });

    if (tripId && isActive) {
      await db.ref(`trips/${tripId}/premiumGrantedBy`).set(uid);
    }

    logger.info({ uid, tripId, status, isActive }, "paddle subscription updated");
  } else if (eventType === EventName.SubscriptionCanceled) {
    await userPremiumRef.update({
      active: false,
      cancelAtPeriodEnd: false,
      status: "canceled",
      updatedAt: new Date().toISOString(),
    });
    logger.info({ uid }, "paddle subscription canceled");
  } else if (eventType === EventName.SubscriptionPaused) {
    await userPremiumRef.update({
      active: false,
      status: "paused",
      updatedAt: new Date().toISOString(),
    });
    logger.info({ uid }, "paddle subscription paused");
  }
}

router.get("/paddle/subscription", async (req, res) => {
  const uid = req.query.uid as string | undefined;
  if (!uid) {
    res.status(400).json({ error: "uid is required" });
    return;
  }
  try {
    const db = getAdminDb();
    const snap = await db.ref(`userPremium/${uid}`).get();
    res.json({ premium: snap.exists() ? snap.val() : null });
  } catch (err: any) {
    logger.error({ err }, "paddle subscription fetch error");
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

router.get("/paddle/prices", async (_req, res) => {
  res.json({
    monthly: {
      priceId: MONTHLY_PRICE_ID,
      amount: 999,
      currency: "USD",
      interval: "month",
    },
    yearly: {
      priceId: YEARLY_PRICE_ID,
      amount: 1999,
      currency: "USD",
      interval: "year",
    },
  });
});

export { router as paddleRouter };
