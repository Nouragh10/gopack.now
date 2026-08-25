import AsyncStorage from "@react-native-async-storage/async-storage";

export type TravelPace = "Relaxed" | "Balanced" | "Full days";
export type PlanningFocus = "Food + culture" | "Outdoors" | "Mix of everything";

export interface AppPreferences {
  hapticFeedback: boolean;
  showEstimatedCosts: boolean;
}

export interface TravelPreferences {
  pace: TravelPace;
  focus: PlanningFocus;
}

export interface PackyoSettings {
  app: AppPreferences;
  travel: TravelPreferences;
}

const SETTINGS_STORAGE_KEY = "@packyo/settings";

export const DEFAULT_PACKYO_SETTINGS: PackyoSettings = {
  app: {
    hapticFeedback: true,
    showEstimatedCosts: true,
  },
  travel: {
    pace: "Balanced",
    focus: "Mix of everything",
  },
};

let cachedSettings: PackyoSettings | null = null;
let loadPromise: Promise<PackyoSettings> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function normalizeSettings(value: Partial<PackyoSettings> | null | undefined): PackyoSettings {
  return {
    app: { ...DEFAULT_PACKYO_SETTINGS.app, ...(value?.app ?? {}) },
    travel: { ...DEFAULT_PACKYO_SETTINGS.travel, ...(value?.travel ?? {}) },
  };
}

export async function loadPackyoSettings(): Promise<PackyoSettings> {
  if (cachedSettings) return cachedSettings;
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((stored) => {
        if (!stored) return DEFAULT_PACKYO_SETTINGS;
        try {
          return normalizeSettings(JSON.parse(stored) as Partial<PackyoSettings>);
        } catch {
          return DEFAULT_PACKYO_SETTINGS;
        }
      })
      .catch(() => DEFAULT_PACKYO_SETTINGS)
      .then((settings) => {
        cachedSettings = settings;
        return settings;
      });
  }
  return loadPromise;
}

export async function updatePackyoSettings(
  patch: Partial<{ app: Partial<AppPreferences>; travel: Partial<TravelPreferences> }>,
): Promise<PackyoSettings> {
  let result = DEFAULT_PACKYO_SETTINGS;
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await loadPackyoSettings();
      result = {
        app: { ...current.app, ...(patch.app ?? {}) },
        travel: { ...current.travel, ...(patch.travel ?? {}) },
      };
      cachedSettings = result;
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(result));
    });
  await writeQueue;
  return result;
}

export function defaultVibesForTravelPreferences(preferences: TravelPreferences): string[] {
  const focusVibes =
    preferences.focus === "Food + culture"
      ? ["Foodie", "Culture"]
      : preferences.focus === "Outdoors"
        ? ["Adventure"]
        : ["Foodie", "Culture"];
  const paceVibe =
    preferences.pace === "Relaxed"
      ? ["Relaxing"]
      : preferences.pace === "Full days"
        ? ["Adventure"]
        : [];
  return [...new Set([...paceVibe, ...focusVibes])].slice(0, 3);
}