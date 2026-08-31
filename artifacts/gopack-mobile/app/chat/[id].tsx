import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ChatMessage, sendMessage, useChat, useTrip } from "@/hooks/useFirebase";
import { sendTripPush } from "@/lib/push-notifications";

const MEMBER_COLORS = ["#F15A3A", "#F4BC55", "#A77BD6", "#68B7A0", "#EE9D54", "#6EA6D8"];

function colorForUid(uid: string, members: Record<string, { name: string; joinedAt: string; isHost: boolean }>) {
  const idx = Object.keys(members ?? {}).indexOf(uid);
  return MEMBER_COLORS[Math.max(0, idx) % MEMBER_COLORS.length];
}

function MessageBubble({ msg, isMe, members, colors }: {
  msg: ChatMessage;
  isMe: boolean;
  members: Record<string, { name: string; joinedAt: string; isHost: boolean }>;
  colors: any;
}) {
  const color = colorForUid(msg.authorId, members);
  const initial = (msg.authorName ?? "?")[0].toUpperCase();

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowRight]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: color }]}>
          <Text style={styles.msgAvatarText}>{initial}</Text>
        </View>
      )}
      <View style={[{ maxWidth: "75%" }, isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" }]}>
        {!isMe && (
          <Text style={[styles.msgAuthor, { color: colors.mutedForeground }]}>
            {msg.authorName}
          </Text>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}
        >
          <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
            {msg.text}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { trip } = useTrip(id);
  const messages = useChat(id);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = async () => {
    if (!text.trim() || !user || !id || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await sendMessage(id, msg, user.uid, user.displayName ?? "Traveler");
      await sendTripPush(
        id,
        `${user.displayName ?? "A traveler"} in ${trip?.destination || "your trip"}`,
        msg,
        `/chat/${id}`,
      );
    } finally {
      setSending(false);
    }
  };

  const inverted = [...messages].reverse();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{trip?.destination ?? "Trip Chat"}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {Object.keys(trip?.members ?? {}).length} members
          </Text>
        </View>
        <Pressable style={styles.headerMenu}>
          <Feather name="more-horizontal" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={inverted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              isMe={item.authorId === user?.uid}
              members={trip?.members ?? {}}
              colors={colors}
            />
          )}
          inverted
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="message-circle" size={36} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Start the conversation!
              </Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, color: colors.foreground }]}
            placeholder={`Message ${trip?.destination ?? "the pack"}...`}
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType="send"
            onSubmitEditing={Platform.OS !== "ios" ? handleSend : undefined}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.muted },
            ]}
          >
            <Feather name="arrow-up" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 16,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitles: { flex: 1, alignItems: "center" },
  headerTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
  headerSubtitle: { fontFamily: "DmSans_400Regular", fontSize: 13, marginTop: 2 },
  headerMenu: { padding: 4, marginRight: -4 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 16 },
  msgRowRight: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: { color: "#fff", fontSize: 13, fontFamily: "DmSans_700Bold" },
  msgAuthor: { fontFamily: "DmSans_500Medium", fontSize: 12, marginBottom: 4, marginLeft: 2 },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleText: { fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 22 },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
    transform: [{ scaleY: -1 }],
  },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
});
