import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform, Modal } from "react-native";
import Animated, { FadeInUp, FadeIn, SlideInDown, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { C, R, shadow, fmt } from "../theme";
import { OfferCard, Bounce, ScreenFade } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import CartSheet from "../CartSheet";
import { useLang } from "../i18n";

// Map only on native — react-native-maps has no web build.
let MapView, Marker;
if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
}

const CATS = ["All", "💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];
const MODES = ["forYou", "browse", "nearby"];

export default function Explore({ navigation }) {
  const cart = useCart();
  const { t } = useLang();
  const [mode, setMode] = useState("forYou");
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => { api.offers().then(setOffers); api.packages().then(setPackages); }, []);

  const filtered = offers.filter((o) =>
    (cat === "All" || o.category === cat) &&
    `${o.title} ${o.provider} ${o.category}`.toLowerCase().includes(q.toLowerCase()));
  const rows = [];
  for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScreenFade>
      <Text style={s.h1}>{t("explore")}</Text>

      {/* search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={C.textSecondary} />
        <TextInput style={s.search} placeholder={t("search_ph")} placeholderTextColor={C.textSecondary}
          value={q} onChangeText={setQ} />
      </View>

      {/* mode switch — only 3, fit on one row, no scroll */}
      <View style={s.modeTabs}>
        {MODES.map((m) => (
          <Bounce key={m} onPress={() => setMode(m)} style={[s.modeTab, mode === m && s.modeTabOn]}>
            <Text style={[s.modeText, mode === m && { color: "#fff" }]}>{t(m)}</Text>
          </Bounce>
        ))}
      </View>

      {mode === "forYou" && <Animated.View key="forYou" entering={FadeIn.duration(420)} style={{ flex: 1 }}><ForYou cart={cart} /></Animated.View>}

      {mode === "nearby" && <Animated.View key="nearby" entering={FadeIn.duration(420)} style={{ flex: 1 }}><Nearby cart={cart} /></Animated.View>}

      {mode === "browse" && (
        <Animated.View key="browse" entering={FadeIn.duration(420)} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {CATS.map((ct) => {
              const on = cat === ct;
              return (
                <Bounce key={ct} onPress={() => setCat(ct)} style={[s.tab, on && s.tabOn]}>
                  <Text style={[s.tabText, on && { color: "#fff" }]}>{ct === "All" ? "All" : ct}</Text>
                </Bounce>
              );
            })}
          </ScrollView>

          {cat === "All" && q === "" && packages.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={s.h4}>{t("bundleDeals")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {packages.map((p) => (
                  <View key={p.id} style={s.pkg}>
                    <View style={s.pkgTag}><Text style={s.pkgTagText}>Bundle</Text></View>
                    <Text style={s.pkgTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={[s.muted, { minHeight: 34 }]} numberOfLines={2}>{p.description}</Text>
                    <View style={s.pkgFoot}>
                      <Text style={s.price}>{fmt(p.total_price_all)}</Text>
                      <Pressable style={s.addBtn} onPress={() => p.offers.forEach(cart.add)}>
                        <Text style={s.addBtnText}>Add</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
            {rows.map((row, ri) => (
              <Animated.View key={ri} layout={Layout.springify()} style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
                {row.map((o) => <OfferCard key={o.id} offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} onSubscribe={cart.toggleSubscribe} subscribed={cart.subscribed.has(o.id)} />)}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </Animated.View>
            ))}
            {filtered.length === 0 && <Text style={[s.muted, { textAlign: "center", padding: 24 }]}>{t("noOffers")}</Text>}
          </View>
        </ScrollView>
        </Animated.View>
      )}

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

// Personalized feed — Wolt-style "for you" landing: hero carousels (Recommended,
// Deals) then a full grid of everything so the page always feels full, never 2 cards.
function ForYou({ cart }) {
  const { t } = useLang();
  const [feed, setFeed] = useState(null);
  const [all, setAll] = useState([]);
  useEffect(() => {
    api.feed(EMPLOYEE_ID).then(setFeed);
    api.offers().then(setAll);
  }, []);

  const cardProps = (o) => ({ offer: o, onAdd: cart.add, onSave: cart.toggleSave,
    saved: cart.saved.has(o.id), onSubscribe: cart.toggleSubscribe, subscribed: cart.subscribed.has(o.id) });

  if (!feed) return <Text style={[s.muted, { textAlign: "center", padding: 24 }]}>{t("loadingPerks")}</Text>;

  const rec = feed.recommended?.length ? feed.recommended : feed.featured || [];
  const deals = feed.deals || [];
  // Trending = most-picked, padded from all offers so the section never feels thin.
  const recIds = new Set([...rec, ...deals].map((o) => o.id));
  const trending = all.filter((o) => !recIds.has(o.id)).slice(0, 10);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      <Carousel title={t("pickedForYou")} offers={rec} cardProps={cardProps} />
      {deals.length > 0 && <Carousel title={t("dealsEnding")} offers={deals} cardProps={cardProps} />}
      <Carousel title={t("trending")} offers={trending} cardProps={cardProps} />
    </ScrollView>
  );
}

// Horizontal scrolling row of offer cards under a section title.
function Carousel({ title, offers, cardProps }) {
  if (!offers.length) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[s.h4, { paddingHorizontal: 16 }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 4, alignItems: "stretch" }}>
        {offers.map((o) => (
          <View key={o.id} style={{ width: 220 }}><OfferCard {...cardProps(o)} /></View>
        ))}
      </ScrollView>
    </View>
  );
}

function dist(a, b, c, d) {
  // Haversine km
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(c - a), dLng = toR(d - b);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a)) * Math.cos(toR(c)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function Nearby({ cart }) {
  const { t } = useLang();
  const [offers, setOffers] = useState([]);
  const [loc, setLoc] = useState(null);
  const [perm, setPerm] = useState(null);
  const [openProvider, setOpenProvider] = useState(null); // provider_id of open sheet

  useEffect(() => {
    api.nearby().then(setOffers);
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPerm(status);
      if (status === "granted") {
        const p = await Location.getCurrentPositionAsync({});
        let { latitude: lat, longitude: lng } = p.coords;
        // Simulator has no GPS and defaults to Cupertino/SF. In dev, if we land in
        // North America, fall back to Tirana so the map matches our providers.
        if (__DEV__ && lng < -30) { lat = 41.3275; lng = 19.8187; }
        setLoc({ lat, lng });
      }
    })();
  }, []);

  // Unique providers with coords
  const providers = [];
  const seen = new Set();
  for (const o of offers) {
    if (!seen.has(o.provider_id) && o.lat) { seen.add(o.provider_id); providers.push(o); }
  }
  const withDist = providers.map((p) => ({ ...p, km: loc ? dist(loc.lat, loc.lng, p.lat, p.lng) : null }))
    .sort((a, b) => (a.km ?? 999) - (b.km ?? 999));

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
      {MapView && loc && (
        <View style={s.mapWrap}>
          <MapView style={{ flex: 1 }} initialRegion={{ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
            <Marker coordinate={{ latitude: loc.lat, longitude: loc.lng }} title="You" pinColor={C.accent} />
            {providers.map((p) => (
              <Marker key={p.provider_id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.provider} description={p.address} />
            ))}
          </MapView>
        </View>
      )}
      {perm === "denied" && <Text style={[s.muted, { padding: 16 }]}>{t("locationOff")}</Text>}
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {withDist.map((p, pi) => {
          const count = offers.filter((o) => o.provider_id === p.provider_id).length;
          return (
            <Animated.View key={p.provider_id} layout={Layout.springify()}>
            <Bounce style={s.nearRow} scale={0.97} onPress={() => setOpenProvider(p.provider_id)}>
              <Text style={{ fontSize: 28 }}>{p.provider_emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text }}>{p.provider}</Text>
                <Text style={s.muted}>📍 {p.address}</Text>
                {p.km != null && <Text style={s.distChip}>{p.km.toFixed(1)} {t("kmAway")}</Text>}
              </View>
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={s.offerCount}>{count} {count === 1 ? t("perk") : t("perks")}</Text>
                <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
              </View>
            </Bounce>
            </Animated.View>
          );
        })}
      </View>

      <ProviderSheet
        provider={withDist.find((p) => p.provider_id === openProvider)}
        offers={offers.filter((o) => o.provider_id === openProvider)}
        cart={cart}
        onClose={() => setOpenProvider(null)}
      />
    </ScrollView>
  );
}

// Bottom sheet: a single provider's offers, opened by tapping a Nearby row.
function ProviderSheet({ provider, offers, cart, onClose }) {
  const { t } = useLang();
  if (!provider) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Text style={{ fontSize: 30 }}>{provider.provider_emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.sheetTitle}>{provider.provider}</Text>
            <Text style={s.muted}>📍 {provider.address}{provider.km != null ? ` · ${provider.km.toFixed(1)} km` : ""}</Text>
          </View>
        </View>
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
          {offers.map((o) => (
            <View key={o.id} style={s.sheetOffer}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: C.text }}>{o.title}</Text>
                <Text style={s.price}>{fmt(o.price_all)}</Text>
              </View>
              <Bounce style={s.addBtn} onPress={() => cart.add(o)}><Text style={s.addBtnText}>{t("add")}</Text></Bounce>
            </View>
          ))}
          {offers.length === 0 && <Text style={[s.muted, { textAlign: "center", padding: 16 }]}>{t("noOffersNow")}</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: C.text, paddingHorizontal: 16, paddingTop: 8 },
  h4: { fontWeight: "700", color: C.text, marginBottom: 8 },
  muted: { color: C.textSecondary, fontSize: 13 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 10, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  search: { flex: 1, color: C.text },
  modeTabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  modeTab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, justifyContent: "center" },
  modeTabOn: { backgroundColor: C.dark, borderColor: C.dark },
  modeText: { color: C.textSecondary, fontWeight: "700", lineHeight: 20, includeFontPadding: false },
  tabs: { gap: 8, paddingLeft: 16, paddingRight: 24, paddingVertical: 6, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: "600", fontSize: 13 },
  pkg: { width: 230, backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.surface, ...shadow, gap: 6 },
  pkgTag: { alignSelf: "flex-start", backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  pkgTagText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  pkgTitle: { fontWeight: "800", color: C.text, marginTop: 6 },
  pkgFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  price: { color: C.accent, fontWeight: "800" },
  addBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  mapWrap: { height: 240, marginHorizontal: 16, marginBottom: 12, borderRadius: R.card, overflow: "hidden", ...shadow },
  nearRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: R.card, padding: 14, borderWidth: 1, borderColor: C.border, ...shadow },
  distChip: { color: C.accent, fontWeight: "700", fontSize: 12, marginTop: 2 },
  offerCount: { color: C.textSecondary, fontWeight: "700", fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: "rgba(1,49,55,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 99, backgroundColor: C.border, marginBottom: 14 },
  sheetTitle: { fontWeight: "800", fontSize: 18, color: C.text },
  sheetOffer: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.bg, borderRadius: R.card, padding: 14, borderWidth: 1, borderColor: C.border },
  floatCart: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  floatCartBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 22, paddingVertical: 14, ...shadow, flexDirection: "row", alignItems: "center", gap: 8 },
  floatCartText: { color: "#fff", fontWeight: "800" },
});
