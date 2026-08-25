import { jsonrepair } from "jsonrepair";

export type ItineraryActivity = {
  name: string;
  tag: string;
  [key: string]: unknown;
};

export type ItineraryDay = {
  activities: ItineraryActivity[];
  [key: string]: unknown;
};

export type ItineraryShape = {
  days: ItineraryDay[];
  [key: string]: unknown;
};

export class ItineraryResponseError extends Error {
  readonly code = "INVALID_ITINERARY_RESPONSE";
  readonly recoverable = true;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ItineraryResponseError";
  }
}

type ParseOptions = {
  expectedDays?: number;
  activitiesPerDay?: number;
};

function stripMarkdownFence(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

/**
 * Finds JSON-shaped portions without assuming the model returned only JSON.
 * Incomplete candidates are intentionally included so jsonrepair can close a
 * response cut off by a token limit.
 */
function findJsonCandidates(text: string): string[] {
  const stripped = stripMarkdownFence(text);
  const candidates: string[] = [stripped];
  const seen = new Set(candidates);

  // Anthropic assistant prefill can mean the response starts after the
  // opening brace: `"title": "...", "days": [...]}`. Add this before
  // scanning nested activity objects so the generic parser preserves the
  // complete top-level response as its first candidate.
  if (/^\s*"/.test(stripped)) {
    const prefixed = `{${stripped}`;
    if (!seen.has(prefixed)) {
      candidates.push(prefixed);
      seen.add(prefixed);
    }
  }

  for (let start = 0; start < stripped.length; start++) {
    if (stripped[start] !== "{" && stripped[start] !== "[") continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    let closed = false;

    for (let index = start; index < stripped.length; index++) {
      const char = stripped[index];

      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}" || char === "]") {
        const expected = stack[stack.length - 1] === "{" ? "}" : "]";
        if (char !== expected) break;
        stack.pop();
        if (stack.length === 0) {
          const candidate = stripped.slice(start, index + 1);
          if (!seen.has(candidate)) {
            candidates.push(candidate);
            seen.add(candidate);
          }
          closed = true;
          break;
        }
      }
    }

    // A response can be cut off before its closing braces arrive. Keep the
    // outermost partial object for jsonrepair instead of discarding it.
    if (!closed && stack.length > 0) {
      const candidate = stripped.slice(start);
      if (!seen.has(candidate)) {
        candidates.push(candidate);
        seen.add(candidate);
      }
    }
  }

  return candidates;
}

export function extractAndParseJson(text: string): unknown {
  const parsed = parseJsonCandidates(text);
  return parsed[0];
}

function parseJsonCandidates(text: string): unknown[] {
  const parsed: unknown[] = [];
  let lastError: unknown;

  for (const candidate of findJsonCandidates(text)) {
    try {
      parsed.push(JSON.parse(candidate));
      continue;
    } catch (parseError) {
      lastError = parseError;
    }

    try {
      parsed.push(JSON.parse(jsonrepair(candidate)));
    } catch (repairError) {
      lastError = repairError;
    }
  }

  if (parsed.length === 0) {
    throw new ItineraryResponseError(
      "The AI returned malformed or incomplete itinerary data.",
      { cause: lastError },
    );
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateItineraryShape(
  value: unknown,
  { expectedDays, activitiesPerDay }: ParseOptions,
): value is ItineraryShape {
  if (!isRecord(value)) return false;
  if (typeof value.title !== "string" || value.title.trim().length === 0) return false;
  if (!Array.isArray(value.days) || value.days.length === 0) return false;
  if (expectedDays !== undefined && value.days.length !== expectedDays) return false;

  return value.days.every((day, dayIndex) => {
    if (!isRecord(day)) return false;
    if (typeof day.dayNumber !== "number" || day.dayNumber !== dayIndex + 1) return false;
    if (typeof day.city !== "string" || day.city.trim().length === 0) return false;
    if (typeof day.theme !== "string" || day.theme.trim().length === 0) return false;
    if (!Array.isArray(day.activities) || day.activities.length === 0) return false;
    // The requested pace is the normal minimum. The itinerary prompt permits
    // additional activities when retaining every guaranteed group wish would
    // otherwise exceed the normal trip capacity.
    if (activitiesPerDay !== undefined && day.activities.length < activitiesPerDay) return false;

    return day.activities.every((activity) => (
      isRecord(activity) &&
      typeof activity.name === "string" &&
      activity.name.trim().length > 0 &&
      typeof activity.tag === "string" &&
      activity.tag.trim().length > 0
    ));
  });
}

export function isItineraryShape(value: unknown): value is ItineraryShape {
  return validateItineraryShape(value, {});
}

export function parseItineraryResponse(
  text: string,
  options: ParseOptions = {},
): ItineraryShape {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new ItineraryResponseError("The AI returned an empty itinerary response.");
  }

  for (const parsed of parseJsonCandidates(text)) {
    if (validateItineraryShape(parsed, options)) return parsed;
  }

  const expected = options.expectedDays === undefined
    ? "the requested itinerary"
    : `${options.expectedDays} day${options.expectedDays === 1 ? "" : "s"} with at least ${options.activitiesPerDay ?? "the requested number of"} activities per day`;
  throw new ItineraryResponseError(
    `The AI returned an incomplete itinerary. Expected ${expected}.`,
  );
}