import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { usePacks, renamePack, removePackMember } from "@/hooks/useFirebase";

const AVATAR_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function initials(name: string) {
  return name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

function timeSince(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} month${m > 1 ? "s" : ""} ago`;
  const y = Math.floor(m / 12);
  return `${y} year${y > 1 ? "s" : ""} ago`;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { packs, loading } = usePacks(user?.uid);

  const pack = packs.find((p) => p.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const isHost = pack?.hostUid === user?.uid;
  const memberList = Object.entries(pack?.members ?? {});
  const tripCount = Object.keys(pack?.tripIds ?? {}).length;

  const handleRename = async () => {
    if (!pack || !newName.trim()) { setEditing(false); return; }
    setRenaming(true);
    try {
      await renamePack(pack.id, newName.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRenaming(false);
    setEditing(false);
  };

  const handleRemoveMember = (uid: string, name: string) => {
    if (!pack) return;
    Alert.alert(
      `Remove ${name}?`,
      "They'll be removed from this pack. Past trips together are unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removePackMember(pack.id, uid);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
          },
        },
      ],
    );
  };

  if (loading || !pack) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[{ fontFamily: "DmSans_400Regular", fontSize: 15 }, { color: colors.mutedForeground }]}>
              Pack not found.
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>PACK</Text>
          <Text style={[styles.headerName, { color: colors.foreground }]} numberOfLines={1}>
            {pack.name}
          </Text>
        </View>
        {isHost && (
          <Pressable
            onPress={() => { setNewName(pack.name); setEditing(true); Haptics.selectionAsync(); }}
            style={[styles.editBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="edit-2" size={16} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{memberList.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Members</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{tripCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Trips</Text>
          </View>
          {pack.lastTripAt ? (
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.foreground, fontSize: 13 }]}>
                {timeSince(pack.lastTripAt)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Last trip</Text>
            </View>
          ) : null}
        </View>

        {/* Last destination pill */}
        {pack.lastTripDestination ? (
          <View style={[styles.lastTripRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.lastTripIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="map-pin" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.lastTripLabel, { color: colors.mutedForeground }]}>Last trip together</Text>
              <Text style={[styles.lastTripDest, { color: colors.foreground }]}>{pack.lastTripDestination}</Text>
            </View>
          </View>
        ) : null}

        {/* Members list */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Members</Text>
          {memberList.map(([uid, m], i) => (
            <View key={uid} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                <Text style={styles.avatarText}>{initials((m as any).name ?? "")}</Text>
              </View>
              <Text style={[styles.memberName, { color: colors.foreground }]}>{(m as any).name ?? "Member"}</Text>
              {uid === pack.hostUid ? (
                <View style={[styles.hostBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.hostBadgeText, { color: colors.primary }]}>Host</Text>
                </View>
              ) : null}
              {isHost && uid !== user?.uid ? (
                <Pressable onPress={() => handleRemoveMember(uid, (m as any).name ?? "Member")} style={styles.removeBtn}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        {/* Plan new trip CTA */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/create"); }}
            style={[styles.planBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.planBtnText}>Plan a new trip with this pack</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Rename modal */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.overlay} onPress={() => setEditing(false)}>
          <View style={[styles.renameSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Rename pack</Text>
            <TextInput
              style={[styles.renameInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. College Friends, Family, Work Squad"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRename}
            />
            <View style={styles.sheetBtns}>
              <Pressable onPress={() => setEditing(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRename}
                disabled={renaming}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: renaming ? 0.6 : 1 }]}
              >
                {renaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginTop: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 1.5, marginBottom: 2 },
  headerName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, letterSpacing: -0.3 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginTop: 6 },

  statsRow: { flexDirection: "row", padding: 16, gap: 10 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center" },
  statNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 2 },

  lastTripRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4,
  },
  lastTripIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  lastTripLabel: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  lastTripDest: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium", fontSize: 11,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "DmSans_700Bold", fontSize: 15, color: "#fff" },
  memberName: { fontFamily: "DmSans_500Medium", fontSize: 15, flex: 1 },
  hostBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  hostBadgeText: { fontFamily: "DmSans_600SemiBold", fontSize: 11 },
  removeBtn: { padding: 6 },

  planBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  planBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  renameSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 40, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  renameInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontFamily: "DmSans_400Regular", fontSize: 15 },
  sheetBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 13 },
  cancelText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  saveBtn: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 13 },
  saveBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
});
