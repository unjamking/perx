import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { C, R, shadow, fmt, cleanCategory } from "../theme";
import { OfferCard, SectionHeader, ScreenFade, CartPill, Bounce } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import CartSheet from "../CartSheet";
import { useLang } from "../i18n";
import { useAuth } from "../AuthContext";

const ASYNC_KEY = "perx.last_read_notifications";

export default function Home({ navigation }) {
  const cart = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";
  const [feed, setFeed] = useState({ featured: [], deals: [], recommended: [] });
  const [notifs, setNotifs] = useState([]);
  const [lastRead, setLastRead] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const reload = useCallback(() => {
    api.feed(EMPLOYEE_ID).then(setFeed);
    api.notifications().then(setNotifs);
    AsyncStorage.getItem(ASYNC_KEY).then((v) => setLastRead(v || "1970-01-01T00:00:00.000Z"));
    cart.refreshBudget();
  }, []);
  useFocusEffect(reload);

  const liveNotifs = notifs.filter((n) => n.live);
  const unreadCount = notifs.filter((n) => n.created_at > lastRead).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScreenFade>
      <View style={s.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={s.hi}>{t("hi")} {firstName}</Text>
          <Text style={s.sub}>{t("welcomeBack")}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Bounce
            style={s.bellBtn}
            scale={0.9}
            onPress={() => navigation.navigate("NotificationCenter")}
          >
            <Ionicons name="notifications-outline" size={22} color={C.accent} />
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Bounce>
          <View style={s.budgetPill}>
            <Text style={s.budgetLabel}>{t("budgetLeft")}</Text>
            <Text style={s.budgetText}>{fmt(cart.left)}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Deal notifications banner */}
        {liveNotifs.length > 0 && (
          <View style={s.notifBanner}>
            <Ionicons name="flash" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={s.notifTitle}>{liveNotifs[0].title}</Text>
              <Text style={s.notifBody} numberOfLines={1}>{liveNotifs[0].body}</Text>
            </View>
            {liveNotifs.length > 1 && <View style={s.notifCount}><Text style={s.notifCountText}>+{liveNotifs.length - 1}</Text></View>}
          </View>
        )}

        {/* Recommended ("For You") */}
        {feed.recommended.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={feed.topCategory ? `${t("forYouCat")} · ${cleanCategory(feed.topCategory)}` : t("recommended")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {feed.recommended.map((o) => (
                <View key={o.id} style={{ width: 200 }}>
                  <OfferCard offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} full />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* New deals */}
        {feed.deals.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={t("newDeals")} action={t("seeAll")} onAction={() => navigation.navigate("Explore")} />
            <View style={{ gap: 12 }}>
              {feed.deals.map((o) => (
                <OfferCard key={o.id} offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} full />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <CartPill onPress={() => setCartOpen(true)} />
      </ScreenFade>
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  hi: { fontSize: 24, fontWeight: "800", color: C.text },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
    ...shadow,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  sub: { color: C.textSecondary, fontSize: 13, marginTop: 2 },
  budgetPill: { backgroundColor: C.accent, borderRadius: R.card, paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-end" },
  budgetLabel: { color: C.textOnDark, fontSize: 10, fontWeight: "600" },
  budgetText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  section: { paddingHorizontal: 16, marginTop: 18 },
  notifBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#e0537b", marginHorizontal: 16, marginTop: 8, borderRadius: R.card, padding: 14, ...shadow },
  notifTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  notifBody: { color: "#fff", opacity: 0.9, fontSize: 12 },
  notifCount: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  notifCountText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  hero: { backgroundColor: C.dark, borderRadius: R.card, padding: 20, ...shadow },
  heroBadge: { color: C.surface, fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 22, marginTop: 8 },
  heroSub: { color: C.textOnDark, opacity: 0.8, fontSize: 13, marginTop: 4 },
  heroFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16 },
  heroPrice: { color: "#fff", fontWeight: "800", fontSize: 20 },
  heroBtn: { backgroundColor: C.surface, borderRadius: R.btn, paddingHorizontal: 18, paddingVertical: 10 },
  heroBtnText: { color: "#fff", fontWeight: "700" },
  floatCart: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  floatCartBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 22, paddingVertical: 14, ...shadow, flexDirection: "row", alignItems: "center", gap: 8 },
  floatCartText: { color: "#fff", fontWeight: "800" },
});
