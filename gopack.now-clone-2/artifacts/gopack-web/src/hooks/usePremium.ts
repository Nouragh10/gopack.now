import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

export interface PremiumStatus {
  active: boolean;
  cancelAtPeriodEnd?: boolean;
  subscriptionId?: string;
  status?: string;
  currentPeriodEnd?: string | null;
}

export function useUserPremium(): { premium: PremiumStatus | null; loading: boolean } {
  const { user } = useAuth();
  const [premium, setPremium] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setPremium(null);
      setLoading(false);
      return;
    }

    const r = ref(db, `userPremium/${user.uid}`);
    const unsub = onValue(
      r,
      (snap) => {
        setPremium(snap.exists() ? (snap.val() as PremiumStatus) : null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return () => unsub();
  }, [user?.uid]);

  return { premium, loading };
}

export function useTripPremium(trip: any): boolean {
  const { user } = useAuth();
  const { premium } = useUserPremium();

  if (!trip) return false;

  const currentUserHasPremium = premium?.active === true;

  const premiumGrantedBy: string | undefined = trip.premiumGrantedBy;
  const members: Record<string, any> = trip.members ?? {};
  const memberUids = Object.keys(members);
  const grantorIsMember =
    premiumGrantedBy && memberUids.includes(premiumGrantedBy);

  const tripPaidFor = !!trip.isPremium;

  return currentUserHasPremium || grantorIsMember || tripPaidFor;
}
