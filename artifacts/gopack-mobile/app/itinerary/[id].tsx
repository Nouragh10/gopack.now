= days.flatMap((d) => d.activities.map((a) => a.name)).filter((n) => n !== act.name);
      const redoCity = day?.city?.trim() || trip?.destination?.trim() || "";
      const resp = await apiFetch("/api/redo-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: act,
          // Older saved itineraries may not have a city on each day. The trip
          // destination remains a reliable fallback and prevents a 400 on iOS.
          city: redoCity,
          theme: day?.theme ?? "",
          destination: trip?.destination ?? "",
          budget: trip?.budget ?? "midrange",
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
      const responseBody = await resp.json() as unknown;
      // Accept both the current { activity } contract and older nested/array
      // responses during rollout, so TestFlight does not reject a valid redo.
      const newAct = findRedoActivity(responseBody);
      if (!newAct?.name) {
        throw new Error("AI returned an incomplete activity. Please try again.");
      }
      const redoByName = user?.displayName ?? user?.email ?? "A member";
      await updateActivity(id!, dayNum, act, {
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

  const handleDelete = async (activity: Activity, dayNum: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteActivity(id!, dayNum, activity);
    } catch (err) {
      Alert.alert("Delete failed", (err as Error).message || "Could not delete activity. Please try again.");
    }
  };

  const openManualActivity = (dayNumber: number) => {
    setAddChoiceDay(null);
    setEditModal({
      dayNumber,
      actIndex: null,
      targetActivity: null,
      name: "",
      time: "12:00 PM",
      description: "",
      estimatedCost: "",
    });
  };

  const openMapActivity = (dayNumber: number) => {
    setAddChoiceDay(null);
    setMapImportError("");
    setMapImport({ dayNumber, link: "" });
  };

  const handleAddFromMap = async () => {
    if (!mapImport || !id || !trip) return;
    const link = mapImport.link.trim();
    if (!link) {
      setMapImportError("Paste a Google Maps link first.");
      return;
    }
    const day = days.find((item) => item.dayNumber === mapImport.dayNumber);
    setMapImporting(true);
    setMapImportError("");
    try {
      const token = user ? await user.getIdToken() : null;
      if (!token) throw new Error("Sign in before importing a Google Maps place.");
      const response = await apiFetch("/api/parse-map-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tripId: id,
          link,
          destination: trip.destination,
          city: day?.city ?? trip.destination,
          dayNumber: mapImport.dayNumber,
          existingActivities: (day?.activities ?? []).map((activity) => ({
            time: activity.time,
            name: activity.name,
          })),
        }),
      });
      const body = await response.json().catch(() => ({})) as {
        activity?: Partial<Activity>;
        error?: string;
      };
      if (!response.ok || !body.activity?.name) {
        throw new Error(body.error ?? "Packyo could not read that Google Maps place.");
      }
      await addActivity(id, mapImport.dayNumber, {
        ...body.activity,
        fromWish: false,
        suggester: user?.displayName ?? user?.email ?? "Member",
      });
      setMapImport(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      setMapImportError(caught instanceof Error ? caught.message : "Could not add that place.");
    } finally {
      setMapImporting(false);
    }
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
      };
      if (editModal.actIndex === null) {
        await addActivity(id, editModal.dayNumber, {
          ...partial,
          suggester: user?.displayName ?? user?.email ?? "Member",
        });
      } else {
        if (!editModal.targetActivity) throw new Error("The selected activity is no longer available.");
        await updateActivity(id, editModal.dayNumber, editModal.targetActivity, partial);
      }
    } catch (err) {
      Alert.alert("Could not save activity", (err as Error).message || "Please try again.");
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

      if (Platform.OS !== "web") {
        let permission = await Calendar.getCalendarPermissionsAsync();
        if (permission.status !== "granted") {
          permission = await Calendar.requestCalendarPermissionsAsync();
        }
        if (permission.status === "granted") {
          const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
          let targetCalendar = calendars.find((item) => item.allowsModifications);
          if (!targetCalendar) {
            const defaultCalendar = await Calendar.getDefaultCalendarAsync();
            if (defaultCalendar?.allowsModifications) targetCalendar = defaultCalendar;
          }
          if (targetCalendar) {
            const createdEventIds: string[] = [];
            try {
              for (let di = 0; di < days.length; di += 1) {
                const day = days[di];
                for (const act of day.activities) {
                  const start = parseTime((day.dayNumber || di + 1) - 1, act.time || "9:00am");
                  const eventId = await Calendar.createEventAsync(targetCalendar.id, {
                    title: act.name || "Activity",
                    startDate: start,
                    endDate: new Date(start.getTime() + 60 * 60 * 1000),
                    notes: act.description || undefined,
                    location: day.city || trip.destination || undefined,
                  });
                  createdEventIds.push(eventId);
                }
              }
              Alert.alert(
                "Added to calendar",
                `${createdEventIds.length} ${createdEventIds.length === 1 ? "activity was" : "activities were"} added to your iPhone calendar.`,
              );
              return;
            } catch (nativeCalendarError) {
              await Promise.all(
                createdEventIds.map((eventId) =>
                  Calendar.deleteEventAsync(eventId).catch(() => undefined),
                ),
              );
              if (createdEventIds.length > 0) {
                throw nativeCalendarError;
              }
              // If no event was created, continue to the .ics fallback below.
            }
          }
        }
      }

      const lines: string[] = [
        "BEGIN:VCALENDAR", "VERSION:2.0",
        "PRODID:-//Packyo//AI Travel Planner//EN",
        "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeIcsText(itinerary.title || trip.destination || "Trip")}`,
      ];
      const calendarStamp = formatIcsDateTime(new Date());

      days.forEach((day, di) => {
        day.activities.forEach((act, activityIndex) => {
          const start = parseTime((day.dayNumber || di + 1) - 1, act.time || "9:00am");
          const end = new Date(start.getTime() + 60 * 60 * 1000);
          lines.push(
            "BEGIN:VEVENT",
            `UID:${safeExportFileName(trip.destination, "ics").replace(/\.ics$/, "")}-${day.dayNumber || di + 1}-${activityIndex}@packyo`,
            `DTSTAMP:${calendarStamp}`,
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
      const icsContent = lines.flatMap(foldIcsLine).join("\r\n") + "\r\n";

      if (Platform.OS === "web") {
        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(trip.destination || "trip").replace(/\s+/g, "-").toLowerCase()}-itinerary.ics`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const exportDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
        if (!exportDirectory) throw new Error("No local file directory is available.");
        const baseFileName = safeExportFileName(trip.destination, "ics").replace(/\.ics$/, "");
        const fileUri = `${exportDirectory}${baseFileName}-${Date.now()}.ics`;
        // The timestamp makes this unique. Avoid deleteAsync here because some
        // older iOS Expo clients do not expose it on the FileSystem shim.
        await FileSystem.writeAsStringAsync(fileUri, icsContent, { encoding: FileSystem.EncodingType.UTF8 });
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) throw new Error("The calendar file could not be created.");

        const canShare = typeof Sharing.isAvailableAsync === "function" && await Sharing.isAvailableAsync();
        if (canShare) {
          const shareOptions = {
            mimeType: "text/calendar",
            dialogTitle: `${trip.destination} Calendar`,
            UTI: "com.apple.ical.ics",
          };
          try {
            await Sharing.shareAsync(fileUri, shareOptions);
          } catch (sharingError) {
            if (Platform.OS !== "ios") throw sharingError;
            // Some iOS share extensions reject calendar UTI declarations.
            // The native Share sheet still exposes Save to Files and open-in
            // options for the verified .ics file.
            await Share.share({ url: fileUri, title: `${trip.destination} Calendar` });
          }
        } else {
          Alert.alert("Calendar file ready", "Your itinerary .ics file is ready. Save it to Files, then tap it to import the events into Calendar.");
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
      const html = buildPremiumItineraryHTML(
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
      const baseFileName = safeExportFileName(trip.destination, "pdf").replace(/\.pdf$/, "");
      const exportDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!exportDirectory) throw new Error("No local file directory is available.");
      const fileUri = `${exportDirectory}${baseFileName}-${Date.now()}.pdf`;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.copyAsync({ from: uri, to: fileUri });
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) throw new Error("The PDF file could not be created.");
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        try {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: `${trip.destination} Itinerary`,
            UTI: "com.adobe.pdf",
          });
        } catch (sharingError) {
          if (Platform.OS !== "ios") throw sharingError;
          await Share.share({ url: fileUri, title: `${trip.destination} Itinerary` });
        }
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
          {(() => {
            let fallbackIndex = 0;
            return days.flatMap((day) =>
            day.activities.map((act, i) => {
              const photoQ = act.photoQuery ?? `${act.name} ${trip.destination}`;
              const currentFallbackIndex = fallbackIndex++;
              return (
                <Pressable
                  key={`${day.dayNumber}-${i}`}
                  onPress={() => router.push({
                    pathname: "/activity-detail",
                    params: {
                      name: act.name, description: act.description, time: act.time,
                      tag: act.tag, estimatedCost: String(act.estimatedCost),
                      photoQuery: photoQ, fallbackIndex: String(currentFallbackIndex),
                      lat: String(act.lat ?? ""), lng: String(act.lng ?? ""),
                      city: day.city, fromWish: String(act.fromWish), suggester: act.suggester,
                      matchedVibe: act.matchedVibe ?? "", labels: JSON.stringify(act.labels ?? []),
                    },
                  })}
                  style={({ pressed }) => [styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 }]}
                >
                  <WikiImage
                    name={act.name}
                    context={trip.destination}
                    query={photoQ}
                    fallbackCategory={act.tag}
                    fallbackIndex={currentFallbackIndex}
                    style={styles.infoCardPhoto}
                  />
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
            );
          })()}
        </ScrollView>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === "map" && (() => {
        const allActs = days.flatMap((d) => d.activities.map((a) => ({ name: a.name, city: d.city, lat: a.lat, lng: a.lng })));
        const locationText = (place: { name: string; city: string; lat?: number; lng?: number }) =>
          (place.lat && place.lng && place.lat !== 0) ? `${place.lat},${place.lng}` : `${place.name} ${place.city}`;
        const buildRouteUrl = () => {
          if (allActs.length === 0) return `https://maps.google.com/?q=${encodeURIComponent(trip.destination)}`;
          const stops = allActs.map((a) =>
            encodeURIComponent(locationText(a))
          );
          if (stops.length === 1) return `https://www.google.com/maps/search/?api=1&query=${stops[0]}`;
          return `https://www.google.com/maps/dir/${stops.join("/")}`;
        };
        const buildGoogleMapsAppUrl = (places: typeof allActs) => {
          const destinations = places.map(locationText);
          if (!destinations.length) return `comgooglemaps://?q=${encodeURIComponent(trip.destination)}`;
          if (destinations.length === 1) return `comgooglemaps://?q=${encodeURIComponent(destinations[0])}`;
          return `comgooglemaps://?daddr=${encodeURIComponent(destinations.join("+to:"))}&directionsmode=driving`;
        };
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: bottomInset + 100 }}
          >
            {/* Hero CTA */}
            <Pressable
              onPress={() => openGoogleMaps(buildGoogleMapsAppUrl(allActs), buildRouteUrl())}
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
                      const places = day.activities.map((a) => ({ name: a.name, city: day.city, lat: a.lat, lng: a.lng }));
                      const stops = places.map((place) => encodeURIComponent(locationText(place)));
                      const browserUrl = stops.length <= 1
                        ? `https://www.google.com/maps/search/?api=1&query=${stops[0] ?? encodeURIComponent(day.city)}`
                        : `https://www.google.com/maps/dir/${stops.join("/")}`;
                      void openGoogleMaps(buildGoogleMapsAppUrl(places), browserUrl);
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

        {tripEnded && isMember ? (
          <Pressable
            testID="itinerary-memory-guide"
            onPress={() => router.push(hasReview ? `/memory/${id}` : `/review/${id}`)}
            style={[styles.memoryBanner, { backgroundColor: colors.primary }]}
          >
            <Feather name={hasReview ? "book-open" : "camera"} size={17} color="#fff" />
            <Text style={styles.memoryBannerText}>
              {hasReview ? "Open your trip memory guide" : "Rate the trip, add photos, and make a memory guide"}
            </Text>
            <Feather name="chevron-right" size={17} color="#fff" />
          </Pressable>
        ) : null}

        {days.map((day, dayIndex) => (
          <View key={day.dayNumber} style={styles.dayBlock}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayMeta, { color: colors.mutedForeground }]}>
                Day {day.dayNumber}{getDayDateLabel(trip.startDate, day.dayNumber) ? ` • ${getDayDateLabel(trip.startDate, day.dayNumber)}` : ""}
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
                         fallbackIndex: String(
                           days.slice(0, dayIndex).reduce((total, priorDay) => total + priorDay.activities.length, 0) + i,
                         ),
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
                onPress={() => setAddChoiceDay(day.dayNumber)}
                testID={`add-activity-day-${day.dayNumber}`}
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
              testID="export-calendar"
            >
              <View style={[styles.exportOptIcon, { backgroundColor: "#EBF5FB" }]}>
                <Feather name="calendar" size={20} color="#277DA1" />
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
              testID="export-pdf"
            >
              <View style={[styles.exportOptIcon, { backgroundColor: "#FDF3EF" }]}>
                <Feather name="file-text" size={20} color="#D4573E" />
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
        visible={addChoiceDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAddChoiceDay(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddChoiceDay(null)}>
          <Pressable style={[styles.editSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add to Day {addChoiceDay}</Text>
            <Text style={[styles.exportSubtitle, { color: colors.mutedForeground }]}>
              Enter the details yourself or paste a Google Maps place link.
            </Text>
            <Pressable
              testID="add-activity-manually"
              onPress={() => addChoiceDay && openManualActivity(addChoiceDay)}
              style={({ pressed }) => [
                styles.addMethod,
                { backgroundColor: pressed ? colors.muted : colors.background, borderColor: colors.border },
              ]}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: colors.primary + "14" }]}>
                <Feather name="edit-3" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptTitle, { color: colors.foreground }]}>Type activity details</Text>
                <Text style={[styles.exportOptSub, { color: colors.mutedForeground }]}>Choose the name, time, notes, and cost</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              testID="add-activity-google-maps"
              onPress={() => addChoiceDay && openMapActivity(addChoiceDay)}
              style={({ pressed }) => [
                styles.addMethod,
                { backgroundColor: pressed ? colors.muted : colors.background, borderColor: colors.border },
              ]}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: "#E9F7F2" }]}>
                <Feather name="map-pin" size={20} color="#268B7C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptTitle, { color: colors.foreground }]}>Paste a Google Maps link</Text>
                <Text style={[styles.exportOptSub, { color: colors.mutedForeground }]}>Packyo fills the details and chooses a suitable time</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={mapImport !== null}
        transparent
        animationType="slide"
        onRequestClose={() => !mapImporting && setMapImport(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={0}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              if (!mapImporting) {
                Keyboard.dismiss();
                setMapImport(null);
              }
            }}
          >
            <Pressable style={[styles.editSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Google Maps place</Text>
              <Text style={[styles.exportSubtitle, { color: colors.mutedForeground }]}>
                This place will be added to Day {mapImport?.dayNumber}.
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Google Maps link</Text>
              <TextInput
                testID="google-maps-activity-link"
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="https://maps.app.goo.gl/..."
                value={mapImport?.link ?? ""}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onChangeText={(link) => setMapImport((current) => current ? { ...current, link } : current)}
              />
              {mapImportError ? (
                <Text style={[styles.mapImportError, { color: colors.destructive }]}>{mapImportError}</Text>
              ) : null}
              <View style={styles.sheetBtns}>
                <Pressable
                  onPress={() => setMapImport(null)}
                  disabled={mapImporting}
                  style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  testID="import-google-maps-activity"
                  onPress={handleAddFromMap}
                  disabled={mapImporting}
                  style={[styles.sheetSaveBtn, { backgroundColor: colors.primary, opacity: mapImporting ? 0.65 : 1 }]}
                >
                  {mapImporting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sheetSaveText}>Add activity</Text>}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  memoryBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
  },
  memoryBannerText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff", flex: 1 },
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
  memberPickBadge: {},
  addMethod: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  addMethodIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  mapImportError: { fontFamily: "DmSans_500Medium", fontSize: 12, marginTop: 8 },

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
