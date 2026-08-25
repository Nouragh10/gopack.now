import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import {
  ItineraryResponseError,
  parseItineraryResponse,
} from "./itinerary-parser";

function createItinerary(activityCount = 1) {
  return {
    title: "A compact city break",
    days: [{
      dayNumber: 1,
      city: "Lisbon",
      theme: "Historic streets",
      activities: Array.from({ length: activityCount }, (_, index) => ({
        name: `Stop ${index + 1}`,
        tag: "culture",
      })),
    }],
  };
}

test("parses fenced JSON with surrounding prose and a trailing comma", () => {
  const text = `Here is the itinerary:
\`\`\`json
${JSON.stringify(createItinerary(), null, 2).replace(/\n}/, ",\n}")}
\`\`\`
Enjoy the trip!`;

  const parsed = parseItineraryResponse(text, {
    expectedDays: 1,
    activitiesPerDay: 1,
  });

  assert.equal(parsed.title, "A compact city break");
  assert.equal(parsed.days[0]?.activities[0]?.name, "Stop 1");
});

test("parses a response that begins after an assistant opening-brace prefill", () => {
  const complete = JSON.stringify(createItinerary());
  const parsed = parseItineraryResponse(complete.slice(1), {
    expectedDays: 1,
    activitiesPerDay: 1,
  });

  assert.equal(parsed.days[0]?.city, "Lisbon");
});

test("rejects repaired JSON when required itinerary content is still incomplete", () => {
  assert.throws(
    () => parseItineraryResponse(
      '{"title":"Only a heading","days":[{"dayNumber":1,"city":"Lisbon","theme":"Historic streets","activities":[]',
      { expectedDays: 1, activitiesPerDay: 1 },
    ),
    (error: unknown) => error instanceof ItineraryResponseError && error.code === "INVALID_ITINERARY_RESPONSE",
  );
});

let server: Server;
let baseUrl: string;
let originalFetch: typeof globalThis.fetch;
let fetchCalls = 0;
let aiResponses: string[] = [];

before(async () => {
  process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = "https://ai.example.test";
  process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = "test-key";
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";

  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(JSON.stringify({
      content: [{
        type: "text",
        text: aiResponses.shift() ?? '{"title":"Truncated","days":[{"dayNumber":1',
      }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const app = (await import("../app")).default;
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  globalThis.fetch = originalFetch;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test("returns a recoverable response when both AI itinerary attempts are malformed", async () => {
  fetchCalls = 0;
  aiResponses = [
    '{"title":"Truncated","days":[{"dayNumber":1',
    '{"title":"Truncated","days":[{"dayNumber":1',
  ];
  const response = await originalFetch(`${baseUrl}/api/itinerary`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      destination: "Lisbon",
      days: 1,
      vibes: ["Culture"],
      budget: "midrange",
      pace: "relaxed",
    }),
  });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "We could not build a complete itinerary right now. Please try again.",
    code: "INVALID_ITINERARY_RESPONSE",
    recoverable: true,
  });
  assert.equal(fetchCalls, 2);
});

test("accepts overflow activities needed to retain guaranteed wishes", async () => {
  fetchCalls = 0;
  aiResponses = [JSON.stringify(createItinerary(4))];
  const response = await originalFetch(`${baseUrl}/api/itinerary`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      destination: "Lisbon",
      days: 1,
      vibes: ["Culture"],
      budget: "midrange",
      pace: "relaxed",
      guaranteed: [
        { text: "Stop 1", author: "Ava", votes: 4 },
        { text: "Stop 2", author: "Ben", votes: 3 },
        { text: "Stop 3", author: "Chen", votes: 2 },
        { text: "Stop 4", author: "Drew", votes: 1 },
      ],
    }),
  });

  assert.equal(response.status, 200);
  const itinerary = await response.json() as ReturnType<typeof createItinerary>;
  assert.equal(itinerary.days[0]?.activities.length, 4);
  assert.equal(fetchCalls, 1);
});