import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform } from "react-native";
import Animated, { FadeInUp, SlideInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { C, R, shadow, fmt } from "../theme";
import { OfferCard } from "../components";
import { api } from "../api";
import { useCart } from "../CartContext";
import CartSheet from "../CartSheet";

// Map only on native — react-native-maps has no web build.
let MapView, Marker;
if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
}

const CATS = ["All", "💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];
const MODES = ["Browse", "Nearby", "Concierge"];

export default function Explore({ navigation }) {
  const cart = useCart();
  const [mode, setMode] = useState("Browse");
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
      <Text style={s.h1}>Explore</Text>

      {/* search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={C.textSecondary} />
        <TextInput style={s.search} placeholder="Search benefits, providers…" placeholderTextColor={C.textSecondary}
          value={q} onChangeText={setQ} />
      </View>

      {/* mode switch */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modeTabs}>
        {MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[s.modeTab, mode === m && s.modeTabOn]}>
            <Text style={[s.modeText, mode === m && { color: "#fff" }]}>{m}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {mode === "Concierge" && <ConciergeCTA navigation={navigation} />}

      {mode === "Nearby" && <Nearby cart={cart} />}

      {mode === "Browse" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {CATS.map((t) => {
              const on = cat === t;
              return (
                <Pressable key={t} onPress={() => setCat(t)} style={[s.tab, on && s.tabOn]}>
                  <Text style={[s.tabText, on && { color: "#fff" }]}>{t === "All" ? "All" : t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {cat === "All" && q === "" && packages.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={s.h4}>📦 Bundle Deals</Text>
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
              <Animated.View key={ri} entering={FadeInUp.delay(ri * 50)} style={{ flexDirection: "row", gap: 12, alignItems: "stretch" }}>
                {row.map((o) => <OfferCard key={o.id} offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} onSubscribe={cart.toggleSubscribe} subscribed={cart.subscribed.has(o.id)} />)}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </Animated.View>
            ))}
            {filtered.length === 0 && <Text style={[s.muted, { textAlign: "center", padding: 24 }]}>No offers match.</Text>}
          </View>
        </ScrollView>
      )}

      {cart.items.length > 0 && mode !== "Concierge" && (
        <Animated.View entering={SlideInDown} style={s.floatCart}>
          <Pressable style={s.floatCartBtn} onPress={() => setCartOpen(true)}>
            <Ionicons name="cart" size={18} color="#fff" />
            <Text style={s.floatCartText}>Cart ({cart.items.length}) — {fmt(cart.total)}</Text>
          </Pressable>
        </Animated.View>
      )}
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </SafeAreaView>
  );
}

function ConciergeCTA({ navigation }) {
  return (
    <View style={{ padding: 16 }}>
      <Animated.View entering={FadeInUp} style={s.conciergeCard}>
        <Text style={{ fontSize: 40 }}>✨</Text>
        <Text style={s.conciergeTitle}>AI Concierge</Text>
        <Text style={s.conciergeSub}>Tell me what you need — relaxing, fitness, food — and your budget. I'll find the perfect perks.</Text>
        <Pressable style={s.conciergeBtn} onPress={() => navigation.navigate("Concierge")}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={s.conciergeBtnText}>Start chatting</Text>
        </Pressable>
      </Animated.View>
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
  const [offers, setOffers] = useState([]);
  const [loc, setLoc] = useState(null);
  const [perm, setPerm] = useState(null);

  useEffect(() => {
    api.nearby().then(setOffers);
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPerm(status);
      if (status === "granted") {
        const p = await Location.getCurrentPositionAsync({});
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
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
      {perm === "denied" && <Text style={[s.muted, { padding: 16 }]}>Location off — showing all Tirana providers. Enable location for distances.</Text>}
      <View style={{ paddingHorizontal: 16, gap: 12 }}>
        {withDist.map((p) => (
          <View key={p.provider_id} style={s.nearRow}>
            <Text style={{ fontSize: 28 }}>{p.provider_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: C.text }}>{p.provider}</Text>
              <Text style={s.muted}>📍 {p.address}</Text>
              {p.km != null && <Text style={s.distChip}>{p.km.toFixed(1)} km away</Text>}
            </View>
            <Pressable style={s.addBtn} onPress={() => cart.add(p)}><Text style={s.addBtnText}>Add</Text></Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: C.text, paddingHorizontal: 16, paddingTop: 8 },
  h4: { fontWeight: "700", color: C.text, marginBottom: 8 },
  muted: { color: C.textSecondary, fontSize: 13 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", marginHorizontal: 16, marginTop: 10, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  search: { flex: 1, color: C.text },
  modeTabs: { gap: 8, paddingLeft: 16, paddingRight: 24, paddingVertical: 10, alignItems: "center" },
  modeTab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  modeTabOn: { backgroundColor: C.dark, borderColor: C.dark },
  modeText: { color: C.textSecondary, fontWeight: "700" },
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
  conciergeCard: { backgroundColor: C.dark, borderRadius: R.card, padding: 24, alignItems: "center", gap: 8, ...shadow },
  conciergeTitle: { color: "#fff", fontWeight: "800", fontSize: 20 },
  conciergeSub: { color: C.textOnDark, opacity: 0.85, textAlign: "center", fontSize: 13, lineHeight: 19 },
  conciergeBtn: { backgroundColor: C.surface, borderRadius: R.btn, paddingHorizontal: 22, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  conciergeBtnText: { color: "#fff", fontWeight: "800" },
  mapWrap: { height: 240, marginHorizontal: 16, marginBottom: 12, borderRadius: R.card, overflow: "hidden", ...shadow },
  nearRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: R.card, padding: 14, borderWidth: 1, borderColor: C.border, ...shadow },
  distChip: { color: C.accent, fontWeight: "700", fontSize: 12, marginTop: 2 },
  floatCart: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  floatCartBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 22, paddingVertical: 14, ...shadow, flexDirection: "row", alignItems: "center", gap: 8 },
  floatCartText: { color: "#fff", fontWeight: "800" },
});
