import { useEffect, useState } from "react";
import { db, get, onValue, push, ref, set, update } from "@/lib/firebase";

export interface Trip {
  id: string;
  destination: string;
  days: number;
  vibes: string[];
  budget: string;
  startDate: string | null;
  memberIds: Record<string, boolean>;
  memberNames: Record<string, string>;
  createdAt: number;
  inviteCode: string;
  itinerary?: { title: string; days: ItineraryDay[] };
}

export interface Wish {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  votes: number;
  voters: Record<string, boolean>;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  timestamp: number;
}

export interface ItineraryDay {
  dayNumber: number;
  city: string;
  theme: string;
  activities: Activity[];
}

export interface Activity {
  time: string;
  name: string;
  description: string;
  tag: string;
  fromWish: boolean;
  suggester: string;
  estimatedCost: number;
  labels: string[];
  nearPrevious: boolean;
}

export function useTrips(uid: string | undefined) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setTrips([]);
      setLoading(false);
      return;
    }
    const userTripsRef = ref(db, `users/${uid}/trips`);
    return onValue(userTripsRef, async (snapshot) => {
      const tripIds = snapshot.val() as Record<string, boolean> | null;
      if (!tripIds) {
        setTrips([]);
        setLoading(false);
        return;
      }
      const ids = Object.keys(tripIds);
      const snaps = await Promise.all(ids.map((id) => get(ref(db, `trips/${id}`))));
      const data: Trip[] = snaps
        .map((s, i) => (s.exists() ? ({ id: ids[i], ...s.val() } as Trip) : null))
        .filter((t): t is Trip => t !== null)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setTrips(data);
      setLoading(false);
    });
  }, [uid]);

  return { trips, loading };
}

export function useTrip(tripId: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    const tripRef = ref(db, `trips/${tripId}`);
    return onValue(tripRef, (snap) => {
      setTrip(snap.exists() ? ({ id: tripId, ...snap.val() } as Trip) : null);
      setLoading(false);
    });
  }, [tripId]);

  return { trip, loading };
}

export function useWishes(tripId: string | undefined) {
  const [wishes, setWishes] = useState<Wish[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const wishRef = ref(db, `trips/${tripId}/wishes`);
    return onValue(wishRef, (snap) => {
      const data = snap.val() as Record<string, Omit<Wish, "id">> | null;
      if (!data) { setWishes([]); return; }
      const list = Object.entries(data).map(([id, w]) => ({ id, ...w } as Wish));
      setWishes(list.sort((a, b) => b.votes - a.votes));
    });
  }, [tripId]);

  return wishes;
}

export function useChat(tripId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const chatRef = ref(db, `trips/${tripId}/chat`);
    return onValue(chatRef, (snap) => {
      const data = snap.val() as Record<string, Omit<ChatMessage, "id">> | null;
      if (!data) { setMessages([]); return; }
      const list = Object.entries(data).map(([id, m]) => ({ id, ...m } as ChatMessage));
      setMessages(list.sort((a, b) => a.timestamp - b.timestamp));
    });
  }, [tripId]);

  return messages;
}

export function usePublicReviews(limit = 6) {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    return onValue(ref(db, "reviews"), (snap) => {
      const data = snap.val();
      if (!data) return;
      const list = Object.entries(data).map(([id, r]: [string, any]) => ({
        id,
        text: r.text ?? r.review ?? "",
        destination: r.destination ?? "",
        vibes: r.vibes ?? (r.vibeLabel ? r.vibeLabel.split(" & ") : []),
        memberNames: r.memberNames ?? (r.authorName ? [r.authorName] : []),
      }));
      setReviews(list.slice(0, limit));
    });
  }, [limit]);

  return reviews;
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 8);
}

function genCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

export async function createTrip(data: {
  destination: string;
  days: number;
  vibes: string[];
  budget: string;
  startDate: string | null;
  uid: string;
  displayName: string;
}) {
  const tripId = genId();
  const inviteCode = genCode();
  const tripData = {
    destination: data.destination,
    days: data.days,
    vibes: data.vibes,
    budget: data.budget,
    startDate: data.startDate,
    memberIds: { [data.uid]: true },
    memberNames: { [data.uid]: data.displayName },
    createdAt: Date.now(),
    inviteCode,
  };
  const updates: Record<string, unknown> = {};
  updates[`trips/${tripId}`] = tripData;
  updates[`users/${data.uid}/trips/${tripId}`] = true;
  updates[`inviteCodes/${inviteCode}`] = tripId;
  await update(ref(db), updates);
  return tripId;
}

export async function joinTrip(code: string, uid: string, displayName: string) {
  const snap = await get(ref(db, `inviteCodes/${code.toUpperCase()}`));
  if (!snap.exists()) throw new Error("Invalid invite code");
  const tripId = snap.val() as string;
  const updates: Record<string, unknown> = {};
  updates[`trips/${tripId}/memberIds/${uid}`] = true;
  updates[`trips/${tripId}/memberNames/${uid}`] = displayName;
  updates[`users/${uid}/trips/${tripId}`] = true;
  await update(ref(db), updates);
  return tripId;
}

export async function addWish(tripId: string, text: string, uid: string, displayName: string) {
  const wishRef = push(ref(db, `trips/${tripId}/wishes`));
  await set(wishRef, {
    text,
    authorId: uid,
    authorName: displayName,
    votes: 0,
    voters: {},
    createdAt: Date.now(),
  });
}

export async function voteWish(
  tripId: string,
  wishId: string,
  uid: string,
  currentVotes: number,
  hasVoted: boolean,
) {
  const updates: Record<string, unknown> = {};
  if (hasVoted) {
    updates[`trips/${tripId}/wishes/${wishId}/votes`] = Math.max(0, currentVotes - 1);
    updates[`trips/${tripId}/wishes/${wishId}/voters/${uid}`] = null;
  } else {
    updates[`trips/${tripId}/wishes/${wishId}/votes`] = currentVotes + 1;
    updates[`trips/${tripId}/wishes/${wishId}/voters/${uid}`] = true;
  }
  await update(ref(db), updates);
}

export async function sendMessage(tripId: string, text: string, uid: string, displayName: string) {
  const msgRef = push(ref(db, `trips/${tripId}/chat`));
  await set(msgRef, {
    text: text.trim(),
    authorId: uid,
    authorName: displayName,
    timestamp: Date.now(),
  });
}

export async function saveItinerary(tripId: string, itinerary: unknown) {
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}
