import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { db, equalTo, get, onValue, orderByChild, push, query, ref, set, update } from "@/lib/firebase";

/* ── Interfaces ───────────────────────────────────────────────────── */

export interface TripMember {
  name: string;
  joinedAt: string;
  isHost: boolean;
}

export interface DestinationSuggestion {
  name: string;
  pitch: string;
  tags: string[];
  flightHint: string;
  bestTime: string;
}

export interface MemberPreference {
  vibes: string[];
  distance: string;
  budget: string;
  days: number;
  startDate: string | null;
  submittedAt: string;
}

export interface Trip {
  id: string;
  destination: string;
  days: number;
  vibes: string[];
  budget: string;
  startDate: string | null;
  members: Record<string, TripMember>;
  hostMemberId: string;
  createdAt: string;
  inviteCode?: string;
  itinerary?: { title: string; days: ItineraryDay[] };
  votesLockedBy?: Record<string, boolean>;
  collectingPreferences?: boolean;
  memberPreferences?: Record<string, MemberPreference>;
  destinationSuggestions?: DestinationSuggestion[];
  destinationVotes?: Record<string, Record<string, "up" | "down">>;
  destinationLockedBy?: Record<string, boolean>;
}

export interface Wish {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  upvoters: Record<string, string>;   // uid → displayName
  downvoters: Record<string, string>; // uid → displayName
  score: number;                      // computed: upvotes - downvotes
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

export interface PackItem {
  text: string;
  checked: boolean;
}

export type PackingList = Record<string, PackItem[]>;

/* ── AsyncStorage helpers ─────────────────────────────────────────── */

function storageKey(uid: string) {
  return `gopack:trips:${uid}`;
}

async function getLocalTripIds(uid: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function addLocalTripId(uid: string, tripId: string): Promise<void> {
  try {
    const ids = await getLocalTripIds(uid);
    if (!ids.includes(tripId)) {
      await AsyncStorage.setItem(
        storageKey(uid),
        JSON.stringify([...ids, tripId]),
      );
    }
  } catch {}
}

/* ── useTrips ─────────────────────────────────────────────────────── */

export function useTrips(uid: string | undefined) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!uid) {
      setTrips([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      const localIds = await getLocalTripIds(uid!);

      let firebaseIds: string[] = [];
      try {
        const snap = await get(ref(db, `userTrips/${uid}`));
        if (snap.exists()) {
          firebaseIds = Object.keys(snap.val() as Record<string, boolean>);
        }
      } catch {}

      const allIds = [...new Set([...localIds, ...firebaseIds])];

      if (allIds.length === 0) {
        if (!cancelled) { setTrips([]); setLoading(false); }
        return;
      }

      try {
        const snaps = await Promise.all(
          allIds.map((id) => get(ref(db, `trips/${id}`))),
        );
        const data: Trip[] = snaps
          .map((s, i) =>
            s.exists() ? ({ id: allIds[i], ...s.val() } as Trip) : null,
          )
          .filter((t): t is Trip => t !== null)
          .sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime(),
          );
        if (!cancelled) setTrips(data);
      } catch {}

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [uid, version]);

  return { trips, loading, refetch };
}

/* ── useTrip ──────────────────────────────────────────────────────── */

export function useTrip(tripId: string | undefined) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    const tripRef = ref(db, `trips/${tripId}`);
    return onValue(tripRef, (snap) => {
      setTrip(snap.exists() ? ({ id: tripId, ...snap.val() } as Trip) : null);
      setLoading(false);
    });
  }, [tripId]);

  return { trip, loading };
}

/* ── useWishes ────────────────────────────────────────────────────── */

export function useWishes(tripId: string | undefined) {
  const [wishes, setWishes] = useState<Wish[]>([]);

  useEffect(() => {
    if (!tripId) return;
    return onValue(ref(db, `trips/${tripId}/wishes`), (snap) => {
      const data = snap.val() as Record<string, any> | null;
      if (!data) { setWishes([]); return; }
      const list = Object.entries(data).map(([id, w]) => {
        const upvoters: Record<string, string> = w.upvoters ?? {};
        const downvoters: Record<string, string> = w.downvoters ?? {};
        const score = Object.keys(upvoters).length - Object.keys(downvoters).length;
        return { id, ...w, upvoters, downvoters, score } as Wish;
      });
      setWishes(list.sort((a, b) => b.score - a.score));
    });
  }, [tripId]);

  return wishes;
}

/* ── useChat ──────────────────────────────────────────────────────── */

export function useChat(tripId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!tripId) return;
    return onValue(ref(db, `trips/${tripId}/chat`), (snap) => {
      const data = snap.val() as Record<string, Omit<ChatMessage, "id">> | null;
      if (!data) { setMessages([]); return; }
      const list = Object.entries(data).map(([id, m]) => ({ id, ...m } as ChatMessage));
      setMessages(list.sort((a, b) => a.timestamp - b.timestamp));
    });
  }, [tripId]);

  return messages;
}

/* ── usePackingList ───────────────────────────────────────────────── */

export function usePackingList(tripId: string | undefined) {
  const [packingList, setPackingList] = useState<PackingList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    return onValue(ref(db, `trips/${tripId}/packingItems`), (snap) => {
      setPackingList(snap.exists() ? (snap.val() as PackingList) : null);
      setLoading(false);
    });
  }, [tripId]);

  return { packingList, loading };
}

/* ── usePublicReviews ─────────────────────────────────────────────── */

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

/* ── Helpers ──────────────────────────────────────────────────────── */

function genCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

/* ── createTrip ───────────────────────────────────────────────────── */

export async function createTrip(data: {
  destination: string;
  days: number;
  vibes: string[];
  budget: string;
  startDate: string | null;
  uid: string;
  displayName: string;
}) {
  const newTripRef = push(ref(db, "trips"));
  const tripId = newTripRef.key!;
  const inviteCode = genCode();

  const tripData = {
    destination: data.destination,
    days: data.days,
    vibes: data.vibes,
    budget: data.budget,
    startDate: data.startDate,
    hostMemberId: data.uid,
    createdAt: new Date().toISOString(),
    inviteCode,
    members: {
      [data.uid]: {
        name: data.displayName,
        joinedAt: new Date().toISOString(),
        isHost: true,
      },
    },
  };

  await set(newTripRef, tripData);

  await addLocalTripId(data.uid, tripId);

  try { await set(ref(db, `userTrips/${data.uid}/${tripId}`), true); } catch {}
  try { await set(ref(db, `inviteCodes/${inviteCode}`), tripId); } catch {}

  return tripId;
}

/* ── joinTrip ─────────────────────────────────────────────────────── */

export async function joinTrip(tripId: string, uid: string, displayName: string) {
  const id = tripId.trim();

  // Read the specific trip by ID — Firebase rules allow reading a known trip
  // by its ID for any authenticated user (same approach as the web app).
  const snap = await get(ref(db, `trips/${id}`));
  if (!snap.exists()) throw new Error("Trip not found. Check the ID and try again.");

  await update(ref(db, `trips/${id}/members`), {
    [uid]: {
      name: displayName,
      joinedAt: new Date().toISOString(),
      isHost: false,
    },
  });

  await addLocalTripId(uid, id);
  try { await set(ref(db, `userTrips/${uid}/${id}`), true); } catch {}

  return id;
}

/* ── addWish / voteWish ───────────────────────────────────────────── */

export async function addWish(
  tripId: string,
  text: string,
  uid: string,
  displayName: string,
) {
  const wishRef = push(ref(db, `trips/${tripId}/wishes`));
  await set(wishRef, {
    text,
    authorId: uid,
    authorName: displayName,
    upvoters: {},
    downvoters: {},
    createdAt: Date.now(),
  });
}

export async function voteWish(
  tripId: string,
  wishId: string,
  uid: string,
  userName: string,
  dir: "up" | "down",
) {
  const snap = await get(ref(db, `trips/${tripId}/wishes/${wishId}`));
  const wish = snap.val() ?? {};
  const upvoters: Record<string, string> = wish.upvoters ?? {};
  const downvoters: Record<string, string> = wish.downvoters ?? {};
  const updates: Record<string, unknown> = {};

  if (dir === "up") {
    if (upvoters[uid]) {
      updates[`trips/${tripId}/wishes/${wishId}/upvoters/${uid}`] = null;
    } else {
      updates[`trips/${tripId}/wishes/${wishId}/upvoters/${uid}`] = userName;
      if (downvoters[uid]) {
        updates[`trips/${tripId}/wishes/${wishId}/downvoters/${uid}`] = null;
      }
    }
  } else {
    if (downvoters[uid]) {
      updates[`trips/${tripId}/wishes/${wishId}/downvoters/${uid}`] = null;
    } else {
      updates[`trips/${tripId}/wishes/${wishId}/downvoters/${uid}`] = userName;
      if (upvoters[uid]) {
        updates[`trips/${tripId}/wishes/${wishId}/upvoters/${uid}`] = null;
      }
    }
  }
  await update(ref(db), updates);
}

export async function lockVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/votesLockedBy/${uid}`), true);
}

export async function unlockVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/votesLockedBy/${uid}`), null);
}

/* ── Destination suggester ────────────────────────────────────────── */

export async function setCollectingPreferences(tripId: string, collecting: boolean) {
  await set(ref(db, `trips/${tripId}/collectingPreferences`), collecting || null);
}

export async function submitMemberPreference(
  tripId: string,
  uid: string,
  pref: Omit<MemberPreference, "submittedAt">,
) {
  await set(ref(db, `trips/${tripId}/memberPreferences/${uid}`), {
    ...pref,
    submittedAt: new Date().toISOString(),
  });
}

export async function storeDestinationSuggestions(
  tripId: string,
  suggestions: DestinationSuggestion[],
) {
  await update(ref(db, `trips/${tripId}`), {
    destinationSuggestions: suggestions,
    collectingPreferences: null,
    memberPreferences: null,
  });
}

export async function voteDestination(
  tripId: string,
  idx: number,
  uid: string,
  dir: "up" | "down",
) {
  const voteRef = ref(db, `trips/${tripId}/destinationVotes/${idx}/${uid}`);
  const snap = await get(voteRef);
  const current = snap.val() as string | null;
  await set(voteRef, current === dir ? null : dir);
}

export async function lockDestinationVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/destinationLockedBy/${uid}`), true);
}

export async function unlockDestinationVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/destinationLockedBy/${uid}`), null);
}

export async function confirmDestination(tripId: string, name: string) {
  await update(ref(db, `trips/${tripId}`), {
    destination: name,
    destinationSuggestions: null,
    destinationVotes: null,
    destinationLockedBy: null,
  });
}

/* ── sendMessage ──────────────────────────────────────────────────── */

export async function sendMessage(
  tripId: string,
  text: string,
  uid: string,
  displayName: string,
) {
  const msgRef = push(ref(db, `trips/${tripId}/chat`));
  await set(msgRef, {
    text: text.trim(),
    authorId: uid,
    authorName: displayName,
    timestamp: Date.now(),
  });
}

/* ── saveItinerary ────────────────────────────────────────────────── */

export async function saveItinerary(tripId: string, itinerary: unknown) {
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}

/* ── Packing list ─────────────────────────────────────────────────── */

export async function savePackingList(
  tripId: string,
  rawList: Record<string, string[]>,
) {
  const converted: PackingList = Object.fromEntries(
    Object.entries(rawList).map(([cat, items]) => [
      cat,
      items.map((text) => ({ text, checked: false })),
    ]),
  );
  await set(ref(db, `trips/${tripId}/packingItems`), converted);
}

export async function togglePackItem(
  tripId: string,
  category: string,
  index: number,
  checked: boolean,
) {
  await set(
    ref(db, `trips/${tripId}/packingItems/${category}/${index}/checked`),
    checked,
  );
}

/* ── Activity CRUD ────────────────────────────────────────────────── */

export async function updateActivity(
  tripId: string,
  dayNumber: number,
  actIndex: number,
  partial: Partial<Activity>,
) {
  const snap = await get(ref(db, `trips/${tripId}/itinerary`));
  if (!snap.exists()) return;
  const itinerary = snap.val() as { title: string; days: ItineraryDay[] };
  const dayIdx = itinerary.days.findIndex((d) => d.dayNumber === dayNumber);
  if (dayIdx === -1) return;
  itinerary.days[dayIdx].activities[actIndex] = {
    ...itinerary.days[dayIdx].activities[actIndex],
    ...partial,
  };
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}

export async function addActivity(
  tripId: string,
  dayNumber: number,
  activity: Partial<Activity>,
) {
  const snap = await get(ref(db, `trips/${tripId}/itinerary`));
  if (!snap.exists()) return;
  const itinerary = snap.val() as { title: string; days: ItineraryDay[] };
  const dayIdx = itinerary.days.findIndex((d) => d.dayNumber === dayNumber);
  if (dayIdx === -1) return;
  const newAct: Activity = {
    time: activity.time ?? "12:00 PM",
    name: activity.name ?? "New activity",
    description: activity.description ?? "",
    tag: activity.tag ?? "culture",
    fromWish: false,
    suggester: activity.suggester ?? "You",
    estimatedCost: activity.estimatedCost ?? 0,
    labels: [],
    nearPrevious: false,
  };
  itinerary.days[dayIdx].activities.push(newAct);
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}
