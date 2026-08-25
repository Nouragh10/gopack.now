import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { apiFetch } from "@/lib/api-client";
import {
  Activity,
  ItineraryDay,
  TripMember,
  Wish,
  addActivity,
  updateActivity,
  deleteActivity,
  incrementAiUsage,
  savePack,
  useTrip,
  useWishes,
} from "@/hooks/useFirebase";
import { Mascot } from "@/components/Mascot";
import { WikiImage } from "@/components/WikiImage";

const MEMBER_COLORS = ["#F15A3A", "#F4BC55", "#A77BD6", "#68B7A0", "#EE9D54", "#6EA6D8"];

const TAG_COLORS: Record<string, string> = {
  food: "#F15A3A",
  dining: "#F15A3A",
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

function escapeIcsText(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

function formatIcsDateTime(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new Error("The itinerary date is invalid.");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function safeExportFileName(value: string | undefined, extension: string): string {
  const stem = (value || "trip")
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "trip";
  return `${stem}-itinerary.${extension}`;
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
      const tagEmoji: Record<string, string> = {
        food:"🍽", dining:"🍽", culture:"🏛", museum:"🏛", art:"🎨",
        adventure:"🧗", outdoor:"🌿", nature:"🌊", transport:"🚌",
        accommodation:"🏠", hotel:"🏠", relax:"🧘", wellness:"🧘",
        nightlife:"🌙", shopping:"🛍", beach:"🏖",
      };

      const activitiesHtml = day.activities
        .map(
          (act, idx) => {
            const tagColor = getTagColor(act.tag);
            const emoji = tagEmoji[act.tag?.toLowerCase() ?? ""] ?? "✦";
            const isWish = act.fromWish;
            const isManual = !act.fromWish && act.suggester && act.suggester !== "AI pick";
            const attributionText = isWish
              ? `★ ${act.suggester}'s wish`
              : isManual
              ? `+ Added by ${act.suggester}`
              : act.matchedVibe
              ? `✦ ${act.matchedVibe}`
              : `✦ AI pick`;
            const attrColor = isWish ? "#D97706" : isManual ? "#26A69A" : "#A8A298";
            const attrBg  = isWish ? "#FFFBEB" : isManual ? "#F0FAF9" : "#F4F1EC";
            const isLast  = idx === day.activities.length - 1;

            return `
          <div class="tl-item">
            <div class="tl-left">
              <div class="tl-dot" style="background:${tagColor}">${emoji}</div>
              ${!isLast ? `<div class="tl-line"></div>` : ""}
            </div>
            <div class="tl-card ${isWish ? "tl-card-wish" : ""}">
              <div class="tl-card-top">
                <span class="tl-time">${act.time}</span>
                <span class="tl-attr" style="color:${attrColor};background:${attrBg}">${attributionText}</span>
              </div>
              <div class="tl-name">${act.name}</div>
              <div class="tl-desc">${act.description}</div>
              <div class="tl-cost" style="${act.estimatedCost === 0 ? "color:#26A69A" : ""}">
                ${act.estimatedCost === 0 ? "No entry fee ✓" : `≈ $${act.estimatedCost} <span style="font-weight:400;opacity:.65">/ person</span>`}
              </div>
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
          <div class="timeline">
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
  @page{size:A4;margin:0}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#F8F5F0}
  .cover{min-height:297mm;page-break-after:always}
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
  background:#F15A3A;
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
  color:#F15A3A;
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
  font-size:56px;font-weight:900;line-height:1.05;
  color:#FFFDF9;margin-bottom:16px;letter-spacing:-.5px;
}
.cover-dest{
  font-size:18px;font-weight:500;color:#A39A93;margin-bottom:64px;
  display:flex;align-items:center;gap:10px;
}
.cover-dest-dot{width:6px;height:6px;border-radius:50%;background:#F15A3A;flex-shrink:0}
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
  font-size:12px;font-weight:600;color:#F15A3A;text-transform:capitalize;
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
  padding:40px 52px 32px;
  border-bottom:2px solid #F0EBE3;
}
.day-header{
  display:flex;align-items:flex-end;gap:20px;margin-bottom:30px;
  padding-bottom:22px;
  border-bottom:1px solid #EDE8DE;
  position:relative;
}
.day-header::after{
  content:"";position:absolute;bottom:-1px;left:0;
  width:72px;height:3px;border-radius:2px;background:#F15A3A;
}
.day-number{
  font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;
  color:#F15A3A;padding-bottom:6px;white-space:nowrap;min-width:40px;
}
.day-info{flex:1}
.day-city{
  font-family:'Playfair Display',Georgia,serif;
  font-size:30px;font-weight:700;color:#1A1714;line-height:1.08;margin-bottom:5px;
  letter-spacing:-.3px;
}
.day-theme{font-size:13px;color:#8C8480;font-style:italic}
.day-cost{
  font-family:'Playfair Display',Georgia,serif;
  font-size:23px;font-weight:700;color:#1A1714;
  text-align:right;white-space:nowrap;
}
.day-cost-label{font-size:11px;font-weight:500;color:#8C8480;font-family:'Inter',sans-serif}

/* ─── TIMELINE ──────────────────────────────────── */
.timeline{display:flex;flex-direction:column;padding-left:0}
.tl-item{display:flex;align-items:stretch;gap:16px;min-height:0}
.tl-left{
  display:flex;flex-direction:column;align-items:center;
  width:40px;flex-shrink:0;
}
.tl-dot{
  width:38px;height:38px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:17px;flex-shrink:0;
  box-shadow:0 2px 8px rgba(0,0,0,.13);
}
.tl-line{
  flex:1;width:2px;background:linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.04));
  margin:4px 0 4px;border-radius:1px;
}
.tl-card{
  flex:1;
  background:#FEFCF8;
  border:1px solid #EDE8DE;
  border-radius:14px;
  padding:15px 18px 13px;
  margin-bottom:14px;
  box-shadow:0 1px 4px rgba(26,23,20,.05),0 4px 12px rgba(26,23,20,.03);
}
.tl-card-wish{
  border-color:rgba(217,119,6,.3);
  background:linear-gradient(135deg,#FFFBEB,#FFF8EE);
  box-shadow:0 1px 4px rgba(217,119,6,.08),0 4px 12px rgba(217,119,6,.04);
}
.tl-card-top{display:flex;align-items:center;gap:10px;margin-bottom:7px;flex-wrap:wrap}
.tl-time{
  font-size:11px;font-weight:700;color:#A8A298;letter-spacing:.8px;
  text-transform:uppercase;white-space:nowrap;min-width:58px;
}
.tl-attr{
  font-size:10px;font-weight:600;letter-spacing:.2px;
  padding:3px 9px;border-radius:9px;
}
.tl-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:17px;font-weight:700;color:#1A1714;
  margin-bottom:5px;line-height:1.28;letter-spacing:-.1px;
}
.tl-desc{font-size:12.5px;color:#5A534D;line-height:1.68;margin-bottom:10px}
.tl-cost{
  font-size:12px;font-weight:700;color:#1A1714;
  padding-top:8px;border-top:1px solid rgba(26,23,20,.06);
}

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
  background:linear-gradient(135deg,#F15A3A,#E6492D);
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
.footer-dot{width:8px;height:8px;border-radius:50%;background:#F15A3A}
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
      <div class="logo-name">Packyo</div>
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
    Packyo
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

function findRedoActivity(value: unknown, depth = 0): Partial<Activity> | null {
  if (depth > 5 || value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const nestedActivity = findRedoActivity(value[index], depth + 1);
      if (nestedActivity) return nestedActivity;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name === "string" && record.name.trim().length > 0) {
    return record as Partial<Activity>;
  }

  if ("activity" in record) {
    const nestedActivity = findRedoActivity(record.activity, depth + 1);
    if (nestedActivity) return nestedActivity;
  }

  for (const nestedValue of Object.values(record)) {
    const nestedActivity = findRedoActivity(nestedValue, depth + 1);
    if (nestedActivity) return nestedActivity;
  }

  return null;
}

interface ActivityCardProps {
  activity: Activity;
  actIndex: number;
  dayNumber: number;
  dayCity: string;
  destination: string;
  startDate?: string | null;
  colors: any;
  wishes: Wish[];
  onCardPress: () => void;
  onEdit: (act: Activity, idx: number, day: number) => void;
  onRedo: (act: Activity, idx: number, day: number) => void;
  onDelete: (idx: number, day: number) => void;
}

function ActivityCard({
  activity,
  actIndex,
  dayNumber,
  dayCity,
  destination,
  startDate,
  colors,
  wishes,
  onCardPress,
  onEdit,
  onRedo,
  onDelete,
}: ActivityCardProps) {
  // Find the matching wish to get its live vote count
  const matchedWish = activity.fromWish
    ? wishes.find((w) => w.authorName === activity.suggester)
    : null;
  const wishVotes = matchedWish?.score ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.actRow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onCardPress}
    >
      <Text style={[styles.actTime, { color: colors.foreground }]}>{activity.time}</Text>
      <View style={styles.actContent}>
        <View style={styles.actHeaderRow}>
          <Text style={[styles.actName, { color: colors.foreground }]}>{activity.name}</Text>
        </View>

        {/* Attribution badge */}
        {activity.fromWish ? (
          <View style={styles.attributionBadge}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.attributionText}>
              {activity.suggester}'s wish
              {wishVotes > 0 ? ` · ↑ ${wishVotes} vote${wishVotes !== 1 ? "s" : ""}` : ""}
            </Text>
          </View>
        ) : (
          <View style={[styles.attributionBadge, styles.aiPickBadge]}>
            <Feather name="zap" size={11} color="#6B7280" />
            <Text style={[styles.attributionText, { color: "#6B7280" }]}>Packyo AI pick</Text>
          </View>
        )}

        <Text style={[styles.actDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {activity.description}
        </Text>
        <View style={styles.actActions}>
          <Pressable onPress={(e) => { e.stopPropagation?.(); onEdit(activity, actIndex, dayNumber); }}>
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Edit</Text>
          </Pressable>
          <Pressable onPress={(e) => { e.stopPropagation?.(); onRedo(activity, actIndex, dayNumber); }}>
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>Redo</Text>
          </Pressable>
          <Pressable onPress={(e) => { e.stopPropagation?.(); onDelete(actIndex, dayNumber); }}>
            <Text style={[styles.actionText, { color: colors.destructive }]}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
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
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { trip, loading } = useTrip(id);
  const wishes = useWishes(id);

  const [activeTab, setActiveTab] = useState<"itinerary" | "info" | "map">("itinerary");
  const [selectedDay, setSelectedDay] = useState(1);
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCalendar, setExportingCalendar] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [pendingExport, setPendingExport] = useState<"calendar" | "pdf" | null>(null);
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

  const handleBack = () => {
    if (returnTo === "tripHub" && id) {
      router.replace({ pathname: "/trip/[id]", params: { id } } as any);
      return;
    }
    router.back();
  };

  const itinerary = trip?.itinerary;
  const days = itinerary?.days ?? [];
  const showEstimatedCosts = trip?.showEstimatedCosts !== false;
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

  const handleRedo = async (act: Activity, idx: number, dayNum: number) => {
    const day = days.find((d) => d.dayNumber === dayNum);
    const key = `${dayNum}-${idx}`;
    setRedoLoading(key);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const otherActivities = (day?.activities ?? []).filter((_, i) => i !== idx).map((a) => a.name);
      const allTripActivities = days.flatMap((d) => d.activities.map((a) => a.name)).filter((n) => n !== act.name);
      const resp = await apiFetch("/api/redo-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: act,
          city: day?.city ?? "",
          theme: day?.theme ?? "",
          destination: trip?.destination ?? "",
          redoType: "whole",
          otherActivities,
          allTripActivities,
          userId: user?.uid,
          isPlusUser: false,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(errBody.error ?? "Could not replace activity. Please try again.");
      }
      const responseBody = await resp.json() as { activity?: unknown };
      const newAct = findRedoActivity(responseBody.activity);
      if (!newAct?.name) {
        throw new Error("AI returned an incomplete activity. Please try again.");
      }
      const redoByName = user?.displayName ?? user?.email ?? "A member";
      await updateActivity(id!, dayNum, idx, {
        ...newAct,
        time: act.time,
        lastRedoBy: redoByName,
      });
      incrementAiUsage(id!, "activityRedos").catch(() => {});
    } catch (err) {
      Alert.alert("Could not change activity", (err as Error).message || "Please try again.");
    } finally {
      setRedoLoading(null);
    }
  };

  const handleDelete = async (idx: number, dayNum: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteActivity(id!, dayNum, idx);
    } catch (err) {
      Alert.alert("Delete failed", (err as Error).message || "Could not delete activity. Please try again.");
    }
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
      "Built with packyo ✦",
    ].filter(Boolean);
    await Share.share({ message: lines.join("\n") });
  };

  const handleExportCalendar = async () => {
    if (!trip || !itinerary) return;
    setExportingCalendar(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Append T00:00:00 so "YYYY-MM-DD" parses in local time, not UTC —
      // otherwise every event shifts a day earlier in negative-UTC-offset timezones.
      const base = trip.startDate ? new Date(trip.startDate + "T00:00:00") : new Date();

      const parseTime = (dayOffset: number, timeStr: string): Date => {
        const d = new Date(base);
        d.setDate(d.getDate() + dayOffset);
        const match = timeStr?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (match) {
          let h = parseInt(match[1]);
            const m = parseInt(match[2] ?? "0");
          const period = match[3]?.toLowerCase();
          if (period === "pm" && h < 12) h += 12;
          if (period === "am" && h === 12) h = 0;
          d.setHours(h, m, 0, 0);
        } else {
          d.setHours(9, 0, 0, 0);
        }
        return d;
      };

      const lines: string[] = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "PRODID:-//Packyo//AI Travel Planner//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeIcsText(itinerary.title || trip.destination || "Trip")}`,
      ];

      days.forEach((day, di) => {
        day.activities.forEach((act, activityIndex) => {
          const start = parseTime((day.dayNumber || di + 1) - 1, act.time || "9:00am");
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          lines.push(
            "BEGIN:VEVENT",
            `UID:${safeExportFileName(trip.destination, "ics").replace(/\.ics$/, "")}-${day.dayNumber || di + 1}-${activityIndex}@packyo`,
            `DTSTAMP:${formatIcsDateTime(new Date())}`,
            `DTSTART:${formatIcsDateTime(start)}`,
            `DTEND:${formatIcsDateTime(end)}`,
            "STATUS:CONFIRMED",
            `SUMMARY:${escapeIcsText(act.name || "Activity")}`,
            `DESCRIPTION:${escapeIcsText(act.description || "")}`,
            `LOCATION:${escapeIcsText(day.city || trip.destination || "")}`,
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
        if (!FileSystem.cacheDirectory) {
          throw new Error("No cache directory is available");
        }
        const fileName = safeExportFileName(trip.destination, "ics");
        const fileUri = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/calendar",
            dialogTitle: `${trip.destination} Calendar`,
            UTI: "com.apple.ical.ics",
          });
        } else {
          Alert.alert("Calendar file ready", "Your itinerary calendar file has been created. Use the Share button to save it.");
        }
      }
    } catch (err) {
      Alert.alert("Calendar export failed", err instanceof Error ? err.message : "Could not generate calendar file. Please try again.");
    } finally {
      setExportingCalendar(false);
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
      const fileName = safeExportFileName(trip.destination, "pdf");
      const exportDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!exportDirectory) throw new Error("No local file directory is available.");
      const fileUri = `${exportDirectory}${fileName}`;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `${trip.destination} Itinerary`,
          UTI: "com.adobe.pdf",
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (err) {
      Alert.alert("PDF export failed", err instanceof Error ? err.message : "Could not generate PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportSheetDismiss = () => {
    const exportType = pendingExport;
    if (!exportType) return;
    setPendingExport(null);
    setTimeout(() => {
      if (exportType === "calendar") handleExportCalendar();
      else handleExportPDF();
    }, 50);
  };

  const requestExport = (exportType: "calendar" | "pdf") => {
    setPendingExport(exportType);
    setShowExportSheet(false);

    // React Native's onDismiss is the reliable iOS signal that a native modal
    // has finished closing. React Native Web does not emit it consistently.
    if (Platform.OS === "web") {
      setTimeout(() => {
        setPendingExport(null);
        if (exportType === "calendar") handleExportCalendar();
        else handleExportPDF();
      }, 0);
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
        <Pressable onPress={handleBack} style={[styles.backLink, { borderColor: colors.border }]}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Itinerary</Text>
        </View>
        <View style={styles.headerTabs}>
          {(["itinerary", "info", "map"] as const).map((t) => (
            <Pressable
              key={t}
              style={[styles.headerTab, activeTab === t && { borderBottomColor: colors.foreground }]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[
                styles.headerTabText,
                activeTab === t
                  ? { color: colors.foreground, fontFamily: "DmSans_600SemiBold" }
                  : { color: colors.mutedForeground },
              ]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── INFO TAB ── */}
      {activeTab === "info" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomInset + 100 }}
        >
          <Text style={[styles.titleDest, { color: colors.foreground, marginBottom: 16 }]}>{trip.destination}</Text>
          {days.flatMap((day) =>
            day.activities.map((act, i) => {
              const photoQ = act.photoQuery ?? `${act.name} ${trip.destination}`;
              void photoQ; // used by WikiImage via name/context props
              return (
                <Pressable
                  key={`${day.dayNumber}-${i}`}
                  onPress={() => router.push({
                    pathname: "/activity-detail",
                    params: {
                      name: act.name, description: act.description, time: act.time,
                      tag: act.tag, estimatedCost: String(act.estimatedCost),
                      photoQuery: photoQ, lat: String(act.lat ?? ""), lng: String(act.lng ?? ""),
                      city: day.city, fromWish: String(act.fromWish), suggester: act.suggester,
                      matchedVibe: act.matchedVibe ?? "", labels: JSON.stringify(act.labels ?? []),
                    },
                  })}
                  style={({ pressed }) => [styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 }]}
                >
                  <WikiImage name={act.name} context={trip.destination} style={styles.infoCardPhoto} />
                  <View style={styles.infoCardBody}>
                    <Text style={[styles.infoCardDay, { color: colors.mutedForeground }]}>Day {day.dayNumber} · {act.time}</Text>
                    <Text style={[styles.infoCardName, { color: colors.foreground }]} numberOfLines={2}>{act.name}</Text>
                    <Text style={[styles.infoCardDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{act.description}</Text>
                    <View style={styles.infoCardFooter}>
                      {showEstimatedCosts ? (
                        <View style={[styles.infoChip, { backgroundColor: colors.muted }]}>
                          <Feather name="dollar-sign" size={11} color={colors.mutedForeground} />
                          <Text style={[styles.infoChipText, { color: colors.mutedForeground }]}>
                            {act.estimatedCost === 0 ? "No entry fee" : `~$${act.estimatedCost}`}
                          </Text>
                        </View>
                      ) : null}
                      {act.fromWish && (
                        <View style={[styles.infoChip, { backgroundColor: "#F59E0B15" }]}>
                          <Feather name="star" size={11} color="#F59E0B" />
                          <Text style={[styles.infoChipText, { color: "#F59E0B" }]}>{act.suggester}'s wish</Text>
                        </View>
                      )}
                      <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === "map" && (() => {
        const allActs = days.flatMap((d) => d.activities.map((a) => ({ name: a.name, city: d.city, lat: a.lat, lng: a.lng })));
        const buildRouteUrl = () => {
          if (allActs.length === 0) return `https://maps.google.com/?q=${encodeURIComponent(trip.destination)}`;
          const stops = allActs.map((a) =>
            (a.lat && a.lng && a.lat !== 0) ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.name} ${a.city}`)
          );
          if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${stops[0]}`;
          return `https://www.google.com/maps/dir/${stops.join("/")}`;
        };
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomInset + 100 }}
          >
            {/* Hero CTA */}
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(buildRouteUrl())}
              style={[styles.mapHeroCard, { backgroundColor: colors.primary }]}
            >
              <View style={styles.mapHeroIconBg}>
                <Feather name="map" size={36} color="#fff" />
              </View>
              <Text style={styles.mapHeroTitle}>View Full Route</Text>
              <Text style={styles.mapHeroSub}>
                {allActs.length} stops · {days.length} day{days.length !== 1 ? "s" : ""} · {trip.destination}
              </Text>
              <View style={styles.mapHeroBtn}>
                <Feather name="external-link" size={14} color={colors.primary} />
                <Text style={[styles.mapHeroBtnText, { color: colors.primary }]}>Open in Google Maps</Text>
              </View>
            </Pressable>

            {/* Per-day stops */}
            {days.map((day) => (
              <View key={day.dayNumber} style={[styles.mapDayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.mapDayHeader}>
                  <View style={[styles.mapDayBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.mapDayBadgeText}>{day.dayNumber}</Text>
                  </View>
                  <View>
                    <Text style={[styles.mapDayLabel, { color: colors.mutedForeground }]}>Day {day.dayNumber}</Text>
                    <Text style={[styles.mapDayCity, { color: colors.foreground }]}>{day.city}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      const stops = day.activities.map((a) =>
                        (a.lat && a.lng && a.lat !== 0) ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.name} ${day.city}`)
                      );
                      WebBrowser.openBrowserAsync(
                        stops.length <= 1
                          ? `https://www.google.com/maps/search/?api=1&query=${stops[0] ?? encodeURIComponent(day.city)}`
                          : `https://www.google.com/maps/dir/${stops.join("/")}`
                      );
                    }}
                    style={[styles.mapDayOpenBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  >
                    <Feather name="map-pin" size={12} color={colors.primary} />
                    <Text style={[styles.mapDayOpenText, { color: colors.primary }]}>Day route</Text>
                  </Pressable>
                </View>
                {day.activities.map((act, i) => (
                  <View key={i} style={[styles.mapStopRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <View style={[styles.mapStopDot, { backgroundColor: i === 0 ? colors.primary : colors.border }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.mapStopTime, { color: colors.mutedForeground }]}>{act.time}</Text>
                      <Text style={[styles.mapStopName, { color: colors.foreground }]}>{act.name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        );
      })()}

      {/* ── ITINERARY TAB ── */}
      {activeTab === "itinerary" && <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomInset + 100 }}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.titleDest, { color: colors.foreground }]}>{trip.destination}</Text>
        </View>

        {days.map((day) => (
          <View key={day.dayNumber} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayMeta, { color: colors.mutedForeground }]}>
                Day {day.dayNumber} • {getDayDate(trip.startDate, day.dayNumber) ? new Date(getDayDate(trip.startDate, day.dayNumber)!.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ""}
              </Text>
              <Text style={[styles.dayCity, { color: colors.foreground }]}>{day.city}</Text>
            </View>

            <View style={styles.dayActivities}>
              {day.activities.map((act, i) => (
                <View key={i}>
                  <ActivityCard
                    activity={act}
                    actIndex={i}
                    dayNumber={day.dayNumber}
                    dayCity={day.city}
                    destination={trip.destination}
                    startDate={trip.startDate}
                    colors={colors}
                    wishes={wishes}
                    onCardPress={() => router.push({
                      pathname: "/activity-detail",
                      params: {
                        name: act.name,
                        description: act.description,
                        time: act.time,
                        tag: act.tag,
                        estimatedCost: String(act.estimatedCost),
                        photoQuery: act.photoQuery ?? `${act.name} ${trip.destination}`,
                        lat: String(act.lat ?? ""),
                        lng: String(act.lng ?? ""),
                        city: day.city,
                        fromWish: String(act.fromWish),
                        suggester: act.suggester,
                        matchedVibe: act.matchedVibe ?? "",
                        labels: JSON.stringify(act.labels ?? []),
                      },
                    })}
                    onEdit={handleEdit}
                    onRedo={handleRedo}
                    onDelete={handleDelete}
                  />
                  {redoLoading === `${day.dayNumber}-${i}` && (
                    <View style={{ alignItems: "center", padding: 8 }}>
                      <ActivityIndicator color={colors.primary} size="small" />
                    </View>
                  )}
                </View>
              ))}
              <Pressable
                onPress={handleAddActivity}
                style={styles.addActBtn}
              >
                <Feather name="plus" size={14} color={colors.mutedForeground} />
                <Text style={[styles.addActText, { color: colors.mutedForeground }]}>Add activity</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {accom && (
          <View style={[styles.accomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.accomCardHead}>
              <Feather name="home" size={14} color="#26A69A" />
              <Text style={[styles.accomCardLabel, { color: "#26A69A" }]}>ACCOMMODATION</Text>
            </View>
            <Text style={[styles.accomCardName, { color: colors.foreground }]}>{accom.name}</Text>
            <Text style={[styles.accomCardMeta, { color: colors.mutedForeground }]}>
              {accom.location}{accom.type ? ` · ${accom.type}` : ""}
            </Text>
          </View>
        )}

        {/* Not included — excluded wishes */}
        {(() => {
          const excludedWishes = wishes.filter(w => w.score < 0);
          if (excludedWishes.length === 0) return null;
          return (
            <View style={styles.notIncludedBlock}>
              <View style={styles.notIncludedHeader}>
                <Feather name="slash" size={13} color="#9CA3AF" />
                <Text style={[styles.notIncludedTitle, { color: colors.mutedForeground }]}>Not included</Text>
              </View>
              <Text style={[styles.notIncludedSub, { color: colors.mutedForeground }]}>
                These were the pack's lowest-rated wishes and were excluded from the itinerary.
              </Text>
              {excludedWishes.map((w) => {
                const upCount = Object.keys(w.upvoters ?? {}).length;
                const downCount = Object.keys(w.downvoters ?? {}).length;
                return (
                  <View key={w.id} style={[styles.excludedRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.excludedText, { color: colors.mutedForeground }]}>{w.text}</Text>
                      <Text style={[styles.excludedAuthor, { color: colors.mutedForeground }]}>Added by {w.authorName}</Text>
                    </View>
                    <View style={styles.excludedVotes}>
                      <Feather name="thumbs-up" size={11} color="#9CA3AF" />
                      <Text style={styles.excludedVoteNum}>{upCount}</Text>
                      <Feather name="thumbs-down" size={11} color="#9CA3AF" style={{ marginLeft: 6 }} />
                      <Text style={styles.excludedVoteNum}>{downCount}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}
      </ScrollView>}

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable style={styles.bottomAction} onPress={handleShare}>
          <Feather name="share" size={20} color={colors.foreground} />
          <Text style={[styles.bottomActionText, { color: colors.foreground }]}>Share</Text>
        </Pressable>
        <Pressable
          style={styles.bottomAction}
          onPress={() => { Haptics.selectionAsync(); setShowExportSheet(true); }}
        >
          {exportingPDF || exportingCalendar ? <ActivityIndicator size="small" color={colors.foreground} /> : <Feather name="download" size={20} color={colors.foreground} />}
          <Text style={[styles.bottomActionText, { color: colors.foreground }]}>Export</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => router.push(`/chat/${id}`)}>
          <Feather name="message-circle" size={20} color={colors.foreground} />
          <Text style={[styles.bottomActionText, { color: colors.foreground }]}>Chat</Text>
        </Pressable>
        <Pressable style={styles.bottomAction} onPress={() => { setSavePackName(`${trip.destination} Crew`); setShowSavePackModal(true); Haptics.selectionAsync(); }}>
          <Feather name="package" size={20} color={colors.primary} />
          <Text style={[styles.bottomActionText, { color: colors.primary }]}>Save as pack!</Text>
        </Pressable>
      </View>

      {/* ── EXPORT SHEET ── */}
      <Modal
        visible={showExportSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportSheet(false)}
        onDismiss={handleExportSheetDismiss}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowExportSheet(false)}>
          <Pressable style={[styles.exportSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Export itinerary</Text>
            <Text style={[styles.exportSubtitle, { color: colors.mutedForeground }]}>Choose a format to share or save</Text>

            <Pressable
              style={({ pressed }) => [styles.exportOption, { backgroundColor: pressed ? colors.muted : colors.background, borderColor: colors.border }]}
              onPress={() => requestExport("calendar")}
            >
              <View style={[styles.exportOptIcon, { backgroundColor: "#EBF5FB" }]}>
                <Text style={{ fontSize: 22 }}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptTitle, { color: colors.foreground }]}>Calendar (.ics)</Text>
                <Text style={[styles.exportOptSub, { color: colors.mutedForeground }]}>Add all activities to your calendar app</Text>
              </View>
              {exportingCalendar
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.exportOption, { backgroundColor: pressed ? colors.muted : colors.background, borderColor: colors.border }]}
              onPress={() => requestExport("pdf")}
            >
              <View style={[styles.exportOptIcon, { backgroundColor: "#FDF3EF" }]}>
                <Text style={{ fontSize: 22 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptTitle, { color: colors.foreground }]}>PDF</Text>
                <Text style={[styles.exportOptSub, { color: colors.mutedForeground }]}>Beautiful itinerary document to share</Text>
              </View>
              {exportingPDF
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
            </Pressable>

            <Pressable
              style={[styles.exportCancel, { backgroundColor: colors.muted }]}
              onPress={() => setShowExportSheet(false)}
            >
              <Text style={[styles.exportCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

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

      {packSavedName ? (
        <View style={[styles.savedToast, { backgroundColor: colors.primary }]} pointerEvents="none">
          <Mascot name="ticket-pal" size={40} style={{ marginRight: -4 }} />
          <Text style={styles.savedToastText}>"{packSavedName}" saved as a Pack!</Text>
        </View>
      ) : null}

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
                One tap to invite everyone next time.
              </Text>
              {savePackError ? (
                <Text style={{ fontFamily: "DmSans_500Medium", fontSize: 13, color: "#F15A3A", textAlign: "center" }}>
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
  header: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 16, flex: 1, textAlign: "center", marginRight: 24 },
  headerTabs: { flexDirection: "row", justifyContent: "space-between" },
  headerTab: { flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", alignItems: "center" },
  headerTabText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  
  titleRow: { paddingVertical: 16, marginTop: 8 },
  titleDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28 },

  dayBlock: { marginBottom: 32 },
  dayHeader: { marginBottom: 16 },
  dayMeta: { fontFamily: "DmSans_500Medium", fontSize: 13, marginBottom: 4 },
  dayCity: { fontFamily: "DmSans_600SemiBold", fontSize: 18 },
  
  dayActivities: { gap: 16 },
  actRow: { flexDirection: "row", gap: 16 },
  actTime: { width: 44, fontFamily: "DmSans_500Medium", fontSize: 13, marginTop: 2 },
  actContent: { flex: 1, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.05)" },
  actHeaderRow: { flexDirection: "row", alignItems: "center" },
  actName: { fontFamily: "DmSans_600SemiBold", fontSize: 15, lineHeight: 20 },
  actDesc: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20, marginTop: 4 },
  actActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionText: { fontFamily: "DmSans_500Medium", fontSize: 12 },

  addActBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 60, marginTop: 4 },
  addActText: { fontFamily: "DmSans_500Medium", fontSize: 13 },

  attributionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    marginBottom: 2,
  },
  attributionText: {
    fontFamily: "DmSans_500Medium",
    fontSize: 11,
    color: "#F59E0B",
  },
  aiPickBadge: {},

  notIncludedBlock: { marginTop: 24, marginBottom: 12 },
  notIncludedHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  notIncludedTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  notIncludedSub: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 17, marginBottom: 10 },
  excludedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginBottom: 6,
    gap: 10,
    opacity: 0.7,
  },
  excludedText: { fontFamily: "DmSans_500Medium", fontSize: 13 },
  excludedAuthor: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 2 },
  excludedVotes: { flexDirection: "row", alignItems: "center", gap: 3 },
  excludedVoteNum: { fontFamily: "DmSans_500Medium", fontSize: 11, color: "#9CA3AF" },

  accomCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginTop: 12, marginBottom: 24, gap: 4 },
  accomCardHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  accomCardLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  accomCardName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  accomCardMeta: { fontFamily: "DmSans_400Regular", fontSize: 14, textTransform: "capitalize" },

  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomAction: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  bottomActionText: { fontFamily: "DmSans_500Medium", fontSize: 11 },

  /* Info tab */
  infoCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  infoCardPhoto: { width: 100, height: 110 },
  infoCardBody: { flex: 1, padding: 12, gap: 4 },
  infoCardDay: { fontFamily: "DmSans_500Medium", fontSize: 11 },
  infoCardName: { fontFamily: "DmSans_700Bold", fontSize: 14, lineHeight: 18 },
  infoCardDesc: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 17, flex: 1 },
  infoCardFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  infoChipText: { fontFamily: "DmSans_500Medium", fontSize: 11 },

  /* Map tab */
  mapHeroCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  mapHeroIconBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  mapHeroTitle: { fontFamily: "DmSans_700Bold", fontSize: 22, color: "#fff" },
  mapHeroSub: { fontFamily: "DmSans_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center" },
  mapHeroBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8 },
  mapHeroBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  mapDayCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  mapDayHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  mapDayBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mapDayBadgeText: { fontFamily: "DmSans_700Bold", fontSize: 13, color: "#fff" },
  mapDayLabel: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  mapDayCity: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  mapDayOpenBtn: { marginLeft: "auto" as any, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  mapDayOpenText: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },
  mapStopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  mapStopDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  mapStopTime: { fontFamily: "DmSans_400Regular", fontSize: 11, marginBottom: 1 },
  mapStopName: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  backLink: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backLinkText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, gap: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 4 },
  exportSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  exportSubtitle: { fontFamily: "DmSans_400Regular", fontSize: 13, marginBottom: 20 },
  exportOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  exportOptIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exportOptTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 2 },
  exportOptSub: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 17 },
  exportCancel: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 6 },
  exportCancelText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
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
    position: "absolute", bottom: 100, left: 20, right: 20,
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  savedToastText: { fontFamily: "DmSans_600SemiBold", fontSize: 14, color: "#fff", flex: 1 },
});
