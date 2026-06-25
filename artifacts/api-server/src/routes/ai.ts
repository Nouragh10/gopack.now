import { Router, type IRouter, type Request, type Response } from "express";
import { GenerateItineraryBody, GeneratePackingListBody } from "@workspace/api-zod";

const router: IRouter = Router();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function callAnthropic(body: object, retries = 3): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
    "anthropic-version": "2023-06-01",
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

function extractJson(text: string): string {
  const stripped = text
    .replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : stripped;
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
1. The "days" array MUST have EXACTLY ${days} elements numbered 1–${days}.
2. Each day MUST have EXACTLY ${activitiesPerDay} activities (pace: ${pace}).
3. Every activity's "tag" must be one of: ${validTags.join(", ")}.
4. Every activity "name" must be a real venue's official name (e.g. "Sagrada Família" not "Famous Cathedral").
5. Descriptions: ONE sentence, max 15 words.
6. Do not repeat the same venue or the same activity type more than once per day.

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
          "estimatedCost": 25,
          "labels": ["Must-try"],
          "nearPrevious": false
        }
      ]
    }
  ]
}`;

  try {
    const body = {
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (itinerary)");
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const cleanJson = extractJson(allText);
    const itinerary = JSON.parse(cleanJson);
    res.json(itinerary);
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
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    };

    const response = await callAnthropic(body);
    const data = await (response as unknown as globalThis.Response).json() as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message: string };
    };

    if (!(response as unknown as globalThis.Response).ok) {
      req.log.error({ data }, "Anthropic API error (packing)");
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const cleanJson = extractJson(allText);
    const packingResult = JSON.parse(cleanJson);
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
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const cleanJson = extractJson(allText);
    const result = JSON.parse(cleanJson);
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
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }

    const allText = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");

    const cleanJson = extractJson(allText);
    const result = JSON.parse(cleanJson);
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
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }
    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const result = JSON.parse(extractJson(allText));
    res.json({ ...result, photos: extractedPhotos });
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
    const cleanJson = extractJson(allText);
    const result = JSON.parse(cleanJson);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to pick accommodation");
    res.status(500).json({ error: "Could not determine accommodation winner." });
  }
});

router.post("/redo-activity", async (req: Request, res: Response): Promise<void> => {
  const { activity, city, theme, destination, redoType, otherActivities } = req.body as {
    activity: { name: string; description: string; tag: string; time: string; estimatedCost: number };
    city: string;
    theme: string;
    destination: string;
    redoType: "same_type" | "whole";
    otherActivities: string[];
  };

  if (!activity || !city || !destination || !redoType) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  const others = (otherActivities ?? []).length > 0
    ? `\nActivities already on this day — do NOT repeat these:\n${(otherActivities ?? []).map((a: string) => `- ${a}`).join("\n")}`
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

${task}

Keep the same time slot (${activity.time}).
Name: must be a real, specific venue or place — NOT generic like "a nice restaurant".
Description: ONE sentence, max 15 words.
Cost: realistic USD per person estimate.

Respond with ONLY valid JSON (no markdown):
{
  "time": "${activity.time}",
  "name": "Specific real venue name",
  "description": "One sentence max 15 words.",
  "tag": "${redoType === "same_type" ? activity.tag : "culture"}",
  "fromWish": false,
  "suggester": "AI pick",
  "estimatedCost": 25,
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
      res.status((response as unknown as globalThis.Response).status).json(data);
      return;
    }
    const allText = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
    const cleanJson = extractJson(allText);
    const newActivity = JSON.parse(cleanJson);
    res.json({ activity: newActivity });
  } catch (err) {
    req.log.error({ err }, "Failed to redo activity");
    res.status(500).json({ error: (err as Error).message || "Failed to redo activity" });
  }
});

export default router;
