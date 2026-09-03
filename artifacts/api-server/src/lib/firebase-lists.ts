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

function isSameLegacyActivity(
  candidate: Record<string, unknown>,
  target: Record<string, unknown>,
): boolean {
  return (
    candidate.name === target.name &&
    candidate.time === target.time &&
    candidate.description === target.description &&
    candidate.suggester === target.suggester &&
    Boolean(candidate.fromWish) === Boolean(target.fromWish)
  );
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
    return activities.findIndex((candidate) => isSameLegacyActivity(candidate, targetActivity));
  }

  return -1;
}