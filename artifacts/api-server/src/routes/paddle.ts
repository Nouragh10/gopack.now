import { Router } from "express";
import { EventName } from "@paddle/paddle-node-sdk";
import { getPaddle } from "../lib/paddle";
import { getAdminDb, getAdminApp } from "../lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { logger } from "../lib/logger";

const router = Router();

const MONTHLY_PRICE_ID = process.env.PADDLE_MONTHLY_PRICE_ID ?? "";
const YEARLY_PRICE_ID = process.env.PADDLE_YEARLY_PRICE_ID ?? "";

// ---------------------------------------------------------------------------
// Checkout — creates a Paddle transaction and returns the hosted checkout URL
// ---------------------------------------------------------------------------
router.post("/paddle/checkout", async (req, res) => {
  const { tripId, plan, uid, email, returnUrl } = req.body as {
    tripId?: string;
    plan?: "monthly" | "yearly";
    uid?: string;
    email?: string;
    returnUrl?: string;
  };

  if (!plan || !uid) {
    res.status(400).json({ error: "plan and uid are required" });
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
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const baseUrl = `https://${domain}`;

    const successUrl = returnUrl ?? (tripId ? `${baseUrl}/trip/${tripId}?upgraded=1` : `${baseUrl}/dashboard?upgraded=1`);
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customData: { tripId: tripId ?? null, uid },
      checkout: { url: successUrl },
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

// ---------------------------------------------------------------------------
// Webhook — raw body registered in app.ts BEFORE express.json()
// ---------------------------------------------------------------------------
export const paddleWebhookHandler = async (req: any, res: any) => {
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
    // Still return 200 so Paddle doesn't retry a handler bug — signature already verified
  }

  res.json({ received: true });
};

// ---------------------------------------------------------------------------
// Event router
// ---------------------------------------------------------------------------
async function handlePaddleEvent(event: any) {
  const eventType = event.eventType as string;
  const data = event.data;

  switch (eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpsert(data);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(data);
      break;
    case EventName.SubscriptionPaused:
      await handleSubscriptionPaused(data);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(data);
      break;
    case EventName.CustomerCreated:
    case EventName.CustomerUpdated:
      await handleCustomerUpsert(data);
      break;
    default:
      // Safely ignore other event types
      logger.info({ eventType }, "paddle webhook: unhandled event type (ignored)");
  }
}

// ---------------------------------------------------------------------------
// subscription.created / subscription.updated
// ---------------------------------------------------------------------------
async function handleSubscriptionUpsert(data: any) {
  const customData = data?.customData ?? {};
  const uid: string | undefined = customData.uid;
  const tripId: string | undefined = customData.tripId;
  const customerId: string | undefined = data.customerId;

  if (!uid) {
    logger.warn({ subscriptionId: data.id, customerId }, "paddle subscription event missing uid in customData");
    return;
  }

  const db = getAdminDb();

  const status: string = data.status;
  const isActive = status === "active" || status === "trialing";
  const scheduledChange = data.scheduledChange;
  const isCanceling = scheduledChange?.action === "cancel" && isActive;
  const currentPeriodEnd: string | null = data.currentBillingPeriod?.endsAt ?? null;

  // Upsert userPremium — keyed on uid, idempotent
  await db.ref(`userPremium/${uid}`).set({
    active: isActive,
    cancelAtPeriodEnd: isCanceling,
    subscriptionId: data.id,
    customerId: customerId ?? null,
    status,
    currentPeriodEnd,
    updatedAt: new Date().toISOString(),
  });

  // Store reverse mapping customerId → uid so portal can resolve without trusting client
  if (customerId) {
    await db.ref(`paddleCustomers/${customerId}`).set({
      uid,
      email: data.customer?.email ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  if (tripId && isActive) {
    await db.ref(`trips/${tripId}/premiumGrantedBy`).set(uid);
  }

  logger.info({ uid, tripId, status, isActive, customerId }, "paddle subscription upserted");
}

// ---------------------------------------------------------------------------
// subscription.canceled
// ---------------------------------------------------------------------------
async function handleSubscriptionCanceled(data: any) {
  const customData = data?.customData ?? {};
  const uid: string | undefined = customData.uid;
  if (!uid) return;

  const db = getAdminDb();
  await db.ref(`userPremium/${uid}`).update({
    active: false,
    cancelAtPeriodEnd: false,
    status: "canceled",
    updatedAt: new Date().toISOString(),
  });
  logger.info({ uid, subscriptionId: data.id }, "paddle subscription canceled");
}

// ---------------------------------------------------------------------------
// subscription.paused
// ---------------------------------------------------------------------------
async function handleSubscriptionPaused(data: any) {
  const customData = data?.customData ?? {};
  const uid: string | undefined = customData.uid;
  if (!uid) return;

  const db = getAdminDb();
  await db.ref(`userPremium/${uid}`).update({
    active: false,
    status: "paused",
    updatedAt: new Date().toISOString(),
  });
  logger.info({ uid, subscriptionId: data.id }, "paddle subscription paused");
}

// ---------------------------------------------------------------------------
// transaction.completed — idempotent upsert in case subscription event is delayed
// ---------------------------------------------------------------------------
async function handleTransactionCompleted(data: any) {
  const customData = data?.customData ?? {};
  const uid: string | undefined = customData.uid;
  const tripId: string | undefined = customData.tripId;
  const customerId: string | undefined = data.customerId;

  if (!uid) return;

  const db = getAdminDb();

  // Only write if no active subscription record yet (subscription event is authoritative)
  const existing = await db.ref(`userPremium/${uid}`).get();
  const existingVal = existing.val();
  if (existingVal?.active === true) {
    logger.info({ uid }, "paddle transaction.completed: subscription already active, skipping");
    return;
  }

  await db.ref(`userPremium/${uid}`).update({
    active: true,
    cancelAtPeriodEnd: false,
    customerId: customerId ?? null,
    status: "active",
    updatedAt: new Date().toISOString(),
  });

  if (customerId) {
    await db.ref(`paddleCustomers/${customerId}`).set({
      uid,
      email: data.customer?.email ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  if (tripId) {
    await db.ref(`trips/${tripId}/premiumGrantedBy`).set(uid);
  }

  logger.info({ uid, tripId, customerId }, "paddle transaction completed, premium granted");
}

// ---------------------------------------------------------------------------
// customer.created / customer.updated — mirror customer record
// ---------------------------------------------------------------------------
async function handleCustomerUpsert(data: any) {
  const customerId: string = data.id;
  const email: string | undefined = data.email;

  const db = getAdminDb();

  // Merge into existing record so we don't clobber the uid link set by subscription events
  const snap = await db.ref(`paddleCustomers/${customerId}`).get();
  const existing = snap.val() ?? {};

  await db.ref(`paddleCustomers/${customerId}`).set({
    ...existing,
    email: email ?? existing.email ?? null,
    updatedAt: new Date().toISOString(),
  });

  logger.info({ customerId, email }, "paddle customer upserted");
}

// ---------------------------------------------------------------------------
// Customer portal — requires Firebase ID token in Authorization header
// Server resolves Paddle customer ID from DB; never trusts client-supplied ID
// ---------------------------------------------------------------------------
router.post("/paddle/portal", async (req, res) => {
  // 1. Verify Firebase ID token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  let uid: string;
  try {
    const idToken = authHeader.slice(7);
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err: any) {
    logger.warn({ err }, "paddle portal: invalid Firebase ID token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 2. Resolve Paddle customer ID from DB — never trust a client-supplied value
  const db = getAdminDb();
  const premiumSnap = await db.ref(`userPremium/${uid}`).get();
  const premium = premiumSnap.val();
  const customerId: string | undefined = premium?.customerId;

  if (!customerId) {
    res.status(404).json({ error: "No Paddle subscription found for this account" });
    return;
  }

  // 3. Mint a Paddle customer portal session
  try {
    const paddle = getPaddle();
    const session = await (paddle.customerPortalSessions as any).create(customerId, []);
    const portalUrl = session?.urls?.general?.overview ?? session?.url;

    if (!portalUrl) {
      res.status(500).json({ error: "Paddle did not return a portal URL" });
      return;
    }

    res.json({ url: portalUrl });
  } catch (err: any) {
    logger.error({ err, customerId }, "paddle portal session error");
    res.status(500).json({ error: err.message ?? "Failed to create portal session" });
  }
});

// ---------------------------------------------------------------------------
// Subscription status lookup (internal use)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Prices (used by the pricing page)
// ---------------------------------------------------------------------------
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
