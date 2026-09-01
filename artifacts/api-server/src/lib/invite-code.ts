import { randomBytes } from "node:crypto";

export interface InviteCodeTrip {
  hostMemberId?: string;
  inviteCode?: string;
}

export interface InviteCodeStore {
  getTrip(tripId: string): Promise<InviteCodeTrip | null>;
  reserveCode(code: string, tripId: string): Promise<boolean>;
  releaseCode(code: string, tripId: string): Promise<void>;
  claimTripCode(tripId: string, candidate: string): Promise<string>;
  clearTripCode(tripId: string, expectedCode: string): Promise<void>;
}

export class InviteCodeReservationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "InviteCodeReservationError";
  }
}

export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url").slice(0, 8).toUpperCase();
}

export async function reserveHostInviteCode(
  store: InviteCodeStore,
  input: { tripId: string; uid: string },
  generateCode: () => string = generateInviteCode,
): Promise<string> {
  const trip = await store.getTrip(input.tripId);
  if (!trip) {
    throw new InviteCodeReservationError("Trip not found.", 404);
  }
  if (trip.hostMemberId !== input.uid) {
    throw new InviteCodeReservationError(
      "Only the trip host can create an invite code.",
      403,
    );
  }

  if (trip.inviteCode) {
    const restored = await store.reserveCode(trip.inviteCode, input.tripId);
    if (restored) return trip.inviteCode;
    await store.clearTripCode(input.tripId, trip.inviteCode);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCode();
    if (!candidate) continue;
    const reserved = await store.reserveCode(candidate, input.tripId);
    if (!reserved) continue;

    let canonicalCode: string;
    try {
      canonicalCode = await store.claimTripCode(input.tripId, candidate);
    } catch (error) {
      await store.releaseCode(candidate, input.tripId).catch(() => undefined);
      throw error;
    }
    if (canonicalCode === candidate) return candidate;

    await store.releaseCode(candidate, input.tripId);
    const canonicalReserved = await store.reserveCode(
      canonicalCode,
      input.tripId,
    );
    if (canonicalReserved) return canonicalCode;

    // The trip points at a code owned by another trip. Clear only that exact
    // pointer, preserve the other trip's index entry, and try a fresh code.
    await store.clearTripCode(input.tripId, canonicalCode);
  }

  throw new InviteCodeReservationError(
    "Could not reserve a unique invite code.",
    503,
  );
}