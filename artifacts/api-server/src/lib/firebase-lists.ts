export function firebaseListEntries<T>(value: unknown): Array<{ key: string; value: T }> {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      entry && typeof entry === "object"
        ? [{ key: String(index), value: entry as T }]
        : [],
    );
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry && typeof entry === "object")
    .sort(([left], [right]) => {
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : left.localeCompare(right);
    })
    .map(([key, entry]) => ({ key, value: entry as T }));
}

export function normalizeActivityList(value: unknown): Array<Record<string, unknown>> {
  return firebaseListEntries<Record<string, unknown>>(value).map(({ value }) => ({ ...value }));
}

export function resolveFirebaseDayEntry<T extends { day?: unknown; dayNumber?: unknown }>(
  entries: Array<{ key: string; value: T }>,
  requestedDayNumber: number,
): { key: string; value: T; canonicalDayNumber: number } | undefined {
  const exact = entries.find(({ value }, index) => {
    const stored = Number(value.dayNumber ?? value.day);
    const canonical = Number.isInteger(stored) && stored > 0 ? stored : index + 1;
    return canonical === requestedDayNumber;
  });
  const selected =
    exact ??
    (requestedDayNumber > 0 ? entries[requestedDayNumber - 1] : undefined) ??
    (requestedDayNumber >= 0 ? entries[requestedDayNumber] : undefined);
  if (!selected) return undefined;

  const index = entries.indexOf(selected);
  const canonicalDayNumber = exact ? requestedDayNumber : index + 1;
  return { ...selected, canonicalDayNumber };
}

function normalizeActivityText(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
    : "";
}

function legacyActivityMatchScore(
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
): number {
  const sameName =
    normalizeActivityText(candidate.name) === normalizeActivityText(target.name);
  const sameTime =
    normalizeActivityText(candidate.time) === normalizeActivityText(target.time);
  const sameDescription =
    normalizeActivityText(candidate.description) !== "" &&
    normalizeActivityText(candidate.description) === normalizeActivityText(target.description);
  if (!sameName && !(sameTime && sameDescription)) {
    return -1;
  }

  let score = sameName ? 8 : 0;
  if (sameTime) score += 4;
  if (sameDescription) score += 2;
  for (const field of ["suggester", "tag"] as const) {
    const candidateValue = normalizeActivityText(candidate[field]);
    const targetValue = normalizeActivityText(target[field]);
    if (candidateValue && targetValue && candidateValue === targetValue) score += 1;
  }
  if (
    typeof candidate.fromWish === "boolean" &&
    typeof target.fromWish === "boolean" &&
    candidate.fromWish === target.fromWish
  ) {
    score += 1;
  }
  return score;
}

export function resolveFirebaseActivityIndex(
  activities: Array<Record<string, unknown>>,
  activityId?: string,
  targetActivity?: Record<string, unknown>,
): number {
  if (activityId) {
    const idIndex = activities.findIndex((candidate) => candidate.id === activityId);
    if (idIndex !== -1) return idIndex;
  }

  if (targetActivity) {
    let bestIndex = -1;
    let bestScore = -1;
    activities.forEach((candidate, index) => {
      const score = legacyActivityMatchScore(candidate, targetActivity);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    return bestIndex;
  }

  return -1;
}