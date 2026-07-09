import { Router, type IRouter, type Request, type Response } from "express";
import { GenerateItineraryBody, GeneratePackingListBody } from "@workspace/api-zod";
import { jsonrepair } from "jsonrepair";
import { getAdminDb, getAdminApp } from "../lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

const router: IRouter = Router();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callAnthropic(body: object, retries = 3, extraHeaders: Record<string, string> = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
    "anthropic-version": "2023-06-01",
    ...extraHeaders,
  };

  for (let i = 0; i < retries; i++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (response.status !== 429) return response as unknown as Response;
    const wait = (i + 1) * 8000;
    console.log(`gopack: rate limited, retrying in ${wait}ms`);
    await sleep(wait);
  }
  throw new Error("Rate limit exceeded after retries. Please try again in a minute.");
}

function extractAndParseJson(text: string): unknown {
  const stripped = text
    .replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  const raw = jsonMatch ? jsonMatch[0] : stripped;
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(jsonrepair(raw));
  }
}

type ItineraryActivity = {
  name: string;
  tag: string;
  [key: string]: unknown;
};
type ItineraryDay = { activities: ItineraryActivity[]; [key: string]: unknown };
type ItineraryShape = { days: ItineraryDay[]; [key: string]: unknown };

async function verifyItineraryVenues(
  itinerary: ItineraryShape,
  destination: string,
  log: { warn: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void },
): Promise<ItineraryShape> {
  const venueNames = itinerary.days.flatMap((d) => d.activities.map((a) => a.name)).filter(Boolean);
  if (venueNames.length === 0) return itinerary;

  const activityList = itinerary.days.flatMap((d) =>
    d.activities.map((a) => `- "${a.name}" — Day ${String((d as Record<string, unknown>).dayNumber)}, declared city "${String((d as Record<string, unknown>).city)}", tag "${a.tag}"`),
  ).join("\n");

  const verifyPrompt = `You are a fact-checker reviewing a travel itinerary for ${destination}. You have access to a web_search tool — USE IT to check real, current information. Do not rely only on your training data, since venues open and close over time and your knowledge may be outdated.

Here is the full list of activities in this itinerary:
${activityList}

For EVERY activity listed above, perform these checks:
1. SEARCH THE WEB for each venue (especially anything tagged "food" or restaurant/cafe/bar-like — these close far more often than museums or landmarks) to confirm:
   - It is a REAL, specific, existing place in ${destination} (not invented or generic).
   - It is CURRENTLY OPEN AND OPERATING — not permanently closed, demolished, or out of business. Search things like "<venue name> <city> permanently closed" or "<venue name> <city> hours" to check.
   - It is physically located in the exact declared city for that day, not a different city/suburb/region.
2. Also flag (no search needed) if:
   - It is a duplicate of another activity's venue elsewhere in the itinerary.
   - It is far enough from the other activities that same day (different neighborhood, suburb, or a long drive) that it breaks a realistic, walkable-or-short-transit day plan.

For every flagged activity (failed a check above, or you found evidence it's closed, or you could not verify it exists), REPLACE it with a different, well-known, currently-operating real venue that IS located in the day's declared city and close to the day's other activities, and fits the same "tag" and time slot. Prefer iconic, long-established, famous places you can verify via search over obscure ones.

Do NOT change anything about activities that already pass all checks — keep them byte-for-byte identical.

After you finish researching, respond with ONLY the corrected, complete itinerary JSON in the exact same shape as the input below (no markdown, no explanation, no preamble in your FINAL message — your final message must start directly with {).

Itinerary JSON:
${JSON.stringify(itinerary)}`;

  try {
    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 16000,
      system: "You are a fact-checking JSON API with web search access. Investigate using web search first, then your FINAL response must be only valid JSON matching the input shape — no preamble, no explanation, no markdown code blocks, starting directly with {.",
      messages: [{ role: "user", content: verifyPrompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 25 }],
    };
    const response = await callAnthropic(body, 3, { "anthropic-beta": "web-search-2025-03-05" });
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
      stop_reason?: string;
    };
    if (!(response as unknown as globalThis.Response).ok) {
      log.warn({ data }, "Venue verification pass failed, keeping original itinerary");
      return itinerary;
    }
    const textBlocks = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "");
    const allText = textBlocks[textBlocks.length - 1] ?? "";
    if (data.stop_reason === "max_tokens") {
      log.warn({ chars: allText.length }, "Venue verification response truncated, keeping original itinerary");
      return itinerary;
    }
    const verified = extractAndParseJson(allText) as ItineraryShape;
    if (!verified?.days || !Array.isArray(verified.days)) {
      log.warn({}, "Venue verification returned malformed shape, keeping original itinerary");
      return itinerary;
    }
    return verified;
  } catch (err) {
    log.error({ err }, "Venue verification pass threw, keeping original itinerary");
    return itinerary;
  }
}

function findDuplicateSlots(itinerary: ItineraryShape): Array<{ dayNumber: unknown; time: unknown; name: string; tag: string; city: unknown; otherActivityNames: string[] }> {
  const seen = new Set<string>();
  const dupes: Array<{ dayNumber: unknown; time: unknown; name: string; tag: string; city: unknown; otherActivityNames: string[] }> = [];
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const key = (activity.name ?? "").toString().trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        dupes.push({
          dayNumber: (day as Record<string, unknown>).dayNumber,
          time: activity.time,
          name: activity.name,
          tag: activity.tag,
          city: (day as Record<string, unknown>).city,
          otherActivityNames: day.activities.map((a) => (a.name ?? "").toString()).filter((n) => n && n.trim().toLowerCase() !== key),
        });
      } else {
        seen.add(key);
      }
    }
  }
  return dupes;
}

async function dedupeItineraryVenues(
  itinerary: ItineraryShape,
  destination: string,
  log: { warn: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void },
): Promise<ItineraryShape> {
  const dupes = findDuplicateSlots(itinerary);
  if (dupes.length === 0) return itinerary;

  const usedNames = [...new Set(itinerary.days.flatMap((d) => d.activities.map((a) => (a.name ?? "").toString())))];

  const repairPrompt = `This travel itinerary for ${destination} has duplicate venues — the same venue name was used more than once across different days. Below are the SPECIFIC duplicate slots that need a brand-new replacement venue (identified by day number + time + current name + that day's declared city + the day's other activities for location context):

${dupes.map((d) => `- Day ${String(d.dayNumber)}, ${String(d.time)}: "${d.name}" (tag: ${d.tag}). This day's city is "${String(d.city)}". Other activities that same day (the replacement must be in the same neighborhood/area as these): ${d.otherActivityNames.length > 0 ? d.otherActivityNames.map((n) => `"${n}"`).join(", ") : "(none)"}`).join("\n")}

All venue names already used anywhere in this itinerary (do NOT reuse any of these for the replacements):
${usedNames.map((n) => `- ${n}`).join("\n")}

For each duplicate slot listed above, pick ONE new, different venue that fits the same tag. The replacement MUST meet ALL of these:
- LOCATION LOCK — physically located in the exact city named for that slot (not just somewhere in ${destination} broadly — ${destination} may span multiple cities/towns/regions). Never place it in a different city, suburb, or region than the one declared for that day.
- SAME-AREA — close to that day's other listed activities (same neighborhood/district, or at most a short taxi/metro ride) so the day stays geographically realistic. Do not pick something requiring a long drive or a trip out of the metro area from the other activities.
- REAL and verifiable — a specific, well-known place you are highly confident actually exists (findable on Google Maps). Never invent a name.
- CURRENTLY OPEN AND OPERATING as of 2025 — do NOT pick anything permanently closed, demolished, under indefinite closure, or out of business.
- If the tag is "food" or "restaurant"-like, strongly prefer iconic, long-established, well-known institutions (10+ years operating) over trendy, small, or recently-opened spots — small restaurants close far more often and you are less likely to have reliable knowledge of their current status.
- If you are not certain a specific venue exists, is open, and is in the right city, use a well-known category anchor instead (e.g. a famous, long-running market or landmark in that exact city) rather than a specific small business you're unsure about.

Respond with ONLY a JSON array, one object per duplicate slot IN THE SAME ORDER as listed above, each with just: {"dayNumber": <number>, "time": "<same time>", "name": "<new venue name>"}. No markdown, no explanation.`;

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      system: "You are a JSON API. Always respond with only a valid JSON array. No preamble, no explanation, no markdown code blocks.",
      messages: [{ role: "user", content: repairPrompt }],
    };
    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };
    if (!(response as unknown as globalThis.Response).ok) {
      log.warn({ data }, "Dedup repair pass failed, keeping itinerary with duplicates");
      return itinerary;
    }
    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const replacements = extractAndParseJson(allText) as Array<{ dayNumber: unknown; time: unknown; name: string }>;
    if (!Array.isArray(replacements)) {
      log.warn({}, "Dedup repair returned non-array, keeping itinerary with duplicates");
      return itinerary;
    }

    const replacementQueue = [...replacements];
    for (const day of itinerary.days) {
      for (const activity of day.activities) {
        const key = (activity.name ?? "").toString().trim().toLowerCase();
        const dupeIndex = dupes.findIndex(
          (d) => d.dayNumber === (day as Record<string, unknown>).dayNumber && d.time === activity.time && d.name.toString().trim().toLowerCase() === key,
        );
        if (dupeIndex !== -1) {
          const replacement = replacementQueue.shift();
          if (replacement?.name) {
            activity.name = replacement.name;
          }
        }
      }
    }
    return itinerary;
  } catch (err) {
    log.error({ err }, "Dedup repair pass threw, keeping itinerary with duplicates");
    return itinerary;
  }
}

router.post("/itinerary", async (req: Request, res: Response): Promise<void> => {
  const parsed = GenerateItineraryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { destination, days, vibes, budget, startDate, wishes } = parsed.data;
  const pace = (req.body as { pace?: string }).pace ?? "balanced";
  const activitiesPerDay = pace === "relaxed" ? 3 : pace === "packed" ? 7 : 5;

  const topWishes = (wishes ?? [])
    .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes)
    .slice(0, 20)
    .map((w: { text: string; author: string; votes: number }, i: number) =>
      `${i + 1}. "${w.text}" by ${w.author} (${w.votes} votes)`
    );

  const validTags = vibes.map(v => v.toLowerCase());

  const vibeActivityGuide: Record<string, string> = {
    culture: "museums, historical sites, galleries, monuments, UNESCO sites, local performances",
    food: "restaurants, food markets, cooking classes, street food tours, wineries, breweries",
    foodie: "restaurants, food markets, cooking classes, street food tours, fine dining, tastings",
    adventure: "hiking, zip-lining, rock climbing, kayaking, paragliding, extreme sports",
    relaxation: "spas, beaches, parks, scenic viewpoints, sunset spots, leisurely walks",
    nightlife: "bars, clubs, rooftop lounges, night markets, live music venues, cocktail bars",
    shopping: "markets, malls, boutiques, artisan shops, souvenir districts, designer stores",
    nature: "national parks, botanical gardens, wildlife reserves, waterfalls, lakes, forests",
    beach: "beaches, snorkeling spots, beachfront cafes, water sports, coastal walks",
    wellness: "yoga studios, spas, meditation centers, hot springs, wellness retreats",
  };

  const vibeGuide = vibes.map(v => {
    const key = v.toLowerCase();
    return vibeActivityGuide[key] ? `- ${v}: ${vibeActivityGuide[key]}` : `- ${v}: activities matching this theme`;
  }).join("\n");

  const totalActivities = days * activitiesPerDay;
  const maxWishSlots = Math.max(1, Math.min(topWishes.length, Math.floor(totalActivities * 0.25)));

  const prompt = `You are a world-class group travel planner. Generate a detailed ${days}-day itinerary for a group trip to ${destination}.

Trip details:
- Destination: ${destination}
- Duration: ${days} days (EXACTLY — never more, never fewer)
- Group vibes: ${vibes.join(", ")}
- Budget level: ${budget}
${startDate ? `- Start date: ${startDate}` : ""}

━━━ SECTION A — WISH INCLUSION (highest priority) ━━━
The group submitted these specific activity wishes. Include them as real named activities:
${topWishes.length > 0 ? topWishes.join("\n") : "No wishes — skip this section."}

Each included wish counts as exactly ONE activity slot. Mark it with "fromWish": true and the author's name as "suggester".
LIMIT: Include AT MOST ${maxWishSlots} wish-based activit${maxWishSlots === 1 ? "y" : "ies"} across the ENTIRE itinerary. Do not repeat the same wish theme across multiple slots.

━━━ SECTION B — AI PICKS (fill all remaining slots) ━━━
ALL other activity slots (at least ${totalActivities - maxWishSlots} of the ${totalActivities} total) MUST be original AI recommendations — diverse, specific, real-world venues the group would love.
Use the group's vibes as inspiration, not as a hard constraint. A great itinerary mixes iconic sights, local gems, meals, and experiences.
These must have "fromWish": false and "suggester": "AI pick".

Vibe inspiration guide:
${vibeGuide}

━━━ STRICT RULES ━━━
0. LOCATION LOCK — Every single activity, restaurant, venue, and experience MUST be physically located in or immediately around ${destination}. Do NOT suggest activities in other cities, regions, or countries, even as a day trip. If a wish mentions a place outside ${destination}, adapt the spirit of it to something available in ${destination} instead.
0b. SAME-AREA CLUSTERING — All activities within a SINGLE day must be in the same city and reasonably close to each other (same neighborhood/district, or at most a short taxi/metro ride apart — never a multi-hour drive or a trip requiring leaving the metro area). Order the day's activities so they flow geographically (e.g. don't bounce from the north side of town to the south and back). Every activity's "city" for that day must exactly match the day's declared "city" field — never mix venues from a different town, suburb, or region into a day assigned to another city.
1. The "days" array MUST have EXACTLY ${days} elements numbered 1–${days}.
2. Each day MUST have EXACTLY ${activitiesPerDay} activities (pace: ${pace}).
3. Every activity's "tag" must be one of: ${validTags.join(", ")}.
4. REAL VENUES ONLY — Every activity "name" must be a real, verifiable place that actually exists in ${destination} and can be found on Google Maps. Only use venues you are highly confident exist: famous landmarks, well-known restaurants, major museums, established bars, popular parks. If you are not certain a specific venue exists, use a well-known category anchor instead (e.g. "Mercado de San Miguel" not an invented market name). Never invent a venue name. Generic titles are also forbidden — "Famous Cathedral" is as bad as a made-up name.
5. OPEN & OPERATING — Only suggest venues that are currently open and operating as of 2025. Do NOT suggest venues that are permanently closed, demolished, under indefinite closure, or no longer in business. Restaurants and cafes close far more often than museums or landmarks — for any "food" or dining-related activity, strongly prefer iconic, long-established institutions (10+ years operating) that you are highly confident are still open, rather than trendy, small, or recently-opened spots you're less certain about. If unsure, choose a well-known alternative that you are confident about.
6. Descriptions: ONE sentence, max 15 words.
7. NO REPEATS ACROSS THE WHOLE TRIP — Never use the same venue name twice anywhere in the itinerary, across ANY day, not just within a single day. Track every venue name you've already used across all previous days and pick a different one each time. Also avoid repeating the same narrow activity type (e.g. two ramen shops, two rooftop bars) more than once per day.
8. ACCOMMODATION BAN — Do NOT include any hotels, hostels, Airbnbs, resorts, check-ins, check-outs, or any form of "place to stay" as an activity. Activities are things the group DOES, not where they sleep.
9. For AI pick activities, set "matchedVibe" to the single group vibe this activity best matches (must be one of: ${vibes.map(v => v.toLowerCase()).join(", ")}). For wish-based activities, set "matchedVibe" to null.
10. COST ACCURACY — "estimatedCost" is the exact per-person cost in USD a tourist would actually pay, matching real booking-platform prices (Viator, GetYourGuide, etc.). Use these realistic ranges by activity type:
  FREE (always $0): open-air landmarks, beaches, temples with no entry fee, public parks, viewpoints, self-guided walks, free markets
  PAID ADMISSION ($5–30): museums, archaeological sites, palaces, zoos — use the known admission price if you know it (e.g. Louvre = $22, Uffizi = $28)
  GUIDED TOURS booked on Viator/GetYourGuide ($30–150): walking food tours $40–80, city sightseeing tours $30–60, cooking classes $60–130, boat trips/cruises $40–100, wine/spirits tastings $35–80, day trips outside city $80–200, private tours $150–400
  FOOD & DRINK per person: street food / food stall $3–12, casual local café or noodle shop $8–20, mid-range sit-down restaurant $20–55, upscale restaurant $55–120, fine dining / Michelin $100–250
  NIGHTLIFE per person: local bar / beer $8–18, cocktail bar $15–35, rooftop bar $20–45, nightclub entry + drink $20–50
  WELLNESS: spa / hammam session $40–120, yoga or fitness class $15–40, surf lesson $50–90
  Budget modifier: ${budget === "budget" ? "lean toward lower end of each range above; prefer free or cheapest-available options; avoid expensive tours" : budget === "luxury" ? "lean toward upper end; use premium/private pricing; upgrade restaurants to upscale/fine-dining tier" : "use mid-range values within each range above"}
  NEVER output 25 as a default. Every activity must have a cost that honestly reflects what that specific venue/experience actually costs.

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "title": "Catchy trip title",
  "days": [
    {
      "dayNumber": 1,
      "city": "City name",
      "theme": "Day theme",
      "activities": [
        {
          "time": "9:00 AM",
          "name": "Activity name",
          "description": "1-2 sentence description with practical tip",
          "tag": "${vibes[0]?.toLowerCase() ?? "culture"}",
          "fromWish": true,
          "suggester": "member name or 'AI pick'",
          "matchedVibe": "culture",
          "estimatedCost": 0,
          "labels": ["Must-try"],
          "nearPrevious": false
        }
      ]
    }
  ]
}`;

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 16000,
      system: "You are a JSON API. Always respond with only valid JSON. No preamble, no explanation, no markdown code blocks. Never start your response with words — start directly with the opening brace {.",
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    };

    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
      stop_reason?: string;
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (itinerary)");
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }

    const allText = "{" + (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    if (data.stop_reason === "max_tokens") {
      req.log.warn({ chars: allText.length }, "Itinerary response truncated at max_tokens");
    }

    const itinerary = extractAndParseJson(allText) as ItineraryShape;
    const dedupedItinerary = await dedupeItineraryVenues(itinerary, destination, req.log);
    res.json(dedupedItinerary);
  } catch (err) {
    req.log.error({ err }, "Failed to generate itinerary");
    res.status(500).json({ error: (err as Error).message || "Failed to generate itinerary" });
  }
});

router.post("/packing", async (req: Request, res: Response): Promise<void> => {
  const parsed = GeneratePackingListBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { destination, days, vibes, budget } = parsed.data;

  const prompt = `You are a seasoned travel packer. Generate a smart, curated packing list for a ${days}-day group trip to ${destination}.

Trip details:
- Destination: ${destination}
- Duration: ${days} days
- Vibes: ${vibes.join(", ")}
- Budget: ${budget}

Create a practical packing list tailored to these trip vibes and destination. Include destination-specific items.

Respond with ONLY valid JSON (no markdown):
{
  "list": {
    "essentials": ["Passport", "Travel insurance docs"],
    "clothing": ["items appropriate for vibes and destination"],
    "toiletries": ["travel-sized items"],
    "tech": ["adapters, chargers, devices"],
    "activities": ["gear specific to the trip vibes"],
    "tips": ["2-3 destination-specific pro tips"]
  }
}`;

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 4000,
      system: "You are a JSON API. Always respond with only valid JSON. No preamble, no explanation, no markdown code blocks. Start directly with {.",
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "{" },
      ],
    };

    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (packing)");
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }

    const allText = "{" + (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const packingResult = extractAndParseJson(allText);
    res.json(packingResult);
  } catch (err) {
    req.log.error({ err }, "Failed to generate packing list");
    res.status(500).json({ error: (err as Error).message || "Failed to generate packing list" });
  }
});

function flightRangeDescription(distance: string): string {
  const d = distance.toLowerCase();
  if (d.includes("nearby") || d.includes("< 3") || d.includes("<3")) {
    return "under 3 hours (short-haul only — do NOT suggest destinations that require 3+ hours of flying)";
  }
  if (d.includes("mid") || d.includes("3") && d.includes("8")) {
    return "between 3 and 8 hours — MINIMUM 3 hours and MAXIMUM 8 hours. Destinations reachable in UNDER 3 hours are TOO CLOSE and must not be included. Destinations requiring MORE THAN 8 hours are TOO FAR and must not be included.";
  }
  if (d.includes("anywhere") || d.includes("long") || d.includes("any")) {
    return "ANY flight duration — absolutely no restriction on distance. Long-haul destinations (8h, 12h, 15h+) are completely valid and encouraged. Do NOT default to nearby short-haul options just because they are convenient — think globally: Southeast Asia, South America, Japan, Australia, East Africa, etc. are all fair game.";
  }
  return distance;
}

router.post("/suggest-destinations", async (req: Request, res: Response): Promise<void> => {
  // Support both single-preference (legacy) and multi-member preferences
  const body = req.body as {
    // Legacy single-preference fields
    tripType?: string[];
    distance?: string;
    budget?: string;
    days?: number;
    mustHaves?: string;
    // New: array of per-member preferences
    memberPreferences?: Array<{
      name: string;
      vibes: string[];
      distance: string;
      budget: string;
      days: number;
      startDate?: string | null;
      startLocation?: string;
    }>;
    // Destinations already shown — must not appear again
    excludedDestinations?: string[];
  };

  const isGroupMode = Array.isArray(body.memberPreferences) && body.memberPreferences.length > 0;

  if (!isGroupMode && (!body.tripType?.length || !body.distance || !body.budget || !body.days)) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  let prompt: string;

  const excluded = body.excludedDestinations ?? [];

  if (isGroupMode) {
    const prefs = body.memberPreferences!;
    const memberLines = prefs.map((p) =>
      `- ${p.name}: vibes [${p.vibes.join(", ")}], flight range: ${flightRangeDescription(p.distance)}, budget "${p.budget}", duration ${p.days} days${p.startDate ? `, preferred start ${p.startDate}` : ""}${p.startLocation ? `, flying from ${p.startLocation}` : ""}`
    ).join("\n");

    // Aggregate vibes with counts
    const allVibes = prefs.flatMap((p) => p.vibes);
    const vibeCounts: Record<string, number> = {};
    allVibes.forEach((v) => { vibeCounts[v] = (vibeCounts[v] ?? 0) + 1; });
    const sortedVibes = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]);
    const topVibes = sortedVibes.slice(0, 5).map(([v]) => v);
    const dominantVibe = sortedVibes[0]?.[0] ?? "";
    const totalMembers = prefs.length;

    prompt = `You are a world-class group travel expert. Suggest exactly 3 destinations that genuinely match this group's vibes.

Individual member preferences:
${memberLines}

Group vibe summary (sorted by popularity):
${sortedVibes.map(([v, count]) => `- "${v}": ${count}/${totalMembers} members want this`).join("\n")}
Dominant vibe: "${dominantVibe}"
${excluded.length > 0 ? `
ALREADY SHOWN — DO NOT REPEAT THESE UNDER ANY CIRCUMSTANCES:
${excluded.map((d) => `- ${d}`).join("\n")}
` : ""}

━━━ HARD RULE 1: VIBES ARE NON-NEGOTIABLE ━━━
Each vibe maps to SPECIFIC destination types. You MUST respect these mappings:

"beach" → coastal/island destinations with actual beaches: tropical islands (Bali, Phuket, Maldives, Zanzibar, Mykonos, Santorini), beach resort towns (Algarve, Tulum, Cancún, Antalya coast, Hurghada, Koh Samui). Cities like Istanbul, London, Paris, Rome, Madrid, Berlin — even if near water — are NOT beach destinations. Never suggest an inland city or generic capital when beach is a top vibe.

"nature" → destinations where nature IS the attraction: national parks, mountains, fjords, rainforests, volcanic landscapes (Iceland, Patagonia, New Zealand, Costa Rica, Norwegian fjords, Swiss Alps, Azores, Scottish Highlands, Canadian Rockies). Do NOT suggest major cities.

"city" → vibrant urban centres with nightlife, museums, architecture: Tokyo, NYC, London, Paris, Dubai, Singapore, Barcelona, Berlin. ONLY use this type when "city" is an explicit vibe.

"culture" → historically rich destinations with heritage sites, local traditions: Kyoto, Rome, Athens, Cairo, Marrakech, Petra, Havana, Tbilisi, Sarajevo.

"adventure" → destinations built around outdoor thrills: Queenstown NZ, Interlaken, Moab Utah, Nepal, Madagascar, Patagonia, Iceland.

"relaxation" → slow-paced resort or wellness destinations: Maldives, Seychelles, Bora Bora, Tuscany countryside, Ubud Bali, Amalfi Coast.

"party" / "nightlife" → known nightlife hubs: Ibiza, Mykonos, Bangkok, Las Vegas, Cancún, Miami, Rio, Amsterdam.

"foodie" → destinations world-renowned for cuisine: Tokyo, Lyon, Bologna, San Sebastián, Mexico City, Singapore, Istanbul, Osaka.

SCORING RULE: For each candidate destination, count how many of the group's vibes it genuinely satisfies. Rank candidates by vibe score. Only suggest destinations with the HIGHEST scores. A destination that matches 3/4 vibes beats one that matches 1/4 even if the latter is more "famous".

━━━ HARD RULE 2: FLIGHT TIME ━━━
Each member's flight range is a strict limit — not a guideline. "Under 3 hours from Riyadh" means Europe (~6h) is INVALID. Only suggest destinations whose actual flight time falls within EVERY member's stated range. If members have different ranges, find destinations within the tightest shared window or flag the majority trade-off.

━━━ FORMATTING RULES ━━━
- Suggest 3 destinations that are genuinely different from each other (different regions or meaningfully different vibes)
- Each pitch: ONE punchy sentence (max 12 words) explaining why it works for THIS group
- Each destination: exactly 3 short tags (2–4 words each) reflecting the matched vibes
- flightHint: actual flight time from the most common start location, e.g. "~2h from Riyadh"
- bestTime: e.g. "May–Sept" or "Year-round"

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    {
      "name": "Bali, Indonesia",
      "pitch": "Beaches, jungle temples, and sunsets that never disappoint.",
      "tags": ["Beach paradise", "Spiritual vibes", "Adventure ready"],
      "flightHint": "~9h from London",
      "bestTime": "May–October"
    }
  ]
}`;
  } else {
    // Legacy single-preference mode
    const tripVibes = body.tripType ?? [];
    const vibeLines = tripVibes.length > 0 ? `- Vibes requested: ${tripVibes.join(", ")}` : "";

    prompt = `You are a world-class travel expert. Suggest exactly 3 distinct destinations that genuinely match the requested vibes.

Trip preferences:
${vibeLines}
- Flight range: ${flightRangeDescription(body.distance!)}
- Budget level: ${body.budget}
- Duration: ${body.days} days${body.mustHaves ? `\n- Must have: ${body.mustHaves}` : ""}
${excluded.length > 0 ? `
ALREADY SHOWN — DO NOT REPEAT THESE UNDER ANY CIRCUMSTANCES:
${excluded.map((d) => `- ${d}`).join("\n")}
` : ""}

━━━ HARD RULE 1: VIBES ARE NON-NEGOTIABLE ━━━
Each vibe maps to SPECIFIC destination types:
"beach" → actual coastal/island destinations with beaches (Bali, Phuket, Mykonos, Maldives, Algarve, Tulum, Zanzibar). NEVER suggest inland cities or generic capitals for a beach vibe.
"nature" → national parks, mountains, fjords, rainforests (Iceland, Patagonia, Costa Rica, NZ, Swiss Alps, Azores).
"city" → major urban centres (Tokyo, NYC, London, Barcelona, Dubai). Only use when city is explicitly requested.
"culture" → heritage-rich destinations (Rome, Athens, Kyoto, Marrakech, Cairo, Havana).
"adventure" → outdoor thrills (Queenstown, Interlaken, Nepal, Iceland, Moab).
"relaxation" → slow-paced resort/wellness destinations (Maldives, Seychelles, Tuscany, Ubud).
"party" / "nightlife" → nightlife hubs (Ibiza, Mykonos, Bangkok, Las Vegas, Cancún, Amsterdam).
"foodie" → cuisine capitals (Tokyo, Lyon, Bologna, San Sebastián, Mexico City, Singapore).

Rank destinations by how many of the requested vibes they satisfy. Highest score wins.

━━━ HARD RULE 2: FLIGHT TIME ━━━
The flight range above is a strict limit. Every suggestion must fall within those bounds exactly.

━━━ FORMATTING RULES ━━━
- 3 destinations, genuinely different regions or vibes
- Each pitch: ONE punchy sentence (max 12 words)
- Each destination: exactly 3 short tags (2–4 words each)
- flightHint: actual flight time e.g. "~2h from London"
- bestTime: e.g. "May–Sept" or "Year-round"

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    {
      "name": "Mykonos, Greece",
      "pitch": "Whitewashed cliffs, party beaches, and legendary Aegean sunsets.",
      "tags": ["Beach paradise", "Nightlife", "Stunning scenery"],
      "flightHint": "~3.5h from London",
      "bestTime": "June–September"
    },
    {
      "name": "Bali, Indonesia",
      "pitch": "Surf, rice terraces, temples, and the world's best sunsets.",
      "tags": ["Beach vibes", "Cultural depth", "Adventure ready"],
      "flightHint": "~15h from London",
      "bestTime": "May–October"
    },
    {
      "name": "Algarve, Portugal",
      "pitch": "Golden cliffs, hidden sea caves, and warm Atlantic waves.",
      "tags": ["Beach escape", "Scenic coast", "Relaxed pace"],
      "flightHint": "~2.5h from London",
      "bestTime": "May–October"
    }
  ]
}`;
  }

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (suggest-destinations)");
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const result = extractAndParseJson(allText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to suggest destinations");
    res.status(500).json({ error: (err as Error).message || "Failed to suggest destinations" });
  }
});

router.post("/suggest-accommodations", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    destination: string;
    days: number;
    memberCount: number;
    memberPreferences: Array<{
      name: string;
      maxCostPerPerson: number;
      type: string;
      rooms: number;
      location: string;
      amenities: string[];
      priority: string;
      cancellation: string;
    }>;
  };

  if (!body.destination || !body.days || !Array.isArray(body.memberPreferences) || body.memberPreferences.length === 0) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const { destination, days, memberCount, memberPreferences } = body;

  const memberLines = memberPreferences.map((p) =>
    `- ${p.name}: max $${p.maxCostPerPerson}/person, prefers ${p.type}, ${p.rooms} room(s), wants to be near "${p.location || "city center"}", amenities [${p.amenities.join(", ") || "none specified"}], priority: ${p.priority}, cancellation: ${p.cancellation}`
  ).join("\n");

  const totalNights = days;
  const avgMaxBudget = Math.round(memberPreferences.reduce((s, p) => s + p.maxCostPerPerson, 0) / memberPreferences.length);

  const prompt = `You are a group travel accommodation expert. A group of ${memberCount} traveler(s) needs accommodation in ${destination} for ${totalNights} night(s).

Individual member preferences:
${memberLines}

Group summary:
- Average max budget per person: $${avgMaxBudget} total for the trip
- Group size: ${memberCount} people

Suggest exactly 3 distinct, realistic accommodation options for ${destination} that best balance the group's needs. Make them genuinely different types or price points.

For each suggestion:
1. Use a realistic property name that could exist in ${destination}
2. Calculate totalCost = cost for ALL ${memberCount} people for ALL ${totalNights} nights
3. Calculate costPerPerson = totalCost / ${memberCount}
4. Keep costPerPerson close to avgMaxBudget but show range across the 3 options
5. distanceNote should reference how far it is from the city center or main attractions in ${destination}
6. whyItFits must explain in 1 punchy sentence why it works for THIS specific group

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    {
      "id": "opt-1",
      "name": "Hotel Palacio Central",
      "type": "hotel",
      "location": "Barrio Gótico, Barcelona",
      "totalCost": 1800,
      "costPerPerson": 450,
      "nights": ${totalNights},
      "rating": 4.3,
      "amenities": ["WiFi", "Breakfast included", "AC", "Rooftop terrace"],
      "rooms": 2,
      "beds": 4,
      "cancellation": "Free cancellation until 48h before check-in",
      "whyItFits": "Central location puts you 5 min from most of your wishlist spots.",
      "tags": ["Best location", "Breakfast included", "Great value"],
      "distanceNote": "5 min walk to La Rambla, 10 min to Gothic Quarter",
      "submittedBy": "AI"
    }
  ]
}`;

  try {
    const requestBody = {
      model: "claude-haiku-4-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await callAnthropic(requestBody);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (suggest-accommodations)");
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const result = extractAndParseJson(allText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to suggest accommodations");
    res.status(500).json({ error: (err as Error).message || "Failed to suggest accommodations" });
  }
});

router.post("/parse-accommodation", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { url?: string; destination?: string };
  if (!body.url) {
    res.status(400).json({ error: "Missing url." });
    return;
  }

  const rawUrl = body.url.trim();
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const destination = body.destination ?? "the destination";

  // ── Pre-parse the URL for structured hints ────────────────────────────────
  let parsedObj: URL | null = null;
  try { parsedObj = new URL(url); } catch { /* ignore */ }

  const hostname = parsedObj?.hostname?.replace(/^www\./, "") ?? "";
  const params = parsedObj ? Object.fromEntries(parsedObj.searchParams.entries()) : {};
  const pathSegments = parsedObj?.pathname?.split("/").filter(Boolean) ?? [];

  // Detect platform
  const platform =
    hostname.includes("airbnb") ? "airbnb" :
    hostname.includes("booking.com") ? "booking.com" :
    hostname.includes("expedia") ? "expedia" :
    hostname.includes("hotels.com") ? "hotels.com" :
    hostname.includes("hostelworld") ? "hostelworld" :
    hostname.includes("vrbo") ? "vrbo" :
    hostname.includes("tripadvisor") ? "tripadvisor" :
    hostname;

  // Extract human-readable slug from path (convert dashes to spaces, strip IDs)
  const slugHints = pathSegments
    .map(s => s.replace(/\.[a-z0-9]+$/i, ""))       // strip .h123 suffixes
    .map(s => s.replace(/[-_]/g, " "))
    .filter(s => s.length > 2 && !/^\d+$/.test(s))  // skip pure numeric segments
    .join(" | ");

  // Known query param keys that carry useful data across platforms
  const paramHints: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (["destination", "city", "location", "place", "q", "query", "name",
         "property_name", "hotel_name", "region", "chkin", "chkout",
         "checkin", "checkout", "check_in", "check_out"].includes(k)) {
      paramHints[k] = v;
    }
  }

  const urlContext = [
    `Platform: ${platform}`,
    slugHints ? `Path hints: ${slugHints}` : "",
    Object.keys(paramHints).length
      ? `Query params: ${Object.entries(paramHints).map(([k,v]) => `${k}=${v}`).join(", ")}`
      : "",
  ].filter(Boolean).join("\n");

  // ── Try fetching page content (best-effort; many sites block bots) ─────────
  let pageContent = "";
  const extractedPhotos: string[] = [];
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();

      // Extract photos from meta tags before stripping HTML.
      // og:image and twitter:image often survive bot-protection since they're
      // in the initial HTML payload (not JS-rendered).
      const photoPatterns = [
        /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*/gi,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*/gi,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*/gi,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*/gi,
      ];
      for (const pattern of photoPatterns) {
        for (const m of html.matchAll(pattern)) {
          const src = m[1];
          if (src && src.startsWith("http") && !extractedPhotos.includes(src)) {
            extractedPhotos.push(src);
          }
          if (extractedPhotos.length >= 5) break;
        }
        if (extractedPhotos.length >= 5) break;
      }

      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 4000);
    }
  } catch {
    // Silently fall back to URL-only inference
  }

  const prompt = `You are extracting accommodation listing details for a group travel app.

Full URL: ${url}
Trip destination (from app): ${destination}

URL analysis (pre-parsed — use these as primary hints):
${urlContext}

${pageContent ? `Page content (truncated, may be partial due to bot protection):\n${pageContent}` : "(Page content unavailable — infer entirely from the URL analysis above.)"}

Instructions:
- Extract the property name from the path slug or page content. For Expedia, the path is usually "{City}-Hotels-{Property-Name}.h{id}.Hotel-Information" — so extract just the property name part.
- Infer the property type from the platform (airbnb → "airbnb", hostelworld → "hostel", expedia/booking/hotels.com → "hotel").
- Use destination query param or path slug for location if page content is unavailable.
- For rating: only set a non-zero value if you find an actual rating number. Use 0 if unknown.
- Make amenities, tags, and whyItFits reasonable given the property name, platform, and destination.

Return ONLY valid JSON with these fields (no markdown, no explanation):
{
  "name": string,
  "type": "hotel" | "airbnb" | "hostel" | "other",
  "location": string,
  "rating": number,
  "amenities": string[],
  "cancellation": string,
  "tags": string[],
  "distanceNote": string,
  "whyItFits": string
}`;

  try {
    const response = await callAnthropic({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };
    if (!(response as unknown as globalThis.Response).ok) {
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }
    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const result = extractAndParseJson(allText) as any;

    // Fallback photos by accommodation type when og:image extraction yields nothing.
    // These are stable Unsplash photo IDs representing each category.
    const FALLBACK_BY_TYPE: Record<string, string> = {
      hotel:  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=480&fit=crop",
      airbnb: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=480&fit=crop",
      hostel: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=480&fit=crop",
      other:  "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=480&fit=crop",
    };
    const photos = extractedPhotos.length > 0
      ? extractedPhotos
      : [FALLBACK_BY_TYPE[(result as any).type ?? "other"] ?? FALLBACK_BY_TYPE.hotel];

    res.json({ ...result, photos });
  } catch (err) {
    req.log.error({ err }, "Failed to parse accommodation");
    res.status(500).json({ error: "Could not parse listing. Please try again." });
  }
});

router.post("/ai-pick-accommodation", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    suggestions: Array<{ name: string; type: string; location: string; costPerPerson: number; whyItFits: string }>;
    destination: string;
    memberCount: number;
  };

  if (!body.suggestions?.length || !body.destination) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const optionLines = body.suggestions
    .map((s, i) =>
      `Option ${i + 1} (index ${i}): ${s.name} (${s.type}) at ${s.location} — $${s.costPerPerson}/person — ${s.whyItFits}`
    )
    .join("\n");

  const prompt = `A group of ${body.memberCount} travelers are tied on accommodation options for ${body.destination}. Break the tie by picking the single best option for the group.

Options:
${optionLines}

Pick the best option by its 0-based index and explain in one sentence why it is the best group choice.
Respond with ONLY valid JSON: {"winnerIdx": 0, "reason": "One clear sentence."}`;

  try {
    const requestBody = {
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await callAnthropic(requestBody);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const result = extractAndParseJson(allText);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to pick accommodation");
    res.status(500).json({ error: "Could not determine accommodation winner." });
  }
});

router.post("/redo-activity", async (req: Request, res: Response): Promise<void> => {
  const { activity, city, theme, destination, budget, redoType, otherActivities, allTripActivities } = req.body as {
    activity: { name: string; description: string; tag: string; time: string; estimatedCost: number };
    city: string;
    theme: string;
    destination: string;
    budget?: string;
    redoType: "same_type" | "whole";
    otherActivities: string[];
    allTripActivities?: string[];
  };
  const budgetTier = budget ?? "midrange";

  if (!activity || !city || !destination || !redoType) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const others = (otherActivities ?? []).length > 0
    ? `\nActivities already on this day — do NOT repeat these:\n${(otherActivities ?? []).map((a: string) => `- ${a}`).join("\n")}`
    : "";

  const usedElsewhere = [...new Set(allTripActivities ?? [])];
  const tripWide = usedElsewhere.length > 0
    ? `\nVenues already used elsewhere in this trip (on OTHER days too) — do NOT reuse any of these:\n${usedElsewhere.map((a) => `- ${a}`).join("\n")}`
    : "";

  const sameTypeHint: Record<string, string> = {
    food: "different restaurant or eatery",
    nightlife: "different bar, club, or venue",
    shopping: "different market or shop",
    relaxation: "different spot or viewpoint for this experience",
    adventure: "different location or route for this activity type",
    culture: "different museum, gallery, or historic site",
    travel: "different travel stop or transit experience",
  };

  const task = redoType === "same_type"
    ? `TASK: Keep the same category (${activity.tag}) but suggest a DIFFERENT specific ${sameTypeHint[activity.tag] ?? "venue or location"} in ${city}. Same vibe, completely new place. The name must be a different real venue.`
    : `TASK: Replace this with a COMPLETELY DIFFERENT activity of a different type that fits the day theme "${theme}" in ${city}. Pick any of these tags: food, culture, adventure, relaxation, nightlife, shopping, travel.`;

  const prompt = `You are a travel planner replacing one activity in an itinerary.

Current activity being replaced:
- Name: ${activity.name}
- Type: ${activity.tag}
- Time: ${activity.time}
- Description: ${activity.description}

Destination: ${destination}
City: ${city}
Day theme: ${theme}
${others}
${tripWide}

${task}

Keep the same time slot (${activity.time}).
Name: must be a real, specific venue that you are highly confident actually exists in ${city} and can be found on Google Maps — NOT generic like "a nice restaurant", and NOT invented. Prefer iconic, well-known, long-established places over obscure guesses.
SAME-AREA RULE: the venue must be within ${city} itself, close enough to the day's other activities to reach by a short walk or quick taxi/transit ride — never in a different suburb, town, or a location requiring a long drive out of the area.
Must be currently open and operating — do NOT suggest anything permanently closed, demolished, or out of business. If you are not certain a specific venue exists or is still open, pick a different, safer, well-known venue instead.
Description: ONE sentence, max 15 words.
Cost: exact per-person USD cost matching real booking-platform prices (Viator/GetYourGuide). Use the activity TYPE, not just budget tier:
  FREE $0: open landmarks, temples/churches with no entry fee, public parks, beaches, viewpoints
  PAID ADMISSION $5–30: museums, palaces, archaeological sites (use known admission price when possible)
  GUIDED TOURS $30–150: food tours $40–80, city tours $30–60, cooking classes $60–130, boat trips $40–100, wine tastings $35–80
  FOOD per person: street food $3–12, casual local restaurant $8–20, mid-range sit-down $20–55, upscale $55–120, fine dining $100–250
  NIGHTLIFE: local bar $8–18, cocktail bar $15–35, rooftop bar $20–45, nightclub $20–50
  WELLNESS: spa/hammam $40–120, yoga class $15–40
  Budget modifier (${budgetTier}): ${budgetTier === "budget" ? "lean toward lower end; prefer free/cheap options" : budgetTier === "luxury" ? "lean toward upper end; use premium pricing" : "use mid-range values"}
  NEVER output 25 as a default — give the honest cost for this specific venue/experience.

Respond with ONLY valid JSON (no markdown):
{
  "time": "${activity.time}",
  "name": "Specific real venue name",
  "description": "One sentence max 15 words.",
  "tag": "${redoType === "same_type" ? activity.tag : "culture"}",
  "fromWish": false,
  "suggester": "AI pick",
  "estimatedCost": 0,
  "labels": [],
  "nearPrevious": false
}`;

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    };
    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };
    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (redo-activity)");
      res.status(400).json({ error: data.error?.message ?? "AI generation failed. Please try again." });
      return;
    }
    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const newActivity = extractAndParseJson(allText);
    res.json({ activity: newActivity });
  } catch (err) {
    req.log.error({ err }, "Failed to redo activity");
    res.status(500).json({ error: (err as Error).message || "Failed to redo activity" });
  }
});

/* ─── Read user notifications via Admin SDK (bypasses RTDB read rules) ─── */
router.get("/my-notifications", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    const uid = decoded.uid;
    const db = getAdminDb();
    const snap = await db.ref(`notifications/${uid}`).get();
    if (!snap.exists()) {
      res.json({ notifications: [] });
      return;
    }
    const notifications = Object.entries(snap.val() as Record<string, unknown>)
      .map(([id, v]) => ({ id, ...(v as object) }))
      .filter((n: any) => n.status === "pending")
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    res.json({ notifications });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

/* ─── Accept trip invite via Admin SDK (bypasses RTDB member-write rules) ─── */
router.post("/accept-invite", async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    const uid = decoded.uid;
    const { notifId, tripId, displayName } = req.body as {
      notifId: string;
      tripId: string;
      displayName: string | null;
    };
    const db = getAdminDb();
    await db.ref(`trips/${tripId}/members/${uid}`).set({
      name: displayName || "Traveler",
      joinedAt: new Date().toISOString(),
      isHost: false,
    });
    try { await db.ref(`userTrips/${uid}/${tripId}`).set(true); } catch {}
    await db.ref(`notifications/${uid}/${notifId}`).update({ status: "accepted" });
    res.json({ ok: true, tripId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || "Failed to accept invite" });
  }
});

/* ─── Send pack invites (server-side, bypasses client RTDB rules) ─── */
router.post("/send-pack-invites", async (req: Request, res: Response): Promise<void> => {
  const { tripId, tripName, fromName, fromUid, members, packName } = req.body as {
    tripId: string;
    tripName: string;
    fromName: string;
    fromUid: string;
    members: Array<{ uid: string; name: string }>;
    packName: string;
  };

  if (!tripId || !members?.length) {
    res.status(400).json({ error: "tripId and members are required" });
    return;
  }

  try {
    const db = getAdminDb();
    await Promise.all(
      members.map(m =>
        db.ref(`notifications/${m.uid}`).push({
          type: "trip_invite",
          tripId,
          tripName: tripName || "a trip",
          fromName: fromName || "Someone",
          fromUid,
          packName: packName || "a pack",
          createdAt: Date.now(),
          status: "pending",
        })
      )
    );
    res.json({ ok: true, sent: members.length });
  } catch (err) {
    req.log.error({ err }, "Failed to send pack invites");
    res.status(500).json({ error: (err as Error).message || "Failed to send invites" });
  }
});

export default router;
