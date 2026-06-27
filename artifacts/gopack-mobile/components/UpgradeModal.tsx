import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

interface Props {
  visible: boolean;
  reason?: string;
  tripId: string;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

const FEATURES = [
  { icon: "unlock", label: "All itinerary days unlocked" },
  { icon: "zap", label: "Unlimited itinerary & packing generations" },
  { icon: "rotate-cw", label: "20 activity redos per trip" },
  { icon: "file-text", label: "PDF export of your itinerary" },
  { icon: "calendar", label: "Calendar export for every activity" },
  { icon: "users", label: "Up to 20 trip members" },
];

interface ConfirmModalProps {
  visible: boolean;
  priceString: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ visible, priceString, onConfirm, onCancel }: ConfirmModalProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={confirmStyles.overlay}>
        <View style={[confirmStyles.box, { backgroundColor: colors.card }]}>
          <Text style={[confirmStyles.title, { color: colors.foreground }]}>Confirm Purchase</Text>
          <Text style={[confirmStyles.body, { color: colors.mutedForeground }]}>
            Purchase Pack Plus for {priceString}/month? You can cancel anytime.
          </Text>
          <View style={confirmStyles.row}>
            <Pressable onPress={onCancel} style={[confirmStyles.btn, { backgroundColor: colors.border }]}>
              <Text style={[confirmStyles.btnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[confirmStyles.btn, { backgroundColor: "#E85D3A" }]}>
              <Text style={[confirmStyles.btnText, { color: "#fff" }]}>Buy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { borderRadius: 18, padding: 24, width: "100%" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 10 },
  body: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  row: { flexDirection: "row", gap: 12 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnText: { fontFamily: "DmSans_700Bold", fontSize: 15 },
});

export function UpgradeModal({ visible, reason, onClose, onPurchaseSuccess }: Props) {
  const colors = useColors();
  const { offerings, purchase, isPurchasing, restore, isRestoring } = useSubscription();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentOffering = offerings?.current;
  const packageToPurchase = currentOffering?.availablePackages[0];
  const priceString = packageToPurchase?.product.priceString ?? "$14.99";

  const handleUpgradePress = () => {
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirmPurchase = async () => {
    if (!packageToPurchase) {
      setError("No package available. Please try again.");
      setShowConfirm(false);
      return;
    }
    setShowConfirm(false);
    try {
      await purchase(packageToPurchase);
      onPurchaseSuccess?.();
      onClose();
    } catch (e: any) {
      if (e?.userCancelled) return;
      setError(e?.message ?? "Purchase failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setError(null);
    try {
      await restore();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Restore failed. Please try again.");
    }
  };

  const isLoading = isPurchasing || isRestoring;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: "#E85D3A" }]}>
                <Text style={styles.badgeText}>PACK PLUS</Text>
              </View>
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              Upgrade your trip
            </Text>
            {reason ? (
              <Text style={[styles.reason, { color: colors.mutedForeground }]}>{reason}</Text>
            ) : (
              <Text style={[styles.reason, { color: colors.mutedForeground }]}>
                Unlock the full GoPackNow experience for this trip.
              </Text>
            )}

            <View style={[styles.featureList, { borderColor: colors.border }]}>
              {FEATURES.map((f) => (
                <View key={f.icon} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: "#E85D3A15" }]}>
                    <Feather name={f.icon as any} size={14} color="#E85D3A" />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{f.label}</Text>
                </View>
              ))}
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleUpgradePress}
              disabled={isLoading}
              style={[styles.cta, { backgroundColor: "#E85D3A", opacity: isLoading ? 0.7 : 1 }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="zap" size={16} color="#fff" />
                  <Text style={styles.ctaText}>Upgrade — {priceString}/mo</Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={handleRestore} disabled={isLoading} style={styles.restore}>
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore purchases</Text>
            </Pressable>

            <Pressable onPress={onClose} style={styles.dismiss}>
              <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Not now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={showConfirm}
        priceString={priceString}
        onConfirm={handleConfirmPurchase}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  badgeRow: { flexDirection: "row", marginBottom: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff", letterSpacing: 1.2 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, marginBottom: 6 },
  reason: { fontFamily: "DmSans_400Regular", fontSize: 14, marginBottom: 18, lineHeight: 20 },
  featureList: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 12, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "DmSans_400Regular", fontSize: 14, flex: 1 },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, color: "#ef4444", marginBottom: 10, textAlign: "center" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginBottom: 8 },
  ctaText: { fontFamily: "DmSans_700Bold", fontSize: 16, color: "#fff" },
  restore: { alignItems: "center", paddingVertical: 6 },
  restoreText: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  dismiss: { alignItems: "center", paddingVertical: 8 },
  dismissText: { fontFamily: "DmSans_400Regular", fontSize: 14 },
});
