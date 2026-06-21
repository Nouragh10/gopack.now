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

  const validTags = vibes.map(v => v.toLowerCase()).join("|");

  const prompt = `You are a world-class group travel planner. Generate a detailed ${days}-day itinerary for a group trip to ${destination}.

Trip details:
- Destination: ${destination}
- Duration: ${days} days
- Vibes chosen by the group: ${vibes.join(", ")}
- Budget level: ${budget}
${startDate ? `- Start date: ${startDate}` : ""}

Group wishes (voted by the group, most popular first):
${topWishes.length > 0 ? topWishes.join("\n") : "No specific wishes provided"}

CRITICAL RULES:
1. ONLY generate activities that match EXACTLY these vibes: ${vibes.join(", ")}. Do NOT add activities outside these categories.
2. Every activity's "tag" field MUST be one of: ${validTags}. No other tag values allowed.
3. Incorporate as many top-voted wishes as possible, marking them with "fromWish": true and the author's name as "suggester".
4. Activities NOT from wishes should have "fromWish": false and "suggester": "AI pick".
5. Keep descriptions to ONE short sentence (max 15 words). Be concise.
6. Generate EXACTLY ${activitiesPerDay} activities per day (group pace: ${pace}). No more, no less.
7. Every activity "name" MUST be a specific, real-world venue with its official name (e.g. "Sagrada Família" not "Famous Cathedral", "Nishiki Market" not "Local Market", "Eiffel Tower" not "Iconic Landmark"). Use the full official name so it resolves correctly on Google Maps.

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
  };

  const isGroupMode = Array.isArray(body.memberPreferences) && body.memberPreferences.length > 0;

  if (!isGroupMode && (!body.tripType?.length || !body.distance || !body.budget || !body.days)) {
    res.status(400).json({ error: "Missing required fields." });
    return;
  }

  let prompt: string;

  if (isGroupMode) {
    const prefs = body.memberPreferences!;
    const memberLines = prefs.map((p) =>
      `- ${p.name}: vibes [${p.vibes.join(", ")}], flight range "${p.distance}", budget "${p.budget}", duration ${p.days} days${p.startDate ? `, preferred start ${p.startDate}` : ""}${p.startLocation ? `, flying from ${p.startLocation}` : ""}`
    ).join("\n");

    // Aggregate to find common ground
    const allVibes = prefs.flatMap((p) => p.vibes);
    const vibeCounts: Record<string, number> = {};
    allVibes.forEach((v) => { vibeCounts[v] = (vibeCounts[v] ?? 0) + 1; });
    const topVibes = Object.entries(vibeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v]) => v);

    prompt = `You are a world-class group travel expert. A friend group can't agree on where to go. Based on EACH member's individual preferences below, suggest exactly 3 destinations that best satisfy the group as a whole — finding common ground and making smart compromises.

Individual member preferences:
${memberLines}

Group profile summary:
- Most popular vibes across the group: ${topVibes.join(", ")}
- Number of members: ${prefs.length}

Rules:
1. Make the 3 destinations genuinely different — different regions or meaningfully different vibes.
2. Pick destinations that honour the MAJORITY preferences while still working for outliers.
3. Each pitch must be ONE punchy sentence (max 12 words) that speaks to why it works for THIS group.
4. Each destination gets exactly 3 short tags (2-4 words each).
5. flightHint: one short phrase like "~9h from NYC" or "2h from most of Europe". If start locations are provided, reference the most common one.
6. bestTime: e.g. "May–Sept" or "Year-round".
7. If members list start locations, consider realistic travel times and connections from those cities.

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    {
      "name": "Lisbon, Portugal",
      "pitch": "Sun, pastéis, cheap wine, and Europe's best nightlife.",
      "tags": ["Warm weather", "Food scene", "Budget-friendly"],
      "flightHint": "~2h from London",
      "bestTime": "April–October"
    }
  ]
}`;
  } else {
    prompt = `You are a world-class travel expert. Suggest exactly 3 distinct destination options for a group trip.

Trip preferences:
- Travel style: ${body.tripType!.join(", ")}
- Flight range: ${body.distance}
- Budget level: ${body.budget}
- Duration: ${body.days} days${body.mustHaves ? `\n- Must have: ${body.mustHaves}` : ""}

Rules:
1. Make the 3 destinations genuinely different from each other — different continents or meaningfully different vibes.
2. Each pitch must be ONE punchy sentence (max 12 words). No fluff.
3. Each destination gets exactly 3 short tags (2-4 words each).
4. flightHint: one short phrase like "~9h from NYC" or "2h from most of Europe".
5. bestTime: e.g. "May–Sept" or "Year-round".

Respond with ONLY valid JSON, no markdown:
{
  "suggestions": [
    {
      "name": "Lisbon, Portugal",
      "pitch": "Sun, pastéis, cheap wine, and Europe's best nightlife.",
      "tags": ["Warm weather", "Food scene", "Budget-friendly"],
      "flightHint": "~2h from London",
      "bestTime": "April–October"
    },
    {
      "name": "Mexico City, Mexico",
      "pitch": "World-class tacos, ancient ruins, and a buzzing art scene.",
      "tags": ["Rich culture", "Amazing food", "City energy"],
      "flightHint": "~5h from NYC",
      "bestTime": "Oct–April"
    },
    {
      "name": "Chiang Mai, Thailand",
      "pitch": "Temples, jungle treks, street food for pennies.",
      "tags": ["Adventure", "Budget-friendly", "Nature"],
      "flightHint": "~11h from London",
      "bestTime": "Nov–Feb"
    }
  ]
}`;
  }

  try {
    const body = {
      model: "claude-haiku-4-5",
      max_tokens: 800,
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

  // Try to fetch the listing page for content extraction
  let pageContent = "";
  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoPackBot/1.0; +https://gopack.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      // Strip tags, collapse whitespace, truncate
      pageContent = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 4000);
    }
  } catch {
    // Fetch failed — Claude will infer from URL alone
  }

  const prompt = `You are extracting accommodation listing details for a travel app.

URL: ${url}
Trip destination: ${destination}
${pageContent ? `\nPage content (truncated):\n${pageContent}` : "\n(Page could not be fetched — infer from URL and domain only.)"}

Extract and return a JSON object with these fields:
- name: string (property name, or a reasonable name inferred from the URL/domain)
- type: "hotel" | "airbnb" | "hostel" | "other"
- location: string (neighbourhood/city, use destination if unknown)
- rating: number (0–10 scale if reviews found; 0–5 star rating kept as-is; 0 if unknown)
- amenities: string[] (up to 6 key amenities, empty array if unknown)
- cancellation: string (e.g. "Free cancellation", "Non-refundable", or "Check listing")
- tags: string[] (2–4 short descriptive tags like "Central location", "Great views", "Pet-friendly")
- distanceNote: string (distance to centre or landmark, or "See listing for details")
- whyItFits: string (one short sentence on why this suits a group trip to ${destination})

Respond with ONLY valid JSON. No markdown, no explanation.`;

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
    res.json(result);
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

export default router;
