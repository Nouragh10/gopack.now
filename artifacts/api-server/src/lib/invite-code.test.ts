import assert from "node:assert/strict";
import {
  InviteCodeReservationError,
  reserveHostInviteCode,
  type InviteCodeStore,
  type InviteCodeTrip,
} from "./invite-code";

function createStore(
  trips: Record<string, InviteCodeTrip>,
  occupied: Record<string, string> = {},
  options: { failClaim?: boolean } = {},
): InviteCodeStore & { occupied: Record<string, string> } {
  return {
    occupied,
    async getTrip(tripId) {
      return trips[tripId] ?? null;
    },
    async reserveCode(code, tripId) {
      const current = occupied[code];
      if (current && current !== tripId) return false;
      occupied[code] = tripId;
      return true;
    },
    async releaseCode(code, tripId) {
      if (occupied[code] === tripId) delete occupied[code];
    },
    async claimTripCode(tripId, candidate) {
      if (options.failClaim) throw new Error("trip write failed");
      const current = trips[tripId]?.inviteCode;
      const canonical = current || candidate;
      trips[tripId] = { ...trips[tripId], inviteCode: canonical };
      return canonical;
    },
    async clearTripCode(tripId, expectedCode) {
      if (trips[tripId]?.inviteCode === expectedCode) {
        trips[tripId] = { ...trips[tripId], inviteCode: undefined };
      }
    },
  };
}

async function run() {
  const unauthorizedStore = createStore({
    trip1: { hostMemberId: "host" },
  });
  await assert.rejects(
    reserveHostInviteCode(
      unauthorizedStore,
      { tripId: "trip1", uid: "other-user" },
      () => "ABCDEFGH",
    ),
    (error: unknown) =>
      error instanceof InviteCodeReservationError && error.status === 403,
  );

  const successStore = createStore(
    { trip2: { hostMemberId: "host" } },
    { COLLIDE1: "another-trip" },
  );
  const candidates = ["COLLIDE1", "UNIQUE12"];
  const code = await reserveHostInviteCode(
    successStore,
    { tripId: "trip2", uid: "host" },
    () => candidates.shift() ?? "UNUSED12",
  );
  assert.equal(code, "UNIQUE12");
  assert.equal(successStore.occupied.UNIQUE12, "trip2");
  assert.equal(
    (await successStore.getTrip("trip2"))?.inviteCode,
    "UNIQUE12",
  );

  const retryStore = createStore({
    trip3: { hostMemberId: "host", inviteCode: "EXISTING" },
  });
  assert.equal(
    await reserveHostInviteCode(
      retryStore,
      { tripId: "trip3", uid: "host" },
      () => "SHOULDNT",
    ),
    "EXISTING",
  );

  const concurrentStore = createStore({
    trip4: { hostMemberId: "host" },
  });
  const [firstCode, secondCode] = await Promise.all([
    reserveHostInviteCode(
      concurrentStore,
      { tripId: "trip4", uid: "host" },
      () => "FIRST123",
    ),
    reserveHostInviteCode(
      concurrentStore,
      { tripId: "trip4", uid: "host" },
      () => "SECOND12",
    ),
  ]);
  assert.equal(firstCode, secondCode);
  assert.deepEqual(
    Object.entries(concurrentStore.occupied)
      .filter(([, owner]) => owner === "trip4")
      .map(([reservedCode]) => reservedCode),
    [firstCode],
  );

  const failedWriteStore = createStore(
    { trip5: { hostMemberId: "host" } },
    {},
    { failClaim: true },
  );
  await assert.rejects(
    reserveHostInviteCode(
      failedWriteStore,
      { tripId: "trip5", uid: "host" },
      () => "FAILCODE",
    ),
    /trip write failed/,
  );
  assert.equal(failedWriteStore.occupied.FAILCODE, undefined);

  const corruptedStore = createStore(
    {
      trip6: { hostMemberId: "host", inviteCode: "OTHER123" },
    },
    { OTHER123: "other-trip" },
  );
  const repairedCode = await reserveHostInviteCode(
    corruptedStore,
    { tripId: "trip6", uid: "host" },
    () => "REPAIRED",
  );
  assert.equal(repairedCode, "REPAIRED");
  assert.equal(corruptedStore.occupied.OTHER123, "other-trip");
  assert.equal(corruptedStore.occupied.REPAIRED, "trip6");

  console.log("invite code reservation tests passed");
}

void run();