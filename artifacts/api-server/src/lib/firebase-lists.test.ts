import assert from "node:assert/strict";
import test from "node:test";
import {
  firebaseListEntries,
  normalizeActivityList,
  resolveFirebaseActivityIndex,
  resolveFirebaseDayEntry,
} from "./firebase-lists";

test("preserves numeric Firebase array paths", () => {
  const entries = firebaseListEntries<{ dayNumber: number }>([
    { dayNumber: 1 },
    { dayNumber: 2 },
  ]);

  assert.deepEqual(entries.map(({ key }) => key), ["0", "1"]);
  assert.deepEqual(entries.map(({ value }) => value.dayNumber), [1, 2]);
});

test("preserves keyed Firebase object paths", () => {
  const entries = firebaseListEntries<{ dayNumber: number }>({
    second: { dayNumber: 2 },
    first: { dayNumber: 1 },
  });

  assert.deepEqual(entries.map(({ key }) => key), ["first", "second"]);
  assert.deepEqual(entries.map(({ value }) => value.dayNumber), [1, 2]);
});

test("normalizes keyed activities into a mutable array", () => {
  const original = {
    "0": { name: "Breakfast" },
    "1": { name: "Museum" },
  };
  const activities = normalizeActivityList(original);

  activities[0]!.name = "Coffee";
  assert.deepEqual(activities, [{ name: "Coffee" }, { name: "Museum" }]);
  assert.equal(original["0"].name, "Breakfast");
});

test("resolves legacy day records by visible one-based position", () => {
  const entries = firebaseListEntries<{ day?: number }>({
    alpha: { day: 8 },
    beta: { day: 9 },
  });

  assert.deepEqual(resolveFirebaseDayEntry(entries, 1), {
    key: "alpha",
    value: { day: 8 },
    canonicalDayNumber: 1,
  });
});

test("accepts legacy zero-based day requests", () => {
  const entries = firebaseListEntries<{ city: string; dayNumber?: number }>([
    { city: "Rome" },
    { city: "Florence" },
  ]);

  assert.deepEqual(resolveFirebaseDayEntry(entries, 0), {
    key: "0",
    value: { city: "Rome" },
    canonicalDayNumber: 1,
  });
});

test("falls back to legacy activity fields when a client ID is stale", () => {
  const activities = [
    {
      id: "stored-id",
      name: "Museum",
      time: "10:00 AM",
      description: "See the collection",
      suggester: "AI pick",
      fromWish: false,
    },
  ];

  assert.equal(
    resolveFirebaseActivityIndex(activities, "stale-client-id", {
      id: "stale-client-id",
      name: "Museum",
      time: "10:00 AM",
      description: "See the collection",
      suggester: "AI pick",
      fromWish: false,
    }),
    0,
  );
});

test("uses the first visually identical legacy activity instead of aborting", () => {
  const activity = {
    name: "Coffee",
    time: "9:00 AM",
    description: "Morning coffee",
    suggester: "AI pick",
    fromWish: false,
  };

  assert.equal(resolveFirebaseActivityIndex([activity, { ...activity }], undefined, activity), 0);
});

test("matches a stale activity when optional legacy fields are missing or normalized", () => {
  const activities = [
    {
      id: "stored-id",
      name: "  Museum   of Art ",
      time: "10:00   AM",
      tag: "culture",
    },
  ];

  assert.equal(
    resolveFirebaseActivityIndex(activities, "stale-client-id", {
      id: "stale-client-id",
      name: "museum of art",
      time: "10:00 AM",
      description: "See the collection",
      suggester: "AI pick",
      fromWish: false,
      tag: "culture",
    }),
    0,
  );
});

test("uses optional fields to choose between duplicate name and time matches", () => {
  const activities = [
    {
      name: "Coffee",
      time: "9:00 AM",
      description: "Coffee near the hotel",
      suggester: "AI pick",
    },
    {
      name: "Coffee",
      time: "9:00 AM",
      description: "Coffee by the museum",
      suggester: "Nora",
    },
  ];

  assert.equal(
    resolveFirebaseActivityIndex(activities, undefined, {
      name: "coffee",
      time: "9:00 am",
      description: "Coffee by the museum",
      suggester: "Nora",
    }),
    1,
  );
});

test("matches by a unique normalized name when legacy times drift", () => {
  const activities = [
    { name: "Museum of Art", time: "10:00 AM", description: "See the collection" },
    { name: "Lunch", time: "12:30 PM", description: "Local restaurant" },
  ];

  assert.equal(
    resolveFirebaseActivityIndex(activities, "stale-client-id", {
      name: " museum of art ",
      time: "10:30 AM",
      description: "",
    }),
    0,
  );
});

test("does not match a different activity using time alone", () => {
  const activities = [
    { name: "Museum", time: "10:00 AM", description: "See the collection" },
  ];

  assert.equal(
    resolveFirebaseActivityIndex(activities, "stale-client-id", {
      name: "Walking Tour",
      time: "10:00 AM",
      description: "Explore downtown",
    }),
    -1,
  );
});