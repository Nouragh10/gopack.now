import { useEffect, useState } from "react";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

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

    const tripsRef = ref(db, 'trips');
    const unsubscribe = onValue(tripsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tripsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        const myTrips = tripsArray.filter(t => t.members && t.members[user.uid]);
        setTrips(myTrips);
      } else {
        setTrips([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("useTrips read error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const createTrip = async (tripData: any) => {
    if (!user) return null;

    const tripsRef = ref(db, 'trips');
    const newTripRef = push(tripsRef);
    const tripId = newTripRef.key;

    const fullTripData = {
      ...tripData,
      hostMemberId: user.uid,
      createdAt: new Date().toISOString(),
      members: {
        [user.uid]: {
          name: user.displayName || 'Guest',
          joinedAt: new Date().toISOString(),
          isHost: true
        }
      }
    };

    await set(newTripRef, fullTripData);
    return tripId;
  };

  const joinTrip = async (tripId: string, name: string) => {
    if (!user) return false;

    // Use update at the members level to avoid overwriting other members
    const membersRef = ref(db, `trips/${tripId}/members`);
    await update(membersRef, {
      [user.uid]: {
        name: name || user.displayName || 'Guest',
        joinedAt: new Date().toISOString(),
        isHost: false
      }
    });
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
    const unsubscribe = onValue(tripRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTrip({ id: tripId, ...data });

        if (data.wishes) {
          const wishesArray = Object.keys(data.wishes).map(key => ({
            id: key,
            ...data.wishes[key]
          })).sort((a, b) => (b.votes || 0) - (a.votes || 0));
          setWishes(wishesArray);
        } else {
          setWishes([]);
        }
      } else {
        setTrip(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("useTrip read error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tripId]);

  const addWish = async (text: string) => {
    if (!user || !tripId) return;

    const wishesRef = ref(db, `trips/${tripId}/wishes`);
    const newWishRef = push(wishesRef);

    await set(newWishRef, {
      text,
      author: user.displayName || 'Guest',
      memberId: user.uid,
      votes: 1,
      timestamp: new Date().toISOString(),
      votedBy: { [user.uid]: true }
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
      votes: hasVoted ? (wish.votes || 1) - 1 : (wish.votes || 0) + 1,
      votedBy
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
