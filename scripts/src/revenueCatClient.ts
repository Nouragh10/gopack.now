import { createClient } from "@replit/revenuecat-sdk/client";

export async function getUncachableRevenueCatClient() {
  const secretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!secretKey) throw new Error("REVENUECAT_SECRET_KEY is not set");
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });
}
