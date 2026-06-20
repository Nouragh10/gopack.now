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
5. Keep activity descriptions to 1-2 sentences with practical tips.

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
      max_tokens: 4000,
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

export default router;
