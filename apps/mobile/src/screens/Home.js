import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp, SlideInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "../theme";
import { OfferCard, SectionHeader, ScreenFade } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import CartSheet from "../CartSheet";
import { useLang } from "../i18n";
import { useAuth } from "../AuthContext";

export default function Home({ navigation }) {
  const cart = useCart();
  const { t } = useLang();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "";
  const [feed, setFeed] = useState({ featured: [], deals: [], recommended: [] });
  const [notifs, setNotifs] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    api.feed(EMPLOYEE_ID).then(setFeed);
    api.notifications().then(setNotifs);
    cart.refreshBudget();
  }, []));

  const liveNotifs = notifs.filter((n) => n.live);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScreenFade>
      <View style={s.topbar}>
        <View>
          <Text style={s.hi}>{t("hi")} {firstName} 👋</Text>
          <Text style={s.sub}>{t("welcomeBack")}</Text>
        </View>
        <View style={s.budgetPill}>
          <Text style={s.budgetLabel}>{t("budgetLeft")}</Text>
          <Text style={s.budgetText}>{fmt(cart.left)}</Text>
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

        {/* Recommended */}
        {feed.recommended.length > 0 && (
          <View style={s.section}>
            <SectionHeader title={feed.topCategory ? `${t("forYouCat")} · ${feed.topCategory}` : t("recommended")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {feed.recommended.map((o) => (
                <View key={o.id} style={{ width: 200 }}>
                  <OfferCard offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} full />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured hero */}
        {feed.featured.map((o) => (
          <View key={o.id} style={s.section}>
            <View style={s.hero}>
              <Text style={s.heroBadge}>{t("featured")}</Text>
              <Text style={s.heroTitle}>{o.title}</Text>
              <Text style={s.heroSub}>{o.provider} · {o.category}</Text>
              <View style={s.heroFoot}>
                <Text style={s.heroPrice}>{fmt(o.price_all)}</Text>
                <Pressable style={s.heroBtn} onPress={() => cart.add(o)}>
                  <Text style={s.heroBtnText}>{t("addToCart")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

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

      {cart.items.length > 0 && (
        <Animated.View entering={SlideInDown} style={s.floatCart}>
          <Pressable style={s.floatCartBtn} onPress={() => setCartOpen(true)}>
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={s.floatCartText}>{t("cart")} ({cart.items.length}) — {fmt(cart.total)}</Text>
          </Pressable>
        </Animated.View>
      )}
      </ScreenFade>
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  hi: { fontSize: 24, fontWeight: "800", color: C.text },
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
