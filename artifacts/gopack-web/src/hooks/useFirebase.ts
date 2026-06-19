import { useEffect, useState, useCallback } from "react";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

/* ─── usePublicReviews ──────────────────────────────────────────
   Reads /reviews — publicly written by members after their trip ends.
   Requires Firebase RTDB rules to allow ".read": true at /reviews.
──────────────────────────────────────────────────────────────── */
export function usePublicReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const reviewsRef = ref(db, "reviews");
    const unsubscribe = onValue(
      reviewsRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          const arr = Object.entries(data)
            .map(([id, v]: [string, any]) => ({ id, ...v }))
            .sort((a, b) => new Date(b.reviewedAt || 0).getTime() - new Date(a.reviewedAt || 0).getTime());
          setReviews(arr);
        } else {
          setReviews([]);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  return { reviews, loading };
}

/* ─── localStorage trip-id index ────────────────────────────────
   Firebase RTDB rules restrict reading /userTrips and root /trips.
   We keep a per-user index in localStorage so the dashboard always
   knows which trips the user has created or joined.
   Limitation: index is local to this browser only.
──────────────────────────────────────────────────────────────── */
const storageKey = (uid: string) => `gopack_trips_${uid}`;

function getLocalTripIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addLocalTripId(uid: string, tripId: string) {
  const ids = getLocalTripIds(uid);
  if (!ids.includes(tripId)) {
    localStorage.setItem(storageKey(uid), JSON.stringify([...ids, tripId]));
  }
}

/* ─── useTrips ──────────────────────────────────────────────── */
export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async (uid: string) => {
    const ids = getLocalTripIds(uid);
    if (ids.length === 0) {
      setTrips([]);
      setLoading(false);
      return;
    }
    try {
      const snaps = await Promise.all(ids.map(id => get(ref(db, `trips/${id}`))));
      const loaded = snaps
        .filter(s => s.exists())
        .map(s => ({ id: s.key, ...s.val() }));
      setTrips(loaded);
    } catch (err) {
      console.error("useTrips fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }
    fetchTrips(user.uid);
  }, [user, fetchTrips]);

  const createTrip = async (tripData: any) => {
    if (!user) return null;

    const tripsRef = ref(db, "trips");
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key!;

    const fullTripData = {
      ...tripData,
      hostMemberId: user.uid,
      createdAt: new Date().toISOString(),
      members: {
        [user.uid]: {
          name: user.displayName || "Guest",
          joinedAt: new Date().toISOString(),
          isHost: true,
        },
      },
    };

    await set(newTripRef, fullTripData);

    // Store trip ID locally so dashboard can list it
    addLocalTripId(user.uid, tripId);

    // Also attempt to write to Firebase index (works if rules allow)
    try {
      await set(ref(db, `userTrips/${user.uid}/${tripId}`), true);
    } catch {
      // Silently ignored — localStorage index is the fallback
    }

    // Refresh the trip list
    await fetchTrips(user.uid);
    return tripId;
  };

  const joinTrip = async (tripId: string, name: string) => {
    if (!user) return false;

    await update(ref(db, `trips/${tripId}/members`), {
      [user.uid]: {
        name: name || user.displayName || "Guest",
        joinedAt: new Date().toISOString(),
        isHost: false,
      },
    });

    // Store trip ID locally
    addLocalTripId(user.uid, tripId);

    try {
      await set(ref(db, `userTrips/${user.uid}/${tripId}`), true);
    } catch {
      // Silently ignored
    }

    await fetchTrips(user.uid);
    return true;
  };

  return { trips, loading, createTrip, joinTrip };
}

/* ─── useTrip ───────────────────────────────────────────────── */
export function useTrip(tripId: string) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [wishes, setWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;

    const tripRef = ref(db, `trips/${tripId}`);
    const unsubscribe = onValue(
      tripRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTrip({ id: tripId, ...data });
          if (data.wishes) {
            const wishesArray = Object.keys(data.wishes)
              .map(key => ({ id: key, ...data.wishes[key] }))
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));
            setWishes(wishesArray);
          } else {
            setWishes([]);
          }
        } else {
          setTrip(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("useTrip read error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tripId]);

  const addWish = async (text: string) => {
    if (!user || !tripId) return;
    const newWishRef = push(ref(db, `trips/${tripId}/wishes`));
    await set(newWishRef, {
      text,
      author: user.displayName || "Guest",
      memberId: user.uid,
      votes: 1,
      timestamp: new Date().toISOString(),
      votedBy: { [user.uid]: true },
    });
  };

  const toggleVote = async (wishId: string) => {
    if (!user || !tripId) return;
    const wishRef = ref(db, `trips/${tripId}/wishes/${wishId}`);
    const snapshot = await get(wishRef);
    const wish = snapshot.val();
    if (!wish) return;

    const votedBy = { ...(wish.votedBy || {}) };
    const hasVoted = !!votedBy[user.uid];
    if (hasVoted) {
      delete votedBy[user.uid];
    } else {
      votedBy[user.uid] = true;
    }

    await update(wishRef, {
      votes: hasVoted ? Math.max((wish.votes || 1) - 1, 0) : (wish.votes || 0) + 1,
      votedBy,
    });
  };

  const updateItinerary = async (itinerary: any) => {
    if (!tripId) return;
    await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
  };

  const updatePackingList = async (packingList: any) => {
    if (!tripId) return;
    await set(ref(db, `trips/${tripId}/packingList`), packingList);
  };

  const submitReview = async (reviewData: {
    rating: number;
    text: string;
    vibes: string[];
    highlight: string;
  }) => {
    if (!user || !tripId || !trip) return;
    const memberEntries = Object.values(trip.members || {}) as any[];
    const review = {
      ...reviewData,
      destination: trip.destination,
      days: trip.days,
      memberCount: memberEntries.length,
      memberNames: memberEntries.map((m: any) => m.name).filter(Boolean),
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.uid,
    };
    await set(ref(db, `trips/${tripId}/review`), review);
    await set(ref(db, `reviews/${tripId}`), review);
  };

  return { trip, wishes, loading, addWish, toggleVote, updateItinerary, updatePackingList, submitReview };
}
