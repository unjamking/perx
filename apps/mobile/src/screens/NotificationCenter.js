import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, R, shadow, fmt } from "../theme";
import { api } from "../api";
import { useLang } from "../i18n";
import { Bounce } from "../components";

const ASYNC_KEY = "perx.last_read_notifications";

export default function NotificationCenter({ navigation }) {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [lastRead, setLastRead] = useState("");

  useEffect(() => {
    async function init() {
      try {
        // Get the last read timestamp
        const stored = await AsyncStorage.getItem(ASYNC_KEY);
        const baseline = stored || "1970-01-01T00:00:00.000Z";
        setLastRead(baseline);

        // Fetch notifications
        const data = await api.notifications();
        setNotifications(data || []);

        // Mark as read immediately in AsyncStorage for future accesses
        await AsyncStorage.setItem(ASYNC_KEY, new Date().toISOString());
      } catch (err) {
        console.error("Error loading notifications:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }} edges={["top"]}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{t("notifications")}</Text>
          <Bounce onPress={() => navigation.goBack()} style={s.closeBtn}>
            <Ionicons name="close" size={22} color={C.textOnDark} />
          </Bounce>
        </View>

        {/* Content */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="notifications-off-outline" size={64} color={C.textSecondary} style={{ marginBottom: 12, opacity: 0.7 }} />
            <Text style={s.emptyText}>{t("noNotifications")}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => {
              const isNew = item.created_at > lastRead;
              return (
                <NotificationCard key={item.id} item={item} isNew={isNew} t={t} />
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function NotificationCard({ item, isNew, t }) {
  let cardBg = "#fff";
  let borderColor = C.border;
  let accentColor = C.accent;
  let iconName = "notifications-outline";
  
  if (item.type === "gift") {
    cardBg = "#F5F3FF"; // Soft purple
    borderColor = "#D8B4FE"; // Purple border
    accentColor = "#7C3AED"; // Purple accent
    iconName = "gift-outline";
  } else if (item.type === "selection_status") {
    const isApproved = item.status === "approved";
    cardBg = isApproved ? "#F0FDF4" : "#FEF2F2"; // Soft green or soft red
    borderColor = isApproved ? "#A7F3D0" : "#FCA5A5";
    accentColor = isApproved ? "#059669" : "#DC2626";
    iconName = isApproved ? "checkmark-circle-outline" : "close-circle-outline";
  } else if (item.type === "flash_drop") {
    cardBg = "#FFFBEB"; // Soft yellow
    borderColor = "#FDE68A";
    accentColor = "#D97706";
    iconName = "flash-outline";
  } else if (item.type === "discount") {
    cardBg = "#EFF6FF"; // Soft blue
    borderColor = "#BFDBFE";
    accentColor = "#2563EB";
    iconName = "pricetag-outline";
  }

  return (
    <View style={[s.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={s.cardHeader}>
        <View style={s.iconTitleContainer}>
          <View style={[s.iconBox, { backgroundColor: cardBg, borderColor: accentColor, borderWidth: 1 }]}>
            <Ionicons name={iconName} size={18} color={accentColor} />
          </View>
          <Text style={[s.cardTitle, { color: C.text }]}>{item.title}</Text>
        </View>
        {isNew && (
          <View style={s.newBadge}>
            <Text style={s.newBadgeText}>{t("newNotification")}</Text>
          </View>
        )}
      </View>

      <Text style={s.cardBody}>{item.body}</Text>
      
      {/* If it's a gift with a note, render the note beautifully in an italicized container */}
      {item.type === "gift" && item.note && (
        <View style={s.noteContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#7C3AED" style={{ marginRight: 6 }} />
          <Text style={s.noteText}>{item.note}</Text>
        </View>
      )}

      {item.created_at && (
        <Text style={s.timeText}>
          {new Date(item.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.dark,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    color: C.textOnDark,
    fontSize: 20,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    color: C.textSecondary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: R.card,
    borderWidth: 1,
    padding: 16,
    ...shadow,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  newBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardBody: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
    fontWeight: "500",
  },
  noteContainer: {
    marginTop: 10,
    backgroundColor: "rgba(124, 58, 237, 0.05)",
    borderLeftWidth: 3,
    borderLeftColor: "#7C3AED",
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    fontStyle: "italic",
    color: "#5B21B6",
    lineHeight: 18,
  },
  timeText: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 10,
    alignSelf: "flex-end",
    fontWeight: "500",
    opacity: 0.8,
  },
});
