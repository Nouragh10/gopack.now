/**
 * WikiImage — loads a relevant photo for a named place.
 *
 * Strategy (in order):
 *  1. Wikipedia REST summary API   → thumbnail.source (covers most famous landmarks)
 *  2. Wikipedia pageimages API     → page thumbnail (wider coverage)
 *  3. Picsum Photos with seed      → deterministic scenic photo (always works)
 *
 * No API key required for any step.
 */

import React, { useEffect, useRef, useState } from "react";
import { Image, ImageStyle, View, ViewStyle } from "react-native";

interface WikiImageProps {
  /** Primary search term — usually the activity/place name */
  name: string;
  /** Fallback context (e.g. destination city) used only for seed generation */
  context?: string;
  style: ImageStyle | ViewStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  /** Background colour while loading */
  placeholderColor?: string;
}

/** Simple numeric seed from a string, stable across renders */
function strSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 1000;
}

/** Strip everything from the first comma, ampersand, or parenthesis so Wikipedia finds it */
function cleanName(name: string): string {
  return name.replace(/[,&(].*$/, "").trim();
}

export function WikiImage({
  name,
  context = "",
  style,
  resizeMode = "cover",
  placeholderColor = "#E5E7EB",
}: WikiImageProps) {
  const [uri, setUri] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    async function load() {
      const cleaned = cleanName(name);

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

      // ── Step 3: Picsum with deterministic seed ───────────────────────────
      const seed = strSeed(name + context);
      setUri(`https://picsum.photos/seed/${seed}/500/350`);
    }

    load();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [name, context]);

  if (!uri) {
    return <View style={[style as ViewStyle, { backgroundColor: placeholderColor }]} />;
  }

  return (
    <Image
      source={{ uri }}
      style={style as ImageStyle}
      resizeMode={resizeMode}
      onError={() => {
        // If the resolved URL also fails, fall back to Picsum
        const seed = strSeed(name + context);
        setUri(`https://picsum.photos/seed/${seed}/500/350`);
      }}
    />
  );
}
