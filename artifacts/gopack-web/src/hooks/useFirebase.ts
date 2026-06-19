import { useEffect, useState } from "react";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

// useTrips reads the user's personal trip index (userTrips/${uid})
// and then fetches each trip individually — avoids reading the root /trips
// node which Firebase rules typically lock down.
export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const userTripsRef = ref(db, `userTrips/${user.uid}`);
    const unsubscribe = onValue(
      userTripsRef,
      async (snapshot) => {
        const index = snapshot.val();
        const tripIds = index ? Object.keys(index) : [];

        if (tripIds.length === 0) {
          setTrips([]);
          setLoading(false);
          return;
        }

        try {
          const snaps = await Promise.all(tripIds.map(id => get(ref(db, `trips/${id}`))));
          const loaded = snaps
            .filter(s => s.exists())
            .map(s => ({ id: s.key, ...s.val() }));
          setTrips(loaded);
        } catch (err) {
          console.error("useTrips fetch error:", err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("useTrips index error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

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
    // Index this trip under the user so useTrips can find it
    await set(ref(db, `userTrips/${user.uid}/${tripId}`), true);
    return tripId;
  };

  const joinTrip = async (tripId: string, name: string) => {
    if (!user) return false;

    // Add member entry using update so other members are not overwritten
    await update(ref(db, `trips/${tripId}/members`), {
      [user.uid]: {
        name: name || user.displayName || "Guest",
        joinedAt: new Date().toISOString(),
        isHost: false,
      },
    });

    // Index this trip under the user
    await set(ref(db, `userTrips/${user.uid}/${tripId}`), true);
    return true;
  };

  return { trips, loading, createTrip, joinTrip };
}

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

  return { trip, wishes, loading, addWish, toggleVote, updateItinerary, updatePackingList };
}
