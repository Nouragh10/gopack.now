import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  Activity,
  ItineraryDay,
  TripMember,
  addActivity,
  updateActivity,
  deleteActivity,
  incrementAiUsage,
  savePack,
  useTrip,
} from "@/hooks/useFirebase";
import { Mascot } from "@/components/Mascot";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

const TAG_COLORS: Record<string, string> = {
  food: "#E85D3A",
  dining: "#E85D3A",
  culture: "#9C5544",
  museum: "#9C5544",
  art: "#9C5544",
  adventure: "#4CAF50",
  outdoor: "#4CAF50",
  nature: "#26A69A",
  transport: "#42A5F5",
  accommodation: "#7E57C2",
  hotel: "#7E57C2",
  relax: "#AB7ACA",
  wellness: "#AB7ACA",
  nightlife: "#FF7043",
  shopping: "#FFB300",
  beach: "#26C6DA",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag?.toLowerCase() ?? ""] ?? "#9E9E9E";
}

function getDayDate(startDate: string | null | undefined, dayNumber: number): string | null {
  if (!startDate) return null;
  try {
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + dayNumber - 1);
    return d.toISOString().split("T")[0].replace(/-/g, "");
  } catch {
    return null;
  }
}

function parseActivityTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

function getDayDateTime(
  startDate: string | null | undefined,
  dayNumber: number,
  timeStr: string,
): { start: string; end: string } | null {
  if (!startDate) return null;
  try {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const base = new Date(startDate + "T00:00:00");
    base.setDate(base.getDate() + dayNumber - 1);
    const time = parseActivityTime(timeStr);
    if (!time) return null;
    const start = new Date(base);
    start.setHours(time.hours, time.minutes, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1); // 1-hour event
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    return { start: fmt(start), end: fmt(end) };
  } catch {
    return null;
  }
}

/* ── PDF HTML builder ────────────────────────────────────────────────── */

interface AccomSummary {
  name: string;
  location: string;
  costPerPerson: number;
  type?: string;
}

function buildItineraryHTML(
  title: string,
  destination: string,
  days: ItineraryDay[],
  members: TripMember[],
  budget: string,
  startDate: string | null | undefined,
  totalCost: number,
  vibes: string[],
  accom?: AccomSummary | null,
): string {
  const totalActivities = days.reduce((s, d) => s + d.activities.length, 0);
  const generatedDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const memberAvatars = members
    .map(
      (m, i) => `
      <div class="avatar" style="background:${MEMBER_COLORS[i % MEMBER_COLORS.length]}">
        ${m.name[0].toUpperCase()}
      </div>`,
    )
    .join("");

  const memberNames = members.map(m => m.name).join("  ·  ");

  const vibePills = vibes.map(v => `<span class="vibe-pill">${v}</span>`).join("");

  const daysHtml = days
    .map((day) => {
      const activitiesHtml = day.activities
        .map(
          (act, idx) => {
            const tagColor = getTagColor(act.tag);
            const isWish = act.fromWish;
            const isManual = !act.fromWish && act.suggester && act.suggester !== "AI pick";
            const attributionText = isWish
              ? `★ ${act.suggester}'s wish`
              : isManual
              ? `+ Added by ${act.suggester}`
              : act.matchedVibe
              ? `✦ AI · ${act.matchedVibe}`
              : `✦ AI pick`;
            const attrColor = isWish ? "#D97706" : isManual ? "#26A69A" : "#9E9E9E";
            const attrBg = isWish ? "#FFFBEB" : isManual ? "#F0FAF9" : "transparent";

            return `
          <div class="act ${isWish ? "act-wish" : ""}">
            <div class="act-index">${idx + 1}</div>
            <div class="act-accent" style="background:${tagColor}"></div>
            <div class="act-body">
              <div class="act-header">
                <span class="act-time">${act.time}</span>
                <span class="act-attr" style="color:${attrColor};background:${attrBg}">${attributionText}</span>
              </div>
              <div class="act-name">${act.name}</div>
              <div class="act-desc">${act.description}</div>
              ${act.estimatedCost > 0 ? `<div class="act-cost">≈ $${act.estimatedCost} <span style="font-weight:400;opacity:.7">per person</span></div>` : `<div class="act-cost" style="color:#26A69A">Free</div>`}
            </div>
          </div>`;
          }
        )
        .join("");

      const dayCost = day.activities.reduce((s, a) => s + (a.estimatedCost ?? 0), 0);

      return `
        <div class="day-block">
          <div class="day-header">
            <div class="day-number">Day ${day.dayNumber}</div>
            <div class="day-info">
              <div class="day-city">${day.city}</div>
              <div class="day-theme">${day.theme}</div>
            </div>
            ${dayCost > 0 ? `<div class="day-cost">≈ $${dayCost}<span class="day-cost-label">/person</span></div>` : ""}
          </div>
          <div class="activities-grid">
            ${activitiesHtml}
          </div>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');

*{box-sizing:border-box;margin:0;padding:0}

body{
  font-family:'Inter',system-ui,-apple-system,sans-serif;
  background:#F8F5F0;
  color:#1A1714;
  font-size:13px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#F8F5F0}
  .cover{page-break-after:always}
  .day-block{page-break-inside:avoid}
  .act{page-break-inside:avoid}
}

/* ─── COVER ─────────────────────────────────────── */
.cover{
  background:linear-gradient(145deg,#111009 0%,#1E1A15 60%,#2A2118 100%);
  min-height:100vh;
  padding:0;
  display:flex;
  flex-direction:column;
  position:relative;
  overflow:hidden;
}
.cover-glow{
  position:absolute;top:-120px;right:-120px;
  width:500px;height:500px;
  background:radial-gradient(circle,rgba(232,93,58,.18) 0%,transparent 70%);
  pointer-events:none;
}
.cover-glow2{
  position:absolute;bottom:-80px;left:-80px;
  width:350px;height:350px;
  background:radial-gradient(circle,rgba(232,93,58,.1) 0%,transparent 70%);
  pointer-events:none;
}
.cover-lines{
  position:absolute;inset:0;
  background-image:repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(255,255,255,.025) 59px,rgba(255,255,255,.025) 60px);
  pointer-events:none;
}
.cover-top{
  padding:40px 52px 0;
  display:flex;align-items:center;justify-content:space-between;
}
.logo{
  display:flex;align-items:center;gap:10px;
}
.logo-mark{
  width:32px;height:32px;
  background:#E85D3A;
  border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:16px;
}
.logo-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:18px;font-weight:700;
  color:#FFFDF9;letter-spacing:.5px;
}
.cover-badge{
  font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;
  color:#E85D3A;
  border:1px solid rgba(232,93,58,.4);
  padding:6px 14px;border-radius:20px;
}
.cover-body{
  flex:1;
  padding:60px 52px 0;
  display:flex;flex-direction:column;justify-content:flex-end;
}
.cover-eyebrow{
  font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;
  color:#756C66;margin-bottom:18px;
}
.cover-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:52px;font-weight:900;line-height:1.02;
  color:#FFFDF9;margin-bottom:14px;
}
.cover-dest{
  font-size:18px;font-weight:500;color:#8C8480;margin-bottom:60px;
  display:flex;align-items:center;gap:10px;
}
.cover-dest-dot{width:6px;height:6px;border-radius:50%;background:#E85D3A;flex-shrink:0}
.cover-rule{height:1px;background:linear-gradient(90deg,rgba(232,93,58,.6),rgba(232,93,58,.1),transparent)}
.cover-stats{
  display:grid;grid-template-columns:repeat(4,1fr);
  padding:32px 52px;gap:0;
}
.stat{padding-right:28px;position:relative}
.stat+.stat{padding-left:28px;padding-right:28px}
.stat+.stat::before{
  content:"";position:absolute;left:0;top:8px;bottom:8px;
  width:1px;background:rgba(255,255,255,.08);
}
.stat-label{
  font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  color:#756C66;margin-bottom:8px;
}
.stat-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:24px;font-weight:700;color:#FFFDF9;line-height:1.1;
}
.stat-sub{font-size:11px;color:#4A4440;margin-top:4px;font-weight:500}

/* ─── MEMBERS STRIP ─────────────────────────────── */
.members-strip{
  background:#FFFDF9;
  padding:32px 52px;
  display:flex;align-items:center;gap:24px;
  border-bottom:1px solid #E8E2D9;
}
.avatars{display:flex;align-items:center}
.avatar{
  width:40px;height:40px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:14px;color:#fff;
  border:2.5px solid #FFFDF9;
  margin-left:-10px;
}
.avatar:first-child{margin-left:0}
.members-info{flex:1}
.members-title{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8B0A8;margin-bottom:4px}
.members-names{font-size:14px;font-weight:600;color:#1A1714}

/* ─── VIBES ─────────────────────────────────────── */
.vibes-strip{
  background:#FFFDF9;padding:20px 52px;
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  border-bottom:1px solid #E8E2D9;
}
.vibes-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8B0A8;white-space:nowrap;margin-right:4px}
.vibe-pill{
  display:inline-block;
  background:linear-gradient(135deg,#FFF8F5,#FFF0EB);
  border:1px solid rgba(232,93,58,.25);
  border-radius:20px;padding:5px 14px;
  font-size:12px;font-weight:600;color:#E85D3A;text-transform:capitalize;
}

/* ─── ACCOMMODATION ─────────────────────────────── */
.accom-section{
  background:#FFFDF9;padding:28px 52px;border-bottom:1px solid #E8E2D9;
}
.section-label{font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#B8B0A8;margin-bottom:16px}
.accom-card{
  background:linear-gradient(135deg,#F0FAF9,#E8F6F4);
  border:1.5px solid rgba(38,166,154,.3);border-radius:16px;
  padding:20px 24px;display:flex;align-items:center;gap:18px;
}
.accom-icon{
  width:48px;height:48px;border-radius:12px;
  background:#26A69A;display:flex;align-items:center;justify-content:center;
  font-size:22px;flex-shrink:0;
}
.accom-name{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;color:#0E0D0B;margin-bottom:3px}
.accom-meta{font-size:12px;color:#4A4440;text-transform:capitalize}
.accom-cost{font-size:13px;font-weight:700;color:#26A69A;margin-top:6px}

/* ─── DAYS ──────────────────────────────────────── */
.day-block{
  background:#FFFDF9;
  margin-top:2px;
  padding:36px 52px 28px;
  border-bottom:2px solid #F0EBE3;
}
.day-header{
  display:flex;align-items:flex-start;gap:20px;margin-bottom:28px;
  padding-bottom:20px;
  border-bottom:1px solid #EDE8DE;
  position:relative;
}
.day-header::after{
  content:"";position:absolute;bottom:-1px;left:0;
  width:60px;height:2px;background:#E85D3A;
}
.day-number{
  font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
  color:#E85D3A;padding-top:5px;white-space:nowrap;min-width:40px;
}
.day-info{flex:1}
.day-city{
  font-family:'Playfair Display',Georgia,serif;
  font-size:28px;font-weight:700;color:#1A1714;line-height:1.1;margin-bottom:4px;
}
.day-theme{font-size:13px;color:#8C8480;font-style:italic}
.day-cost{
  font-family:'Playfair Display',Georgia,serif;
  font-size:22px;font-weight:700;color:#1A1714;
  text-align:right;padding-top:4px;white-space:nowrap;
}
.day-cost-label{font-size:11px;font-weight:500;color:#8C8480;font-family:'Inter',sans-serif}

/* ─── ACTIVITIES ────────────────────────────────── */
.activities-grid{display:flex;flex-direction:column;gap:10px}
.act{
  display:flex;align-items:stretch;
  border-radius:14px;overflow:hidden;
  border:1px solid #EDE8DE;
  background:#FEFCF8;
  transition:all .2s;
}
.act-wish{
  border-color:rgba(217,119,6,.25);
  background:linear-gradient(135deg,#FFFBEB,#FFF8EE);
}
.act-index{
  width:36px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:#C4BDB6;
  background:#F8F5F0;border-right:1px solid #EDE8DE;
}
.act-wish .act-index{background:#FFF3D0;color:#D97706;border-color:rgba(217,119,6,.2)}
.act-accent{width:3px;flex-shrink:0}
.act-body{flex:1;padding:14px 18px 12px}
.act-header{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.act-time{
  font-size:11px;font-weight:700;color:#A8A298;
  letter-spacing:.5px;min-width:58px;
}
.act-attr{
  font-size:10px;font-weight:600;letter-spacing:.3px;
  padding:2px 9px;border-radius:10px;
}
.act-name{
  font-size:15px;font-weight:700;color:#1A1714;
  margin-bottom:5px;line-height:1.3;
}
.act-desc{font-size:12px;color:#5A534D;line-height:1.6;margin-bottom:7px}
.act-cost{font-size:12px;font-weight:700;color:#1A1714}

/* ─── TOTALS ─────────────────────────────────────── */
.totals-section{
  background:linear-gradient(145deg,#111009 0%,#1E1A15 100%);
  padding:48px 52px;
  display:flex;align-items:center;gap:32px;
  position:relative;overflow:hidden;
}
.totals-glow{
  position:absolute;right:-60px;top:-60px;
  width:300px;height:300px;
  background:radial-gradient(circle,rgba(232,93,58,.12) 0%,transparent 70%);
}
.totals-circle{
  width:72px;height:72px;border-radius:50%;
  background:linear-gradient(135deg,#E85D3A,#D44E2D);
  display:flex;align-items:center;justify-content:center;
  font-size:30px;flex-shrink:0;
  box-shadow:0 0 0 12px rgba(232,93,58,.1);
}
.totals-label{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#756C66;margin-bottom:8px}
.totals-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:48px;font-weight:900;color:#FFFDF9;line-height:1;margin-bottom:6px;
}
.totals-note{font-size:13px;color:#4A4440;font-weight:500}

/* ─── FOOTER ─────────────────────────────────────── */
.footer{
  background:#0A0907;
  padding:28px 52px;
  display:flex;align-items:center;justify-content:space-between;
}
.footer-logo{
  font-family:'Playfair Display',Georgia,serif;
  font-size:18px;color:#FFFDF9;font-weight:700;
  display:flex;align-items:center;gap:10px;
}
.footer-dot{width:8px;height:8px;border-radius:50%;background:#E85D3A}
.footer-meta{font-size:11px;color:#4A4440;text-align:right;line-height:1.8}
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="cover-glow"></div>
  <div class="cover-glow2"></div>
  <div class="cover-lines"></div>

  <div class="cover-top">
    <div class="logo">
      <div class="logo-mark">🎒</div>
      <div class="logo-name">GoPackNow</div>
    </div>
    <div class="cover-badge">Group Travel Itinerary</div>
  </div>

  <div class="cover-body">
    <div class="cover-eyebrow">Your adventure awaits</div>
    <h1 class="cover-title">${title}</h1>
    <div class="cover-dest">
      <div class="cover-dest-dot"></div>
      ${destination}
    </div>
  </div>

  <div class="cover-rule"></div>

  <div class="cover-stats">
    <div class="stat">
      <div class="stat-label">Duration</div>
      <div class="stat-val">${days.length}</div>
      <div class="stat-sub">day${days.length !== 1 ? "s" : ""}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Experiences</div>
      <div class="stat-val">${totalActivities}</div>
      <div class="stat-sub">activities</div>
    </div>
    <div class="stat">
      <div class="stat-label">Budget</div>
      <div class="stat-val" style="text-transform:capitalize;font-size:18px">${budget}</div>
      <div class="stat-sub">level</div>
    </div>
    <div class="stat">
      <div class="stat-label">Travellers</div>
      <div class="stat-val">${members.length}</div>
      <div class="stat-sub">in the pack</div>
    </div>
  </div>
</div>

<!-- MEMBERS -->
<div class="members-strip">
  <div class="avatars">${memberAvatars}</div>
  <div class="members-info">
    <div class="members-title">The Pack</div>
    <div class="members-names">${memberNames}</div>
  </div>
  ${startDate ? `<div style="text-align:right"><div class="stat-label" style="color:#B8B0A8;font-size:9px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Departure</div><div style="font-size:15px;font-weight:700;color:#1A1714">${startDate}</div></div>` : ""}
</div>

${vibes.length > 0 ? `
<div class="vibes-strip">
  <div class="vibes-label">Trip vibes</div>
  ${vibePills}
</div>` : ""}

${accom ? `
<div class="accom-section">
  <div class="section-label">Accommodation</div>
  <div class="accom-card">
    <div class="accom-icon">🏠</div>
    <div>
      <div class="accom-name">${accom.name}</div>
      <div class="accom-meta">${accom.location}${accom.type ? ` · ${accom.type}` : ""}</div>
      <div class="accom-cost">≈ $${accom.costPerPerson} per person · total stay</div>
    </div>
  </div>
</div>` : ""}

<!-- DAYS -->
${daysHtml}

<!-- TOTALS -->
${
  totalCost > 0
    ? `<div class="totals-section">
        <div class="totals-glow"></div>
        <div class="totals-circle">💰</div>
        <div>
          <div class="totals-label">Estimated total · all ${days.length} days${accom ? " + accommodation" : ""}</div>
          <div class="totals-val">~$${totalCost}</div>
          <div class="totals-note">per person · ${totalActivities} activities planned</div>
        </div>
      </div>`
    : ""
}

<!-- FOOTER -->
<div class="footer">
  <div class="footer-logo">
    <div class="footer-dot"></div>
    GoPackNow
  </div>
  <div class="footer-meta">
    Generated on ${generatedDate}<br>
    Plan trips together ✦
  </div>
</div>

</body>
</html>`;
}

/* ── Activity card ───────────────────────────────────────────────────── */

function getRedoOptions(tag: string): Array<{ label: string; redoType: "same_type" | "whole" }> {
  const sameLabels: Record<string, string> = {
    food: "Change restaurant",
    relaxation: "Change location",
    adventure: "Change location",
    culture: "Change venue",
    nightlife: "Change bar/club",
    shopping: "Change market/shop",
  };
  const opts: Array<{ label: string; redoType: "same_type" | "whole" }> = [];
  if (sameLabels[tag]) opts.push({ label: sameLabels[tag], redoType: "same_type" });
  opts.push({ label: "Redo whole activity", redoType: "whole" });
  return opts;
}

interface ActivityCardProps {
  activity: Activity;
  actIndex: number;
  dayNumber: number;
  destination: string;
  startDate?: string | null;
  colors: any;
  onEdit: (act: Activity, idx: number, day: number) => void;
  onRedo: (act: Activity, idx: number, day: number) => void;
  onDelete: (idx: number, day: number) => void;
}

function ActivityCard({
  activity,
  actIndex,
  dayNumber,
  destination,
  startDate,
  colors,
  onEdit,
  onRedo,
  onDelete,
}: ActivityCardProps) {
  const tagColor = getTagColor(activity.tag);

  const openURL = (url: string) => {
    if (Platform.OS === "web") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(url);
    }
  };

  const openMaps = () => {
    const query = encodeURIComponent(`${activity.name}, ${destination}`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    if (Platform.OS === "web") {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(googleMapsUrl).catch(() => {});
    }
  };

  return (
    <View style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.actTagBar, { backgroundColor: tagColor }]} />
      <View style={styles.actContent}>
        <View style={styles.actTop}>
          <Text style={[styles.actTime, { color: colors.mutedForeground }]}>{activity.time}</Text>
          {activity.fromWish && <Feather name="star" size={12} color="#FFA726" />}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" }}>
            <Pressable onPress={() => onEdit(activity, actIndex, dayNumber)} style={{ padding: 4, borderRadius: 6 }}>
              <Feather name="edit-2" size={13} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => onRedo(activity, actIndex, dayNumber)} style={{ padding: 4, borderRadius: 6 }}>
              <Feather name="rotate-ccw" size={13} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => onDelete(actIndex, dayNumber)} style={{ padding: 4, borderRadius: 6 }}>
              <Feather name="trash-2" size={13} color="#ef4444" />
            </Pressable>
          </View>
        </View>
        <Text style={[styles.actName, { color: colors.foreground }]}>{activity.name}</Text>
        {activity.suggester ? (
          <Text style={[styles.actSuggester, { color: colors.primary }]}>
            {activity.fromWish
              ? `✦ ${activity.suggester}'s wish`
              : activity.suggester === "AI pick"
              ? activity.matchedVibe
                ? `✦ AI pick · ${activity.matchedVibe}`
                : `✦ AI pick`
              : `✦ Added by ${activity.suggester}`}
          </Text>
        ) : null}
        <Text style={[styles.actDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
          {activity.description}
        </Text>
        {activity.estimatedCost > 0 && (
          <Text style={[styles.actCost, { color: colors.mutedForeground }]}>
            ~${activity.estimatedCost} est. per person
          </Text>
        )}
        {activity.lastRedoBy ? (
          <Text style={[styles.actRedoBy, { color: colors.mutedForeground }]}>
            ↻ Last changed by {activity.lastRedoBy}
          </Text>
        ) : null}
        <View style={styles.actActions}>
          <Pressable
            onPress={() => {
              const url = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${activity.name} ${destination}`)}`;
              if (Platform.OS === "web") window.open(url, "_blank", "noopener,noreferrer");
              else Linking.openURL(url);
            }}
            style={[styles.actActionBtn, { borderColor: "#F59E0B", backgroundColor: "#FFF8EC" }]}
          >
            <Feather name="star" size={13} color="#D97706" />
            <Text style={[styles.actActionText, { color: "#D97706" }]}>Reserve</Text>
          </Pressable>
          <Pressable onPress={openMaps} style={[styles.actActionBtn, { borderColor: colors.border }]}>
            <Feather name="map-pin" size={13} color={colors.foreground} />
            <Text style={[styles.actActionText, { color: colors.foreground }]}>Maps</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ── Edit modal state ────────────────────────────────────────────────── */

interface EditState {
  dayNumber: number;
  actIndex: number | null;
  name: string;
  time: string;
  description: string;
  estimatedCost: string;
}

/* ── Screen ──────────────────────────────────────────────────────────── */

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { trip, loading } = useTrip(id);

  const [selectedDay, setSelectedDay] = useState(1);
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [redoLoading, setRedoLoading] = useState<string | null>(null);
  const [showSavePackModal, setShowSavePackModal] = useState(false);
  const [savePackName, setSavePackName] = useState("");
  const [savePackSaving, setSavePackSaving] = useState(false);
  const [packSavedName, setPackSavedName] = useState<string | null>(null);
  const [savePackError, setSavePackError] = useState<string | null>(null);

  useEffect(() => {
    if (!trip?.itinerary || !user || !id) return;
    const isHost = trip.hostMemberId === user.uid;
    const memberCount = Object.keys(trip.members ?? {}).length;
    if (!isHost || memberCount < 2) return;
    AsyncStorage.getItem(`gopack:packSaved:${id}`).then((val) => {
      if (!val) { setSavePackName(`${trip.destination} Crew`); setShowSavePackModal(true); }
    }).catch(() => {});
  }, [id, user?.uid, !!trip?.itinerary]);

  const handleSavePack = async () => {
    if (!user || !id || !trip) return;
    setSavePackSaving(true);
    setSavePackError(null);
    try {
      const memberObj: Record<string, { name: string }> = {};
      for (const [muid, m] of Object.entries(trip.members ?? {})) {
        memberObj[muid] = { name: (m as any).name ?? "Member" };
      }
      const finalName = savePackName.trim() || `${trip.destination} Crew`;
      await savePack({ hostUid: user.uid, name: finalName, members: memberObj, tripId: id, destination: trip.destination });
      await AsyncStorage.setItem(`gopack:packSaved:${id}`, "1");
      setShowSavePackModal(false);
      setPackSavedName(finalName);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPackSavedName(null), 3000);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setSavePackError(msg);
      Alert.alert("Save failed", msg);
    }
    setSavePackSaving(false);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const itinerary = trip?.itinerary;
  const days = itinerary?.days ?? [];
  const currentDay = days.find((d) => d.dayNumber === selectedDay) ?? days[0];
  const members = Object.values(trip?.members ?? {});

  const accom = trip?.confirmedAccommodation ?? null;
  const accomCost = accom?.costPerPerson ?? 0;

  const totalCost =
    days.reduce((sum, day) => sum + day.activities.reduce((s, a) => s + (a.estimatedCost ?? 0), 0), 0) +
    accomCost;

  const handleEdit = (act: Activity, idx: number, dayNum: number) => {
    setEditModal({
      dayNumber: dayNum,
      actIndex: idx,
      name: act.name,
      time: act.time,
      description: act.description,
      estimatedCost: act.estimatedCost > 0 ? String(act.estimatedCost) : "",
    });
  };

  const handleRedo = (act: Activity, idx: number, dayNum: number) => {
    const options = getRedoOptions(act.tag);
    const day = days.find((d) => d.dayNumber === dayNum);
    const buttons = options.map(({ label, redoType }) => ({
      text: label,
      onPress: async () => {
        const key = `${dayNum}-${idx}`;
        setRedoLoading(key);
        try {
          const baseUrl = Platform.OS === "web" ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;
          const otherActivities = (day?.activities ?? []).filter((_, i) => i !== idx).map((a) => a.name);
          const allTripActivities = days.flatMap((d) => d.activities.map((a) => a.name)).filter((n) => n !== act.name);
          const resp = await fetch(`${baseUrl}/api/redo-activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              activity: act,
              city: day?.city ?? "",
              theme: day?.theme ?? "",
              destination: trip?.destination ?? "",
              redoType,
              otherActivities,
              allTripActivities,
              userId: user?.uid,
              isPlusUser: false,
            }),
          });
          if (!resp.ok) {
            const errBody = await resp.json().catch(() => ({})) as { message?: string };
            throw new Error(errBody.message ?? "Could not replace activity. Please try again.");
          }
          const { activity: newAct } = await resp.json();
          const redoByName = user?.displayName ?? user?.email ?? "A member";
          await updateActivity(id!, dayNum, idx, {
            ...newAct,
            time: act.time,
            lastRedoBy: redoByName,
          });
          await incrementAiUsage(id!, "activityRedos");
        } catch (err) {
          Alert.alert("Could not change activity", (err as Error).message || "Please try again.");
        } finally {
          setRedoLoading(null);
        }
      },
    }));
    buttons.push({ text: "Cancel", style: "cancel" } as any);
    Alert.alert("Change activity", "What would you like to do?", buttons as any);
  };

  const handleDelete = (idx: number, dayNum: number) => {
    Alert.alert("Delete activity", "Remove this activity from the itinerary?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteActivity(id!, dayNum, idx);
          } catch (err) {
            Alert.alert("Delete failed", (err as Error).message || "Could not delete activity. Please try again.");
          }
        },
      },
    ]);
  };

  const handleAddActivity = () => {
    setEditModal({
      dayNumber: currentDay?.dayNumber ?? 1,
      actIndex: null,
      name: "",
      time: "12:00 PM",
      description: "",
      estimatedCost: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal || !id) return;
    if (!editModal.name.trim()) {
      Alert.alert("Name required", "Please enter an activity name.");
      return;
    }
    setSaving(true);
    try {
      const partial: Partial<Activity> = {
        name: editModal.name.trim(),
        time: editModal.time.trim(),
        description: editModal.description.trim(),
        estimatedCost: parseFloat(editModal.estimatedCost) || 0,
        suggester: user?.displayName ?? user?.email ?? "Member",
      };
      if (editModal.actIndex === null) {
        await addActivity(id, editModal.dayNumber, partial);
      } else {
        await updateActivity(id, editModal.dayNumber, editModal.actIndex, partial);
      }
    } finally {
      setSaving(false);
      setEditModal(null);
    }
  };

  const handleShare = async () => {
    if (!trip || !itinerary) return;
    const lines = [
      `🗺 ${itinerary.title}`,
      `📍 ${trip.destination} · ${trip.days} days`,
      "",
      ...days.flatMap((day) => [
        `── Day ${day.dayNumber}: ${day.city} ──`,
        day.theme,
        ...day.activities.map(
          (a) => `${a.time}  ${a.name}${a.estimatedCost > 0 ? ` (~$${a.estimatedCost})` : ""}`,
        ),
        "",
      ]),
      totalCost > 0 ? `💰 Estimated total: ~$${totalCost}/person` : "",
      "Built with GoPackNow 🎒",
    ].filter(Boolean);
    await Share.share({ message: lines.join("\n") });
  };

  const handleExportCalendar = async () => {
    if (!trip || !itinerary) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const base = trip.startDate ? new Date(trip.startDate) : new Date();

      const parseTime = (dayOffset: number, timeStr: string): Date => {
        const d = new Date(base);
        d.setDate(d.getDate() + dayOffset);
        const match = timeStr?.match(/(\d+):(\d+)\s*(am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]);
          const m = parseInt(match[2]);
          const period = match[3]?.toLowerCase();
          if (period === "pm" && h < 12) h += 12;
          if (period === "am" && h === 12) h = 0;
          d.setHours(h, m, 0, 0);
        } else {
          d.setHours(9, 0, 0, 0);
        }
        return d;
      };

      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      const lines: string[] = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "PRODID:-//GoPackNow//AI Travel Planner//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        `X-WR-CALNAME:${itinerary.title || trip.destination || "Trip"}`,
      ];

      days.forEach((day, di) => {
        day.activities.forEach((act) => {
          const start = parseTime(di, act.time || "9:00am");
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          lines.push(
            "BEGIN:VEVENT",
            `DTSTART:${fmt(start)}`,
            `DTEND:${fmt(end)}`,
            `SUMMARY:${(act.name || "").replace(/,/g, "\\,")}`,
            `DESCRIPTION:${(act.description || "").replace(/,/g, "\\,").replace(/\n/g, "\\n")}`,
            `LOCATION:${day.city || trip.destination || ""}`,
            "END:VEVENT",
          );
        });
      });
      lines.push("END:VCALENDAR");
      const icsContent = lines.join("\r\n");

      if (Platform.OS === "web") {
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(trip.destination || "trip").replace(/\s+/g, "-").toLowerCase()}-itinerary.ics`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}itinerary.ics`;
        await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/calendar", dialogTitle: `${trip.destination} Calendar`, UTI: "public.calendar-event" });
        } else {
          Alert.alert("Saved", "Itinerary calendar file has been created.");
        }
      }
    } catch (err) {
      Alert.alert("Export failed", "Could not generate calendar file. Please try again.");
    }
  };

  const handleExportPDF = async () => {
    if (!trip || !itinerary) return;
    setExportingPDF(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const html = buildItineraryHTML(
        itinerary.title,
        trip.destination,
        days,
        members,
        trip.budget ?? "midrange",
        trip.startDate,
        totalCost,
        trip.vibes ?? [],
        accom,
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${trip.destination} Itinerary`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF saved", "Your itinerary PDF has been created.");
      }
    } catch (err) {
      Alert.alert("Export failed", "Could not generate PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading itinerary…</Text>
      </View>
    );
  }

  if (!trip || !itinerary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Mascot name="map-mate" size={130} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 8 }]}>No itinerary yet.</Text>
        <Pressable onPress={() => router.back()} style={[styles.backLink, { borderColor: colors.border }]}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitles}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.headerLabel, { color: colors.primary }]}>YOUR GOPACKNOW ITINERARY</Text>
            </View>
            <Text style={[styles.headerDest, { color: colors.foreground }]} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => { setSavePackName(`${trip.destination} Crew`); setShowSavePackModal(true); Haptics.selectionAsync(); }}
              style={[styles.iconBtn, { borderColor: colors.border }]}
            >
              <Feather name="users" size={16} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.iconBtn, { borderColor: colors.border }]}>
              <Feather name="share" size={16} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={handleExportCalendar}
              style={[styles.iconBtn, { borderColor: colors.border }]}
            >
              <Feather name="calendar" size={16} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={handleExportPDF}
              disabled={exportingPDF}
              style={[styles.iconBtn, { borderColor: colors.border }]}
            >
              {exportingPDF ? (
                <ActivityIndicator color={colors.foreground} size="small" />
              ) : (
                <Feather name="file-text" size={16} color={colors.foreground} />
              )}
            </Pressable>
          </View>
        </View>

        {members.length > 0 && (
          <View style={styles.membersRow}>
            {members.slice(0, 5).map((m, i) => (
              <View
                key={i}
                style={[
                  styles.memberAvatar,
                  {
                    backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length],
                    marginLeft: i > 0 ? -8 : 0,
                  },
                ]}
              >
                <Text style={styles.memberInitial}>{m.name[0].toUpperCase()}</Text>
              </View>
            ))}
            <Text style={[styles.membersLabel, { color: colors.mutedForeground }]}>
              {"  "}
              {members.map((m) => m.name).join(", ")}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.dayScrollWrap, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScroll}
        >
          {days.map((day) => {
            const isSelected = day.dayNumber === selectedDay;
            return (
              <Pressable
                key={day.dayNumber}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDay(day.dayNumber);
                }}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.muted,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.dayChipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                  Day {day.dayNumber}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 20 }}
      >
        {currentDay && (
          <>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayCity, { color: colors.foreground }]}>{currentDay.city}</Text>
              <Text style={[styles.dayTheme, { color: colors.mutedForeground }]}>{currentDay.theme}</Text>
            </View>

            <>
                {currentDay.activities.map((act, i) => (
                  <View key={i}>
                    <ActivityCard
                      activity={act}
                      actIndex={i}
                      dayNumber={currentDay.dayNumber}
                      destination={trip.destination}
                      startDate={trip.startDate}
                      colors={colors}
                      onEdit={handleEdit}
                      onRedo={handleRedo}
                      onDelete={handleDelete}
                    />
                    {redoLoading === `${currentDay.dayNumber}-${i}` && (
                      <View style={{ alignItems: "center", padding: 8 }}>
                        <ActivityIndicator color={colors.primary} size="small" />
                        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>Finding a new activity…</Text>
                      </View>
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={handleAddActivity}
                  style={[styles.addActBtn, { borderColor: colors.border }]}
                >
                  <Feather name="plus" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.addActText, { color: colors.mutedForeground }]}>Add activity</Text>
                </Pressable>
              </>
          </>
        )}

        {/* Confirmed accommodation card */}
        {accom && (
          <View style={[styles.accomCard, { backgroundColor: colors.card, borderColor: "#26A69A" }]}>
            <View style={styles.accomCardHead}>
              <Feather name="home" size={14} color="#26A69A" />
              <Text style={[styles.accomCardLabel, { color: "#26A69A" }]}>ACCOMMODATION</Text>
            </View>
            <Text style={[styles.accomCardName, { color: colors.foreground }]}>{accom.name}</Text>
            <Text style={[styles.accomCardMeta, { color: colors.mutedForeground }]}>
              {accom.location}{accom.type ? ` · ${accom.type}` : ""}
            </Text>
            <View style={styles.accomCostRow}>
              <Feather name="dollar-sign" size={13} color="#26A69A" />
              <Text style={[styles.accomCostText, { color: "#26A69A" }]}>
                ~${accomCost} per person (total stay)
              </Text>
            </View>
            {/* Booking buttons */}
            <View style={styles.accomBtns}>
              {accom.link ? (
                <Pressable
                  onPress={() => {
                    if (Platform.OS === "web") window.open(accom.link, "_blank", "noopener,noreferrer");
                    else Linking.openURL(accom.link!);
                  }}
                  style={[styles.accomBtn, { backgroundColor: "#26A69A" }]}
                >
                  <Feather name="external-link" size={13} color="#fff" />
                  <Text style={[styles.accomBtnText, { color: "#fff" }]}>View listing</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => {
                      const q = encodeURIComponent(`${accom.name} ${accom.location}`);
                      const ci = trip.startDate ?? "";
                      const co = (() => {
                        if (!trip.startDate) return "";
                        try {
                          const d = new Date(trip.startDate + "T00:00:00");
                          d.setDate(d.getDate() + (trip.days ?? 0));
                          return d.toISOString().split("T")[0];
                        } catch { return ""; }
                      })();
                      const url = `https://www.airbnb.com/s/${encodeURIComponent(accom.location)}/homes?query=${q}${ci ? `&checkin=${ci}&checkout=${co}` : ""}`;
                      if (Platform.OS === "web") window.open(url, "_blank", "noopener,noreferrer");
                      else Linking.openURL(url);
                    }}
                    style={[styles.accomBtn, { backgroundColor: "#FF5A5F" }]}
                  >
                    <Feather name="search" size={13} color="#fff" />
                    <Text style={[styles.accomBtnText, { color: "#fff" }]}>Airbnb</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const q = encodeURIComponent(`${accom.name} ${accom.location}`);
                      const ci = trip.startDate ?? "";
                      const co = (() => {
                        if (!trip.startDate) return "";
                        try {
                          const d = new Date(trip.startDate + "T00:00:00");
                          d.setDate(d.getDate() + (trip.days ?? 0));
                          return d.toISOString().split("T")[0];
                        } catch { return ""; }
                      })();
                      const url = `https://www.booking.com/search.html?ss=${q}${ci ? `&checkin=${ci}&checkout=${co}` : ""}`;
                      if (Platform.OS === "web") window.open(url, "_blank", "noopener,noreferrer");
                      else Linking.openURL(url);
                    }}
                    style={[styles.accomBtn, { backgroundColor: "#003580" }]}
                  >
                    <Feather name="search" size={13} color="#fff" />
                    <Text style={[styles.accomBtnText, { color: "#fff" }]}>Booking.com</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        {totalCost > 0 && (
          <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="dollar-sign" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>
                ESTIMATED TOTAL (ALL DAYS{accom ? " + ACCOMMODATION" : ""})
              </Text>
              <Text style={[styles.costValue, { color: colors.foreground }]}>
                ~${totalCost} per person
              </Text>
              {accom && (
                <Text style={[styles.costBreakdown, { color: colors.mutedForeground }]}>
                  Activities ~${totalCost - accomCost}  ·  Stay ~${accomCost}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset, borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => router.push(`/packing/${id}`)}
          style={[styles.footerBtn, { borderColor: colors.border }]}
        >
          <Feather name="package" size={15} color={colors.foreground} />
          <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Packing</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/chat/${id}`)}
          style={[styles.footerBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
        >
          <Feather name="message-circle" size={15} color="#fff" />
          <Text style={[styles.footerBtnText, { color: "#fff" }]}>Pack chat</Text>
        </Pressable>
      </View>

      <Modal
        visible={editModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => { Keyboard.dismiss(); setEditModal(null); }}
          >
            <Pressable style={[styles.editSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {editModal?.actIndex === null ? "Add activity" : "Edit activity"}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Activity name</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="e.g. Sunset hike"
                value={editModal?.name ?? ""}
                onChangeText={(t) => setEditModal((p) => p ? { ...p, name: t } : p)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Time</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="e.g. 10:00 AM"
                value={editModal?.time ?? ""}
                onChangeText={(t) => setEditModal((p) => p ? { ...p, time: t } : p)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMultiline, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="Brief description..."
                value={editModal?.description ?? ""}
                multiline
                numberOfLines={3}
                onChangeText={(t) => setEditModal((p) => p ? { ...p, description: t } : p)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Est. cost ($)</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="0"
                keyboardType="numeric"
                value={editModal?.estimatedCost ?? ""}
                onChangeText={(t) => setEditModal((p) => p ? { ...p, estimatedCost: t } : p)}
              />

              <View style={styles.sheetBtns}>
                <Pressable
                  onPress={() => setEditModal(null)}
                  style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={saving}
                  style={[styles.sheetSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.sheetSaveText}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>


      {/* Pack saved toast — Ticket Pal celebrates the win */}
      {packSavedName ? (
        <View style={[styles.savedToast, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Mascot name="ticket-pal" size={40} style={{ marginRight: -4 }} />
          <Text style={styles.savedToastText}>"{packSavedName}" saved as a Pack!</Text>
        </View>
      ) : null}

      {/* Save Pack modal */}
      <Modal
        visible={showSavePackModal}
        transparent
        animationType="slide"
        onRequestClose={() => { setShowSavePackModal(false); AsyncStorage.setItem(`gopack:packSaved:${id ?? ""}`, "1").catch(() => {}); }}
      >
        <Pressable style={styles.packModalOverlay} onPress={() => { setShowSavePackModal(false); AsyncStorage.setItem(`gopack:packSaved:${id ?? ""}`, "1").catch(() => {}); }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View style={[styles.packModalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.packModalHandle, { backgroundColor: colors.border }]} />
              <View style={[styles.packModalIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="users" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.packModalTitle, { color: colors.foreground }]}>Save this group as a Pack?</Text>
              <Text style={[styles.packModalSub, { color: colors.mutedForeground }]}>
                One tap to invite everyone next time, no link sharing needed.
              </Text>
              {savePackError ? (
                <Text style={{ fontFamily: "DmSans_500Medium", fontSize: 13, color: "#E85D3A", textAlign: "center" }}>
                  {savePackError}
                </Text>
              ) : null}
              <Text style={[styles.packModalLabel, { color: colors.mutedForeground }]}>Pack name</Text>
              <TextInput
                style={[styles.packModalInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                value={savePackName}
                onChangeText={setSavePackName}
                placeholder={`${trip?.destination ?? ""} Crew`}
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
              />
              <View style={styles.packModalBtns}>
                <Pressable
                  onPress={() => { setShowSavePackModal(false); AsyncStorage.setItem(`gopack:packSaved:${id ?? ""}`, "1").catch(() => {}); }}
                  style={[styles.packModalCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.packModalCancelText, { color: colors.mutedForeground }]}>Not now</Text>
                </Pressable>
                <Pressable
                  onPress={handleSavePack}
                  disabled={savePackSaving}
                  style={[styles.packModalSaveBtn, { backgroundColor: colors.primary, opacity: savePackSaving ? 0.6 : 1 }]}
                >
                  {savePackSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={15} color="#fff" />
                      <Text style={styles.packModalSaveText}>Save Pack</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitles: { flex: 1, gap: 3 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 17,
    paddingHorizontal: 12,
    height: 34,
  },
  pdfBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  memberInitial: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff" },
  membersLabel: { fontFamily: "DmSans_400Regular", fontSize: 12, flexShrink: 1 },
  dayScrollWrap: { borderBottomWidth: 1, height: 50 },
  dayScroll: { paddingHorizontal: 16, paddingVertical: 9, gap: 8, flexDirection: "row", alignItems: "center" },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  dayChipText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, lineHeight: 18 },
  dayHeader: { paddingTop: 10, paddingBottom: 8 },
  dayCity: { fontFamily: "DmSans_600SemiBold", fontSize: 18, marginBottom: 2 },
  dayTheme: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  actCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  actTagBar: { width: 4 },
  actContent: { flex: 1, padding: 14, gap: 4 },
  actTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  actTime: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  editBtn: { marginLeft: "auto", padding: 2 },
  actName: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  actSuggester: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  actDesc: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  actCost: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  actRedoBy: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 4, fontStyle: "italic" },
  actActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  actActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actActionText: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  addActBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  addActText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  lockedCard: {
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 4,
    gap: 8,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  lockedTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    textAlign: "center",
  },
  lockedSub: {
    fontFamily: "DmSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 2,
  },
  lockedCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E85D3A",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 2,
    width: "100%",
    justifyContent: "center",
  },
  lockedCtaText: {
    fontFamily: "DmSans_700Bold",
    fontSize: 12,
    color: "#fff",
  },
  costCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  costLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  costValue: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  costBreakdown: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 3 },

  accomCard: {
    borderRadius: 14, borderWidth: 1.5, padding: 14, marginTop: 4, gap: 3,
  },
  accomCardHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  accomCardLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  accomCardName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17 },
  accomCardMeta: { fontFamily: "DmSans_400Regular", fontSize: 12, textTransform: "capitalize" },
  accomCostRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  accomCostText: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },
  accomBtns: { flexDirection: "row", gap: 8, marginTop: 10 },
  accomBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  accomBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  backLink: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backLinkText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
  },
  footerBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, gap: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 8 },
  fieldLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  fieldInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
  },
  fieldMultiline: { minHeight: 80, paddingTop: 11, textAlignVertical: "top" },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  sheetCancelBtn: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
  sheetCancelText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  sheetSaveBtn: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 13 },
  sheetSaveText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  packModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  packModalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 24, paddingBottom: 44, gap: 10 },
  packModalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  packModalIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 4 },
  packModalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  packModalSub: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  packModalLabel: { fontFamily: "DmSans_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  packModalInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontFamily: "DmSans_400Regular", fontSize: 15 },
  packModalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  packModalCancelBtn: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
  packModalCancelText: { fontFamily: "DmSans_500Medium", fontSize: 15 },
  packModalSaveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 13 },
  packModalSaveText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  savedToast: {
    position: "absolute", bottom: 40, left: 20, right: 20,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  savedToastText: { fontFamily: "DmSans_600SemiBold", fontSize: 14, color: "#fff", flex: 1 },
});
