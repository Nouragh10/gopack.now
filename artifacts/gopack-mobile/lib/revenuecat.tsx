import React, { createContext, useContext } from "react";
import Purchases from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";

// GoPackNow is iOS-only — one public key covers all environments.
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "pack_plus";
export const DAY_UNLOCK_PACKAGE_IDENTIFIER = "day_unlock_299";
export const TRIP_UNLOCK_PACKAGE_IDENTIFIER = "trip_unlock";

// Tracks whether configure() succeeded — guards all Purchases.* calls below.
let revenueCatInitialized = false;

export function initializeRevenueCat() {
  if (!REVENUECAT_API_KEY) {
    console.warn("RevenueCat: EXPO_PUBLIC_REVENUECAT_IOS_API_KEY not set — subscription features disabled.");
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    revenueCatInitialized = true;
    console.log("RevenueCat configured successfully.");
  } catch (err) {
    console.warn("RevenueCat: configure() failed —", err);
  }
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: async () => {
      return Purchases.getCustomerInfo();
    },
    enabled: revenueCatInitialized,
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: async () => {
      return Purchases.getOfferings();
    },
    enabled: revenueCatInitialized,
    staleTime: 0,
    retry: 3,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (packageToPurchase: any) => {
      if (!revenueCatInitialized) throw new Error("Purchases not available.");
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!revenueCatInitialized) throw new Error("Purchases not available.");
      return Purchases.restorePurchases();
    },
    onSuccess: () => customerInfoQuery.refetch(),
  });

  const isSubscribed =
    revenueCatInitialized &&
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER] !== undefined;

  const packages = offeringsQuery.data?.current?.availablePackages ?? [];

  const monthlyPackage = packages.find((p) => p.identifier === "$rc_monthly");
  const annualPackage = packages.find((p) => p.identifier === "yearly_pro_1999");
  const tripUnlockPackage = packages.find((p) => p.identifier === TRIP_UNLOCK_PACKAGE_IDENTIFIER);
  const dayUnlockPackage = packages.find((p) => p.identifier === DAY_UNLOCK_PACKAGE_IDENTIFIER);

  return {
    isRevenueCatAvailable: revenueCatInitialized,
    customerInfo: customerInfoQuery.data,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: revenueCatInitialized && (customerInfoQuery.isLoading || offeringsQuery.isLoading),
    offeringsLoading: revenueCatInitialized && (offeringsQuery.isLoading || offeringsQuery.isFetching),
    offeringsError: offeringsQuery.isError,
    refetchOfferings: offeringsQuery.refetch,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    monthlyPackage,
    annualPackage,
    tripUnlockPackage,
    dayUnlockPackage,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}
