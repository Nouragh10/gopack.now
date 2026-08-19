import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const premiumTripsTable = pgTable("premium_trips", {
  id: serial("id").primaryKey(),
  tripId: text("trip_id").notNull().unique(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  purchasedByUid: text("purchased_by_uid"),
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
});

export type PremiumTrip = typeof premiumTripsTable.$inferSelect;
export type InsertPremiumTrip = typeof premiumTripsTable.$inferInsert;
