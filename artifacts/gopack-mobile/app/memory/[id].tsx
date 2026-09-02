import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useTrip } from "@/hooks/useFirebase";
import { apiFetch } from "@/lib/api-client";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function memoryGuideHtml(
  destination: string,
  guide: {
    title: string;
    opening: string;
    highlights: Array<{ title: string; story: string }>;
    byTheNumbers: Array<{ label: string; value: string }>;
    closing: string;
    generatedAt: string;
  },
  photos: string[],
): string {
  const photoGrid = photos.slice(0, 6).map((photo, index) =>
    `<img class="photo photo-${index + 1}" src="${escapeHtml(photo)}" alt="Trip memory ${index + 1}" />`
  ).join("");
  const stats = guide.byTheNumbers.map((item) =>
    `<div class="stat"><strong>${escapeHtml(item.value)}</strong><span>${escapeHtml(item.label)}</span></div>`
  ).join("");
  const highlights = guide.highlights.map((highlight, index) =>
    `<section class="highlight"><div class="number">${index + 1}</div><div><h2>${escapeHtml(highlight.title)}</h2><p>${escapeHtml(highlight.story)}</p></div></section>`
  ).join("");
  const generated = guide.generatedAt
    ? new Date(guide.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#F7F3ED;color:#201B17;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .cover{min-height:297mm;padding:54px 50px;background:linear-gradient(145deg,#19140F,#35261C);color:#FFF9F2;display:flex;flex-direction:column;page-break-after:always}
    .brand{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#F47757;font-weight:800}.destination{margin-top:auto;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#C9BEB3}
    h1{font-family:Georgia,serif;font-size:52px;line-height:1.05;margin:18px 0 24px}.opening{font-family:Georgia,serif;font-size:21px;line-height:1.6;color:#E8DED5;max-width:620px}
    .photos{display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:150px 150px;gap:7px;margin-top:38px}.photo{width:100%;height:100%;object-fit:cover;border-radius:10px}.photo-1{grid-row:1/3}.photo-4,.photo-5,.photo-6{display:none}
    .content{padding:46px 50px}.eyebrow{font-size:10px;letter-spacing:2.5px;color:#D4573E;text-transform:uppercase;font-weight:800}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0 34px}
    .stat{border:1px solid #DDD2C7;border-radius:14px;padding:16px;background:#FFFDF9}.stat strong{display:block;font-family:Georgia,serif;font-size:25px;color:#D4573E}.stat span{font-size:10px;color:#746B64;text-transform:uppercase;letter-spacing:1px}
    .highlight{display:grid;grid-template-columns:34px 1fr;gap:14px;padding:20px 0;border-top:1px solid #DDD2C7;page-break-inside:avoid}.number{width:30px;height:30px;border-radius:15px;background:#D4573E;color:white;display:flex;align-items:center;justify-content:center;font-weight:800}
    h2{font-family:Georgia,serif;font-size:22px;margin:1px 0 8px}.highlight p{font-size:14px;line-height:1.7;color:#5F5751;margin:0}.closing{margin-top:32px;padding:28px;border-radius:18px;background:#201B17;color:#FFF9F2;font-family:Georgia,serif;font-size:22px;line-height:1.5;text-align:center}
    .footer{margin-top:18px;text-align:center;color:#8A8179;font-size:9px;letter-spacing:1px;text-transform:uppercase}
  </style></head><body>
    <div class="cover"><div class="brand">Packyo · Memory Guide</div><div class="destination">${escapeHtml(destination)}</div><h1>${escapeHtml(guide.title)}</h1><div class="opening">${escapeHtml(guide.opening)}</div>${photoGrid ? `<div class="photos">${photoGrid}</div>` : ""}</div>
    <main class="content"><div class="eyebrow">The trip, remembered</div>${stats ? `<div class="stats">${stats}</div>` : ""}${highlights}<div class="closing">${escapeHtml(guide.closing)}</div><div class="footer">Created with Packyo${generated ? ` · ${escapeHtml(generated)}` : ""}</div></main>
  </body></html>`;
}

export default function MemoryGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { trip, loading } = useTrip(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!user || !id) return;
    setGenerating(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await apiFetch("/api/memory-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId: id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not create the memory guide.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the memory guide.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !trip) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  const legacyReview = trip.review as { reviewedBy?: string; photos?: string[] } | undefined;
  const ownedLegacyReview = user && legacyReview?.reviewedBy === user.uid ? legacyReview : undefined;
  const guide = (user ? trip.memoryGuides?.[user.uid] : undefined) ?? (ownedLegacyReview ? trip.memoryGuide : undefined);
  const myReview = (user ? trip.memberReviews?.[user.uid] : undefined) ?? ownedLegacyReview;
  const photos = ((myReview as { photos?: string[] } | undefined)?.photos ?? []).slice(0, 6);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const exportPdf = async () => {
    if (!guide || !trip) return;
    setExporting(true);
    try {
      const html = memoryGuideHtml(trip.destination, guide, photos);
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const exportDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!exportDirectory) throw new Error("No local file directory is available.");
      const stem = (trip.destination || "trip").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "trip";
      const fileUri = `${exportDirectory}${stem}-memory-guide-${Date.now()}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error("The memory guide PDF could not be created.");
      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: `${trip.destination} Memory Guide`,
            UTI: "com.adobe.pdf",
          });
        } catch (sharingError) {
          if (Platform.OS !== "ios") throw sharingError;
          await Share.share({ url: fileUri, title: `${trip.destination} Memory Guide` });
        }
      } else {
        await Print.printAsync({ html });
      }
    } catch (caught) {
      Alert.alert("PDF export failed", caught instanceof Error ? caught.message : "Could not create the memory guide PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trip memories</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {photos.length > 0 ? (
          <View style={styles.photoStrip}>
            {photos.slice(0, 3).map((uri, index) => (
              <Image key={`${uri.slice(0, 30)}-${index}`} source={{ uri }} style={styles.heroPhoto} contentFit="cover" />
            ))}
          </View>
        ) : null}
        {guide ? (
          <>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>PACKYO MEMORY GUIDE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{guide.title}</Text>
            <Text style={[styles.opening, { color: colors.mutedForeground }]}>{guide.opening}</Text>
            <View style={styles.stats}>
              {guide.byTheNumbers.map((item, index) => (
                <View key={`${item.label}-${index}`} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{item.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            {guide.highlights.map((highlight, index) => (
              <View key={`${highlight.title}-${index}`} style={[styles.highlight, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.number, { backgroundColor: colors.primary }]}><Text style={styles.numberText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.highlightTitle, { color: colors.foreground }]}>{highlight.title}</Text>
                  <Text style={[styles.highlightStory, { color: colors.mutedForeground }]}>{highlight.story}</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.closing, { color: colors.foreground }]}>{guide.closing}</Text>
            <Pressable
              testID="export-memory-guide-pdf"
              onPress={exportPdf}
              disabled={exporting}
              style={[styles.exportButton, { backgroundColor: colors.primary, opacity: exporting ? 0.68 : 1 }]}
            >
              {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="download" size={17} color="#fff" />}
              <Text style={styles.exportButtonText}>{exporting ? "Creating PDF…" : "Export memory guide PDF"}</Text>
            </Pressable>
          </>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book-open" size={34} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Turn the trip into a keepsake</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Packyo will organize your review, itinerary, stay, and photos into a polished memory guide.</Text>
            {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
            <Pressable onPress={generate} disabled={generating || !myReview} style={[styles.generate, { backgroundColor: colors.primary, opacity: myReview ? 1 : 0.5 }]}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>{myReview ? "Create memory guide" : "Add a review first"}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: "DmSans_700Bold", fontSize: 18 },
  content: { padding: 18, gap: 16 },
  photoStrip: { flexDirection: "row", height: 190, gap: 5, overflow: "hidden", borderRadius: 20 },
  heroPhoto: { flex: 1, height: "100%" },
  eyebrow: { fontFamily: "DmSans_700Bold", fontSize: 12, letterSpacing: 1.2, marginTop: 4 },
  title: { fontFamily: "DmSans_700Bold", fontSize: 30, lineHeight: 36 },
  opening: { fontFamily: "DmSans_400Regular", fontSize: 16, lineHeight: 24 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  stat: { minWidth: "30%", flexGrow: 1, borderWidth: 1, borderRadius: 15, padding: 13 },
  statValue: { fontFamily: "DmSans_700Bold", fontSize: 20 },
  statLabel: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 2 },
  highlight: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 18, padding: 16 },
  number: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  numberText: { color: "#fff", fontFamily: "DmSans_700Bold", fontSize: 12 },
  highlightTitle: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  highlightStory: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 21, marginTop: 5 },
  closing: { fontFamily: "DmSans_600SemiBold", fontSize: 17, lineHeight: 25, textAlign: "center", padding: 18 },
  exportButton: { minHeight: 50, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 20 },
  exportButtonText: { color: "#fff", fontFamily: "DmSans_700Bold", fontSize: 14 },
  empty: { borderWidth: 1, borderRadius: 22, padding: 24, alignItems: "center", gap: 12, marginTop: 36 },
  emptyTitle: { fontFamily: "DmSans_700Bold", fontSize: 20, textAlign: "center" },
  emptyBody: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center" },
  error: { fontFamily: "DmSans_500Medium", fontSize: 13, textAlign: "center" },
  generate: { minHeight: 46, borderRadius: 23, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 4 },
  generateText: { color: "#fff", fontFamily: "DmSans_700Bold", fontSize: 14 },
});