import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, equalTo, get, onValue, orderByChild, push, query, ref, set, update } from "@/lib/firebase";

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
  startLocation?: string;
  pace?: "relaxed" | "balanced" | "packed";
  submittedAt: string;
}

export interface AccommodationPreference {
  maxCostPerPerson: number;
  type: "hotel" | "airbnb" | "hostel" | "no_preference";
  rooms: number;
  location: string;
  amenities: string[];
  priority: "luxury" | "balanced" | "affordability";
  cancellation: "flexible" | "any";
  submittedAt: string;
}

export interface AccommodationSuggestion {
  id: string;
  name: string;
  type: "hotel" | "airbnb" | "hostel" | "other";
  location: string;
  totalCost: number;
  costPerPerson: number;
  nights: number;
  rating: number;
  amenities: string[];
  rooms: number;
  beds: number;
  cancellation: string;
  whyItFits: string;
  tags: string[];
  distanceNote: string;
  link?: string;
  photos?: string[];
  submittedBy: string;
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
  accommodationStatus?: "collecting_prefs" | "voting" | "confirmed" | "booked" | "skipped";
  accommodationPreferences?: Record<string, AccommodationPreference>;
  accommodationSuggestions?: AccommodationSuggestion[];
  accommodationVotes?: Record<string, Record<string, "up" | "down">>;
  accommodationLockedBy?: Record<string, boolean>;
  confirmedAccommodation?: AccommodationSuggestion;
  packConfirmed?: boolean;
  isPremium?: boolean;
  aiUsage?: Record<string, number>;
  review?: unknown;
  isPack?: boolean;
  pendingInvites?: Record<string, { fromUid: string; fromName: string; packName: string; destination: string; createdAt: number }>;
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
          const val = snap.val() as Record<string, boolean | string>;
          // only include genuinely joined trips (value === true), not packs or pending invites
          firebaseIds = Object.entries(val)
            .filter(([, v]) => v === true)
            .map(([k]) => k);
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
          .filter((t): t is Trip => t !== null && !t.isPack)
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

/* ── submitTripReview ─────────────────────────────────────────────── */

export async function submitTripReview(
  tripId: string,
  trip: any,
  uid: string,
  reviewData: {
    rating: number;
    text: string;
    vibes: string[];
    highlight: string;
    isPublic: boolean;
    photoUris: string[];
  },
): Promise<void> {
  // Upload photos to Firebase Storage
  const photoUrls = await Promise.all(
    reviewData.photoUris.map(async (uri) => {
      const blob = await fetch(uri).then((r) => r.blob());
      const path = `tripPhotos/${tripId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, blob);
      return getDownloadURL(fileRef);
    }),
  );

  const memberEntries = Object.values(trip.members || {}) as any[];
  const itineraryDays = trip.itinerary?.days
    ? (trip.itinerary.days as any[]).map((d: any, di: number) => ({
        day: d.day ?? di + 1,
        theme: d.theme || d.title || `Day ${d.day ?? di + 1}`,
        activities: (d.activities || []).slice(0, 4).map((a: any) => ({
          time: a.time || "",
          name: a.name || "",
          category: a.category || "",
        })),
      }))
    : null;

  const review = {
    rating: reviewData.rating,
    text: reviewData.text,
    vibes: reviewData.vibes,
    highlight: reviewData.highlight,
    isPublic: reviewData.isPublic,
    photos: photoUrls,
    destination: trip.destination,
    days: trip.days,
    memberCount: memberEntries.length,
    memberNames: memberEntries.map((m: any) => m.name).filter(Boolean),
    reviewedAt: new Date().toISOString(),
    reviewedBy: uid,
    ...(itineraryDays ? { itineraryDays } : {}),
  };

  await set(ref(db, `trips/${tripId}/review`), review);
  if (reviewData.isPublic) {
    await set(ref(db, `reviews/${tripId}`), review);
  }
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
    // memberPreferences intentionally kept so redo can re-use them
  });
}

export async function storeRedoSuggestions(
  tripId: string,
  suggestions: DestinationSuggestion[],
) {
  await update(ref(db, `trips/${tripId}`), {
    destinationSuggestions: suggestions,
    destinationVotes: null,
    destinationLockedBy: null,
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

export async function clearDestinationSuggestions(tripId: string) {
  await update(ref(db, `trips/${tripId}`), {
    destinationSuggestions: null,
    destinationVotes: null,
    destinationLockedBy: null,
    collectingPreferences: true,
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

/* ── Trip metadata ────────────────────────────────────────────────── */

export async function updateTripStartDate(tripId: string, startDate: string) {
  await update(ref(db, `trips/${tripId}`), { startDate });
}

/* ── Accommodation flow ───────────────────────────────────────────── */

export async function setAccommodationStatus(
  tripId: string,
  status: Trip["accommodationStatus"],
) {
  await set(ref(db, `trips/${tripId}/accommodationStatus`), status ?? null);
}

export async function submitAccommodationPreference(
  tripId: string,
  uid: string,
  pref: Omit<AccommodationPreference, "submittedAt">,
) {
  await set(ref(db, `trips/${tripId}/accommodationPreferences/${uid}`), {
    ...pref,
    submittedAt: new Date().toISOString(),
  });
}

export async function storeAccommodationSuggestions(
  tripId: string,
  suggestions: AccommodationSuggestion[],
) {
  await update(ref(db, `trips/${tripId}`), {
    accommodationSuggestions: suggestions,
    accommodationStatus: "voting",
    accommodationPreferences: null,
  });
}

export async function addMemberAccommodationLink(
  tripId: string,
  suggestion: AccommodationSuggestion,
) {
  const existing = await get(ref(db, `trips/${tripId}/accommodationSuggestions`));
  const current: AccommodationSuggestion[] = existing.val() ?? [];
  await set(ref(db, `trips/${tripId}/accommodationSuggestions`), [...current, suggestion]);
}

export async function voteAccommodation(
  tripId: string,
  idx: number,
  uid: string,
  dir: "up" | "down",
) {
  const voteRef = ref(db, `trips/${tripId}/accommodationVotes/${idx}/${uid}`);
  const snap = await get(voteRef);
  const current = snap.val() as string | null;
  await set(voteRef, current === dir ? null : dir);
}

export async function lockAccommodationVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/accommodationLockedBy/${uid}`), true);
}

export async function unlockAccommodationVotes(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/accommodationLockedBy/${uid}`), null);
}

export async function confirmAccommodation(
  tripId: string,
  suggestion: AccommodationSuggestion,
) {
  await update(ref(db, `trips/${tripId}`), {
    confirmedAccommodation: suggestion,
    accommodationStatus: "confirmed",
    accommodationSuggestions: null,
    accommodationVotes: null,
    accommodationLockedBy: null,
  });
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
    suggester: activity.suggester ?? "Member",
    estimatedCost: activity.estimatedCost ?? 0,
    labels: [],
    nearPrevious: false,
  };
  itinerary.days[dayIdx].activities.push(newAct);
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}

export async function deleteActivity(tripId: string, dayNumber: number, actIndex: number) {
  const snap = await get(ref(db, `trips/${tripId}/itinerary`));
  if (!snap.exists()) return;
  const itinerary = snap.val() as { title: string; days: ItineraryDay[] };
  const dayIdx = itinerary.days.findIndex((d) => d.dayNumber === dayNumber);
  if (dayIdx === -1) return;
  itinerary.days[dayIdx].activities.splice(actIndex, 1);
  await set(ref(db, `trips/${tripId}/itinerary`), itinerary);
}

export async function deleteTrip(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}`), null);
  try { await set(ref(db, `userTrips/${uid}/${tripId}`), null); } catch {}
}

export async function leaveTrip(tripId: string, uid: string) {
  await set(ref(db, `trips/${tripId}/members/${uid}`), null);
  try { await set(ref(db, `userTrips/${uid}/${tripId}`), null); } catch {}
}

export async function confirmPack(tripId: string) {
  await update(ref(db, `trips/${tripId}`), { packConfirmed: true });
}

export async function setTripPremium(tripId: string) {
  await update(ref(db, `trips/${tripId}`), { isPremium: true });
}

export async function incrementAiUsage(tripId: string, feature: string) {
  const r = ref(db, `trips/${tripId}/aiUsage/${feature}`);
  const snap = await get(r);
  const current = (snap.val() as number) ?? 0;
  await set(r, current + 1);
}

/* ── Pack (Travel Group) ─────────────────────────────────────────── */

export interface Pack {
  id: string;
  hostUid: string;
  name: string;
  createdAt: number;
  members: Record<string, { name: string }>;
  lastTripDestination?: string;
  lastTripAt?: number;
  tripIds?: Record<string, boolean>;
}

export interface PackInvite {
  id: string;        // composite "${packId}:${tripId}"
  packId: string;
  fromUid: string;
  fromName: string;
  tripId: string;
  destination: string;
  packName: string;
  createdAt: number;
}

export function usePacks(uid: string | undefined) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setPacks([]); setLoading(false); return; }
    // packs are stored in /trips with isPack=true, indexed in /userTrips/{uid}/{packId} = "pack"
    return onValue(ref(db, `userTrips/${uid}`), (snap) => {
      const data = snap.val() as Record<string, boolean | string> | null;
      if (!data) { setPacks([]); setLoading(false); return; }
      const packIds = Object.entries(data)
        .filter(([, v]) => v === "pack")
        .map(([k]) => k);
      if (packIds.length === 0) { setPacks([]); setLoading(false); return; }
      Promise.all(packIds.map((pid) => get(ref(db, `trips/${pid}`))))
        .then((snaps) => {
          const list = snaps
            .map((s, i) => {
              if (!s.exists()) return null;
              const v = s.val();
              return {
                id: packIds[i],
                hostUid: v.hostMemberId ?? "",
                name: v.name ?? "Pack",
                createdAt: typeof v.createdAt === "number" ? v.createdAt : Date.parse(v.createdAt ?? "0"),
                members: v.members ?? {},
                lastTripDestination: v.lastTripDestination,
                lastTripAt: v.lastTripAt,
                tripIds: v.tripIds ?? {},
              } as Pack;
            })
            .filter((p): p is Pack => p !== null)
            .sort((a, b) => (b.lastTripAt ?? b.createdAt) - (a.lastTripAt ?? a.createdAt));
          setPacks(list);
          setLoading(false);
        })
        .catch((err) => {
          console.warn("usePacks fetch error:", err);
          setLoading(false);
        });
    });
  }, [uid]);

  return { packs, loading };
}

export function useInvites(uid: string | undefined) {
  const [invites, setInvites] = useState<PackInvite[]>([]);

  useEffect(() => {
    if (!uid) { setInvites([]); return; }
    // Invites are discovered through trips the user shares with the host.
    // When a pack is saved from a trip, /trips/{tripId}/savedPacks/{packId} is written.
    // When the host invites the pack, /trips/{packId}/pendingInvites/{targetTripId} is written.
    // No cross-user writes needed — all paths are under /trips which any auth'd user can write.
    return onValue(ref(db, `userTrips/${uid}`), (snap) => {
      const data = snap.val() as Record<string, boolean | string> | null;
      if (!data) { setInvites([]); return; }

      const joinedTripIds = Object.entries(data)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      if (joinedTripIds.length === 0) { setInvites([]); return; }

      // Step 1: find all packs linked to the user's trips
      Promise.all(joinedTripIds.map((tid) => get(ref(db, `trips/${tid}/savedPacks`))))
        .then((packSnaps) => {
          const packIds = new Set<string>();
          packSnaps.forEach((s) => {
            if (s.exists()) Object.keys(s.val() as Record<string, boolean>).forEach((pid) => packIds.add(pid));
          });
          if (packIds.size === 0) { setInvites([]); return; }

          // Step 2: read pendingInvites from each pack
          return Promise.all(
            [...packIds].map((packId) =>
              get(ref(db, `trips/${packId}/pendingInvites`)).then((s) => ({ packId, s })),
            ),
          );
        })
        .then((results) => {
          if (!results) return;
          const list: PackInvite[] = [];
          for (const { packId, s } of results) {
            if (!s.exists()) continue;
            const invMap = s.val() as Record<string, {
              destination: string;
              fromUid: string;
              fromName: string;
              packName: string;
              createdAt: number;
              members: Record<string, string>;
            }>;
            for (const [targetTripId, inv] of Object.entries(invMap)) {
              if (inv.members?.[uid] === "pending") {
                list.push({
                  id: `${packId}:${targetTripId}`,
                  packId,
                  tripId: targetTripId,
                  fromUid: inv.fromUid ?? "",
                  fromName: inv.fromName ?? "Someone",
                  destination: inv.destination ?? "",
                  packName: inv.packName ?? "",
                  createdAt: inv.createdAt ?? 0,
                });
              }
            }
          }
          list.sort((a, b) => b.createdAt - a.createdAt);
          setInvites(list);
        })
        .catch(() => setInvites([]));
    });
  }, [uid]);

  return invites;
}

export async function savePack({
  hostUid,
  name,
  members,
  tripId,
  destination,
}: {
  hostUid: string;
  name: string;
  members: Record<string, { name: string }>;
  tripId: string;
  destination: string;
}): Promise<string> {
  // store pack as a special trip entry under the already-allowed /trips path
  const newRef = push(ref(db, "trips"));
  const packId = newRef.key!;
  await set(newRef, {
    isPack: true,
    hostMemberId: hostUid,
    name,
    destination,
    days: 0,
    vibes: [],
    budget: "",
    startDate: null,
    createdAt: Date.now(),
    members,
    lastTripDestination: destination,
    lastTripAt: Date.now(),
    tripIds: { [tripId]: true },
  });
  // Link pack into the originating trip so every member can discover it for invites
  await set(ref(db, `trips/${tripId}/savedPacks/${packId}`), true);
  // Index pack for the host only (own userTrips path ✓)
  await set(ref(db, `userTrips/${hostUid}/${packId}`), "pack");
  return packId;
}

export async function renamePack(packId: string, name: string): Promise<void> {
  await update(ref(db, `trips/${packId}`), { name });
}

export async function removePackMember(packId: string, memberUid: string): Promise<void> {
  await set(ref(db, `trips/${packId}/members/${memberUid}`), null);
}

export async function addTripToPack(
  packId: string,
  tripId: string,
  destination: string,
): Promise<void> {
  await update(ref(db, `trips/${packId}`), {
    [`tripIds/${tripId}`]: true,
    lastTripDestination: destination,
    lastTripAt: Date.now(),
  });
}

export async function invitePackToTrip(
  pack: Pack,
  tripId: string,
  destination: string,
  fromUid: string,
  fromName: string,
): Promise<void> {
  // Build per-member status map (skip the inviter)
  const members: Record<string, string> = {};
  for (const memberUid of Object.keys(pack.members)) {
    if (memberUid === fromUid) continue;
    members[memberUid] = "pending";
  }
  if (Object.keys(members).length === 0) return;

  // Write invite to the PACK's own trip node (host writes to their own trip ✓)
  // No cross-user writes — friends discover this through savedPacks links on shared trips
  await set(ref(db, `trips/${pack.id}/pendingInvites/${tripId}`), {
    destination,
    fromUid,
    fromName,
    packName: pack.name,
    createdAt: Date.now(),
    members,
  });
  // Update pack's tripIds + last trip info
  await update(ref(db, `trips/${pack.id}`), {
    [`tripIds/${tripId}`]: true,
    lastTripDestination: destination,
    lastTripAt: Date.now(),
  });
}

export async function dismissInvite(uid: string, packId: string, tripId: string): Promise<void> {
  await set(ref(db, `trips/${packId}/pendingInvites/${tripId}/members/${uid}`), "dismissed");
}

export async function acceptInvite(
  packId: string,
  uid: string,
  displayName: string,
  tripId: string,
): Promise<void> {
  await set(ref(db, `trips/${tripId}/members/${uid}`), {
    name: displayName,
    joinedAt: new Date().toISOString(),
    isHost: false,
  });
  await set(ref(db, `userTrips/${uid}/${tripId}`), true);
  await set(ref(db, `trips/${packId}/pendingInvites/${tripId}/members/${uid}`), "accepted");
  await addLocalTripId(uid, tripId);
}
