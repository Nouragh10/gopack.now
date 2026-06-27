import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
  { icon: "users", label: "One purchase unlocks for every member" },
  { icon: "zap", label: "Unlimited itinerary & packing generations" },
  { icon: "rotate-cw", label: "20 activity redos per trip" },
  { icon: "file-text", label: "PDF export of your itinerary" },
  { icon: "calendar", label: "Calendar export for every activity" },
];

type Plan = "monthly" | "yearly";

export function UpgradeModal({ visible, reason, onClose, onPurchaseSuccess }: Props) {
  const colors = useColors();
  const { monthlyPackage, annualPackage, purchase, isPurchasing, restore, isRestoring, refetchOfferings, offeringsLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("yearly");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      refetchOfferings();
    }
  }, [visible]);

  const isLoading = isPurchasing || isRestoring;

  const handlePurchase = async () => {
    setError(null);
    let pkg = selectedPlan === "yearly" ? annualPackage : monthlyPackage;
    if (!pkg) {
      const result = await refetchOfferings();
      const freshPackages = result.data?.current?.availablePackages ?? [];
      const yearlyId = "yearly_pro_1999";
      const monthlyId = "$rc_monthly";
      pkg = freshPackages.find((p) => p.identifier === (selectedPlan === "yearly" ? yearlyId : monthlyId));
    }
    if (!pkg) {
      setError("Plans are loading — please wait a moment and try again.");
      return;
    }
    try {
      await purchase(pkg);
      onPurchaseSuccess?.();
      onClose();
    } catch (e: any) {
      if (!e?.userCancelled) setError(e?.message ?? "Purchase failed. Please try again.");
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

  const ctaPrice = selectedPlan === "yearly" ? "$19.99/yr" : "$9.99/mo";
  const ctaLabel = selectedPlan === "yearly" ? "Subscribe — $19.99/yr" : "Subscribe — $9.99/mo";

  return (
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
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {reason || "Unlock the full GoPackNow experience."}
          </Text>
          <Text style={[styles.sharedNote, { color: colors.primary }]}>
            🎉 One purchase unlocks for the entire group
          </Text>

          {/* Plan selector */}
          <View style={styles.planRow}>
            <Pressable
              onPress={() => setSelectedPlan("monthly")}
              style={[
                styles.planCard,
                {
                  borderColor: selectedPlan === "monthly" ? colors.primary : colors.border,
                  backgroundColor: selectedPlan === "monthly" ? "#E85D3A0D" : colors.muted,
                },
              ]}
            >
              <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>MONTHLY</Text>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$9.99</Text>
              <Text style={[styles.planPer, { color: colors.mutedForeground }]}>per month</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedPlan("yearly")}
              style={[
                styles.planCard,
                {
                  borderColor: selectedPlan === "yearly" ? colors.primary : colors.border,
                  backgroundColor: selectedPlan === "yearly" ? "#E85D3A0D" : colors.muted,
                },
              ]}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.planLabel, { color: colors.mutedForeground }]}>YEARLY</Text>
              <Text style={[styles.planPrice, { color: colors.foreground }]}>$19.99</Text>
              <Text style={[styles.planPer, { color: colors.mutedForeground }]}>per year</Text>
            </Pressable>
          </View>

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
            onPress={handlePurchase}
            disabled={isLoading || offeringsLoading}
            style={[styles.cta, { backgroundColor: "#E85D3A", opacity: (isLoading || offeringsLoading) ? 0.7 : 1 }]}
          >
            {(isLoading || offeringsLoading) ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#fff" />
                <Text style={styles.ctaText}>{ctaLabel}</Text>
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
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  badgeRow: { flexDirection: "row", marginBottom: 10 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff", letterSpacing: 1.2 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, marginBottom: 4 },
  subtitle: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20, marginBottom: 4 },
  sharedNote: { fontFamily: "DmSans_700Bold", fontSize: 13, marginBottom: 16 },
  planRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    position: "relative",
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    backgroundColor: "#E85D3A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueText: { fontFamily: "DmSans_700Bold", fontSize: 9, color: "#fff", letterSpacing: 0.8 },
  planLabel: { fontFamily: "DmSans_700Bold", fontSize: 10, letterSpacing: 1, marginTop: 8 },
  planPrice: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, marginTop: 2 },
  planPer: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 1 },
  featureList: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10, marginBottom: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureIcon: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  featureText: { fontFamily: "DmSans_400Regular", fontSize: 13, flex: 1 },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, color: "#ef4444", marginBottom: 10, textAlign: "center" },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15, marginBottom: 8 },
  ctaText: { fontFamily: "DmSans_700Bold", fontSize: 16, color: "#fff" },
  restore: { alignItems: "center", paddingVertical: 6 },
  restoreText: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  dismiss: { alignItems: "center", paddingVertical: 8 },
  dismissText: { fontFamily: "DmSans_400Regular", fontSize: 14 },
});
