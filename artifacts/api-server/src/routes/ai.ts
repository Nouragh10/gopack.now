import { Router, type IRouter } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { GenerateItineraryBody, GeneratePackingListBody } from "@workspace/api-zod";

const router: IRouter = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post("/itinerary", async (req, res): Promise<void> => {
  const parsed = GenerateItineraryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { destination, days, vibes, budget, startDate, wishes } = parsed.data;

  const topWishes = wishes
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 20)
    .map((w, i) => `${i + 1}. "${w.text}" by ${w.author} (${w.votes} votes)`);

  const prompt = `You are a world-class group travel planner. Generate a detailed ${days}-day itinerary for a group trip to ${destination}.

Trip details:
- Destination: ${destination}
- Duration: ${days} days
- Vibes: ${vibes.join(", ")}
- Budget level: ${budget}
${startDate ? `- Start date: ${startDate}` : ""}

Group wishes (voted by the group, most popular first):
${topWishes.length > 0 ? topWishes.join("\n") : "No specific wishes provided"}

Create a day-by-day itinerary that incorporates as many top-voted wishes as possible. For each activity, note if it fulfills a wish and which group member suggested it.

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "title": "Catchy trip title",
  "days": [
    {
      "dayNumber": 1,
      "city": "City name",
      "theme": "Day theme (e.g. 'Arrival & First Bites')",
      "activities": [
        {
          "time": "9:00 AM",
          "name": "Activity name",
          "description": "2-3 sentence description with insider tips",
          "tag": "food|culture|adventure|relaxation|nightlife|shopping|travel",
          "fromWish": true,
          "suggester": "member name or 'AI pick'",
          "estimatedCost": 25,
          "labels": ["Must-try", "Group favorite"],
          "nearPrevious": false,
          "actId": "act_001"
        }
      ]
    }
  ]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    let jsonText = content.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    const itinerary = JSON.parse(jsonText);
    res.json(itinerary);
  } catch (err) {
    req.log.error({ err }, "Failed to generate itinerary");
    res.status(500).json({ error: "Failed to generate itinerary" });
  }
});

router.post("/packing", async (req, res): Promise<void> => {
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

Create a practical packing list tailored to these trip vibes and destination. Include destination-specific items (e.g. prayer-appropriate clothing for religious sites, water shoes for beach trips, etc.).

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "list": {
    "essentials": ["Passport", "Travel insurance docs", ...],
    "clothing": ["items appropriate for vibes and destination"],
    "toiletries": ["travel-sized items"],
    "tech": ["adapters, chargers, devices"],
    "activities": ["gear specific to the trip vibes"],
    "tips": ["2-3 destination-specific pro tips"]
  }
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    let jsonText = content.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    const packingResult = JSON.parse(jsonText);
    res.json(packingResult);
  } catch (err) {
    req.log.error({ err }, "Failed to generate packing list");
    res.status(500).json({ error: "Failed to generate packing list" });
  }
});

export default router;
