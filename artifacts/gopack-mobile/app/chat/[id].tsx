import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ChatMessage, sendMessage, useChat, useTrip } from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function colorForUid(uid: string, memberIds: Record<string, boolean>) {
  const idx = Object.keys(memberIds ?? {}).indexOf(uid);
  return MEMBER_COLORS[Math.max(0, idx) % MEMBER_COLORS.length];
}

function MessageBubble({ msg, isMe, memberIds, colors }: {
  msg: ChatMessage;
  isMe: boolean;
  memberIds: Record<string, boolean>;
  colors: any;
}) {
  const color = colorForUid(msg.authorId, memberIds);
  const initial = (msg.authorName ?? "?")[0].toUpperCase();

  return (
    <View style={[styles.msgRow, isMe && styles.msgRowRight]}>
      {!isMe && (
        <View style={[styles.msgAvatar, { backgroundColor: color }]}>
          <Text style={styles.msgAvatarText}>{initial}</Text>
        </View>
      )}
      <View style={{ maxWidth: "72%" }}>
        {!isMe && (
          <Text style={[styles.msgAuthor, { color: colors.mutedForeground }]}>
            {msg.authorName}
          </Text>
        )}
        <View
          style={[
            styles.bubble,
            isMe
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
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
    } finally {
      setSending(false);
    }
  };

  const inverted = [...messages].reverse();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pack chat</Text>
        <View style={[styles.headerBadge, { backgroundColor: colors.muted }]}>
          <Text style={[styles.headerBadgeText, { color: colors.mutedForeground }]}>
            {Object.keys(trip?.memberIds ?? {}).length}
          </Text>
        </View>
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
              memberIds={trip?.memberIds ?? {}}
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

        <View style={[styles.inputBar, { borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
            placeholder="Message the pack..."
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
            <Feather name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: "DmSans_600SemiBold", fontSize: 17 },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  headerBadgeText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  msgRowRight: { flexDirection: "row-reverse" },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarText: { color: "#fff", fontSize: 12, fontFamily: "DmSans_700Bold" },
  msgAuthor: { fontFamily: "DmSans_500Medium", fontSize: 11, marginBottom: 4, marginLeft: 4 },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
