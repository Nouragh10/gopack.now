/**
 * WikiImage — loads a relevant photo for a named place.
 *
 * Strategy (in order):
 *  0. Category fallback immediately → keeps every card visually complete
 *  1. Wikipedia REST summary API   → thumbnail.source (covers most famous landmarks)
 *  2. Wikipedia pageimages API     → page thumbnail (wider coverage)
 *  3. Wikimedia Commons search     → place-specific image when a page has no thumbnail
 *
 * No API key required for any step.
 */

import React, { useEffect, useRef, useState } from "react";
import { Image, ImageStyle, View, ViewStyle } from "react-native";

interface WikiImageProps {
  /** Primary search term — usually the activity/place name */
  name: string;
  /** Fallback context (e.g. destination city) to disambiguate a place search */
  context?: string;
  /** More precise place/photo search text supplied by the itinerary service */
  query?: string;
  /** Used only when no place-specific image can be found */
  fallbackCategory?: string;
  /** Stable position within the itinerary, used to avoid repeated fallbacks */
  fallbackIndex?: number;
  style: ImageStyle | ViewStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  /** Background colour while loading */
  placeholderColor?: string;
}

/** Strip everything from the first comma, ampersand, or parenthesis so Wikipedia finds it */
function cleanName(name: string): string {
  return name.replace(/[,&(].*$/, "").trim();
}

const FALLBACK_IMAGES: Record<string, string[]> = {
  food: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&h=500&fit=crop",
  ],
  dining: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=800&h=500&fit=crop",
  ],
  culture: [
    "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&h=500&fit=crop",
  ],
  museum: [
    "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=500&fit=crop",
  ],
  art: [
    "https://images.unsplash.com/photo-1564399579883-451a5d44ec08?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&h=500&fit=crop",
  ],
  adventure: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=500&fit=crop",
  ],
  outdoor: [
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=500&fit=crop",
  ],
  nature: [
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&h=500&fit=crop",
  ],
  transport: [
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&h=500&fit=crop",
  ],
  relaxation: [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=500&fit=crop",
  ],
  wellness: [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=500&fit=crop",
  ],
  nightlife: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800&h=500&fit=crop",
  ],
  shopping: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=500&fit=crop",
  ],
  beach: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1439405326854-014607f694d7?w=800&h=500&fit=crop",
  ],
  default: [
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&h=500&fit=crop",
  ],
};

const UNIQUE_FALLBACK_IMAGES = [...new Set(Object.values(FALLBACK_IMAGES).flat())];

function getFallbackImage(category?: string, fallbackIndex?: number): string {
  if (fallbackIndex !== undefined) {
    return UNIQUE_FALLBACK_IMAGES[Math.abs(fallbackIndex) % UNIQUE_FALLBACK_IMAGES.length];
  }

  const images =
    FALLBACK_IMAGES[category?.trim().toLowerCase() ?? ""] ?? FALLBACK_IMAGES.default;
  return images[0];
}

export function WikiImage({
  name,
  context = "",
  query,
  fallbackCategory,
  fallbackIndex,
  style,
  resizeMode = "cover",
  placeholderColor = "#E5E7EB",
}: WikiImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  const mounted = useRef(true);
  const fallbackUri = getFallbackImage(fallbackCategory, fallbackIndex);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
      // Render a useful image immediately, then replace it with a
      // place-specific result when one is available.
      setUri(fallbackUri);

    async function load() {
      // photoQuery comes from the itinerary generation response and is usually
      // more specific than the display name (for example, "Louvre Museum Paris").
      const searchTerm = query?.trim() || `${name} ${context}`.trim();
      const cleaned = cleanName(searchTerm);

      // ── Step 1: Wikipedia summary API ───────────────────────────────────
      try {
        const r = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned)}`,
          { headers: { Accept: "application/json" } }
        );
        if (!cancelled && r.ok) {
          const data = await r.json();
          if (data?.thumbnail?.source) {
            setUri(data.thumbnail.source);
            return;
          }
        }
      } catch {
        // fall through
      }

      if (cancelled) return;

      // ── Step 2: Wikipedia pageimages API (fuzzy title match) ─────────────
      try {
        const url =
          `https://en.wikipedia.org/w/api.php?action=query` +
          `&prop=pageimages&piprop=thumbnail&pithumbsize=500` +
          `&titles=${encodeURIComponent(cleaned)}` +
          `&format=json&origin=*`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!cancelled && r.ok) {
          const data = await r.json();
          const pages: Record<string, { thumbnail?: { source: string } }> =
            data?.query?.pages ?? {};
          for (const page of Object.values(pages)) {
            if (page?.thumbnail?.source) {
              setUri(page.thumbnail.source);
              return;
            }
          }
        }
      } catch {
        // fall through
      }

      if (cancelled) return;

      // ── Step 3: Wikimedia Commons place search ───────────────────────────
      // Do not show a random scenic image: a wrong image is less useful than
      // the neutral loading placeholder for a specific itinerary stop.
      try {
        const url =
          `https://commons.wikimedia.org/w/api.php?action=query` +
          `&generator=search&gsrnamespace=6&gsrlimit=1` +
          `&gsrsearch=${encodeURIComponent(searchTerm)}` +
          `&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!cancelled && r.ok) {
          const data = await r.json();
          const pages: Record<string, { imageinfo?: Array<{ thumburl?: string; url?: string }> }> =
            data?.query?.pages ?? {};
          for (const page of Object.values(pages)) {
            const image = page?.imageinfo?.[0];
            if (image?.thumburl || image?.url) {
              setUri(image.thumburl ?? image.url ?? null);
              return;
            }
          }
        }
      } catch {
        // Keep the category fallback when no place-specific image is available.
      }

      if (!cancelled && mounted.current) setUri(fallbackUri);
    }

    load();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [name, context, query, fallbackUri]);

  if (!uri) {
    return <View style={[style as ViewStyle, { backgroundColor: placeholderColor }]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style as ImageStyle}
      resizeMode={resizeMode}
      onError={() => {
        // Keep the card visual even when a remote place image has expired.
        setUri((current) => current === fallbackUri ? null : fallbackUri);
      }}
    />
  );
}
