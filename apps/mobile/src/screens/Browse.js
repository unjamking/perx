import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Modal, FlatList,
} from "react-native";
import Animated, { FadeInUp, SlideInDown, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "../theme";
import { OfferCard, PrimaryButton, Tag } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";

const CATS = ["All", "💪", "🍽️", "🧘", "✈️", "📱", "📚"];

export default function Browse() {
  const cart = useCart();
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [cat, setCat] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    api.offers().then(setOffers);
    api.packages().then(setPackages);
    api.employees().then((all) => {
      const me = all.find((e) => e.id === EMPLOYEE_ID);
      if (me) cart.setBudget({ total: me.budget_total, spent: me.budget_spent });
    });
  }, []);

  const filtered = cat === "All" ? offers : offers.filter((o) => o.category.startsWith(cat));
  const rows = [];
  for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={s.topbar}>
        <Text style={s.hi}>Hi Arta 👋</Text>
        <View style={s.budgetPill}><Text style={s.budgetText}>{fmt(cart.left)} left</Text></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* category tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {CATS.map((t) => {
            const on = cat === t;
            return (
              <Pressable key={t} onPress={() => setCat(t)} style={[s.tab, on && s.tabOn]}>
                <Text style={[s.tabText, on && { color: "#fff" }]}>{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* packages */}
        {cat === "All" && packages.length > 0 && (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={s.h4}>📦 Bundle Deals</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {packages.map((p) => (
                <View key={p.id} style={[s.pkg]}>
                  <Tag label="Bundle Deal" dark />
                  <Text style={s.pkgTitle}>{p.title}</Text>
                  <Text style={s.muted}>{p.description}</Text>
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

        {/* challenge */}
        {cat === "All" && (
          <View style={{ padding: 16 }}>
            <View style={s.challenge}>
              <Text style={s.challengeTitle}>💪 Wellness Month</Text>
              <Text style={s.challengeSub}>Complete 3 fitness sessions — earn 2,000 ALL each</Text>
              <View style={s.progressTrack}><View style={[s.progressFill, { width: "33%" }]} /></View>
              <Pressable style={s.joinBtn}><Text style={s.joinText}>Join Challenge</Text></Pressable>
            </View>
          </View>
        )}

        {/* offers grid */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {rows.map((row, ri) => (
            <Animated.View key={ri} entering={FadeInUp.delay(ri * 60)} style={{ flexDirection: "row", gap: 12 }}>
              {row.map((o) => <OfferCard key={o.id} offer={o} onAdd={cart.add} />)}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* floating cart */}
      {cart.items.length > 0 && (
        <Animated.View entering={SlideInDown} style={s.floatCart}>
          <Pressable style={s.floatCartBtn} onPress={() => setCartOpen(true)}>
            <Text style={s.floatCartText}>🛒 Cart ({cart.items.length}) — {fmt(cart.total)}</Text>
          </Pressable>
        </Animated.View>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </SafeAreaView>
  );
}

function CartSheet({ open, onClose }) {
  const cart = useCart();
  const after = cart.left - cart.total;
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text style={s.h3}>Your Cart</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={C.textSecondary} /></Pressable>
        </View>
        <FlatList
          data={cart.items}
          keyExtractor={(i) => String(i.cartId)}
          ListEmptyComponent={<Text style={s.muted}>Cart is empty.</Text>}
          renderItem={({ item }) => (
            <Animated.View layout={Layout} style={s.cartRow}>
              <Text style={{ fontSize: 22 }}>{item.category.split(" ")[0]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{item.title}</Text>
                <Text style={s.muted}>{item.provider}</Text>
              </View>
              <Text style={s.price}>{fmt(item.price_all)}</Text>
              <Pressable onPress={() => cart.remove(item.cartId)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={C.textSecondary} />
              </Pressable>
            </Animated.View>
          )}
          style={{ maxHeight: 280 }}
        />
        {cart.items.length > 0 && (
          <>
            <View style={s.totalRow}>
              <Text style={s.muted}>Total</Text><Text style={{ fontWeight: "800" }}>{fmt(cart.total)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.muted}>Remaining after</Text>
              <Text style={{ fontWeight: "700", color: after < 0 ? "#b3261e" : C.textSecondary }}>{fmt(after)}</Text>
            </View>
            <PrimaryButton label={after < 0 ? "Over budget" : "Request Approval →"} disabled={after < 0}
              style={{ marginTop: 14 }}
              onPress={async () => { await cart.submit(); onClose(); }} />
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  hi: { fontSize: 22, fontWeight: "800", color: C.text },
  budgetPill: { backgroundColor: C.accent, borderRadius: R.tag, paddingHorizontal: 14, paddingVertical: 6 },
  budgetText: { color: "#fff", fontWeight: "700" },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
  tabOn: { backgroundColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: "600" },
  h4: { fontWeight: "700", color: C.text, marginBottom: 8 },
  h3: { fontWeight: "800", fontSize: 18, color: C.text },
  muted: { color: C.textSecondary, fontSize: 13 },
  pkg: { width: 230, backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.surface, ...shadow, gap: 6 },
  pkgTitle: { fontWeight: "800", color: C.text, marginTop: 6 },
  pkgFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  price: { color: C.accent, fontWeight: "800" },
  addBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  challenge: { backgroundColor: C.dark, borderRadius: R.card, padding: 16 },
  challengeTitle: { color: C.textOnDark, fontWeight: "800" },
  challengeSub: { color: C.textOnDark, opacity: 0.85, fontSize: 13, marginVertical: 8 },
  progressTrack: { height: 8, backgroundColor: "rgba(193,217,222,0.2)", borderRadius: 99, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: C.surface },
  joinBtn: { backgroundColor: C.surface, borderRadius: R.btn, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  joinText: { color: "#fff", fontWeight: "700" },
  floatCart: { position: "absolute", bottom: 20, left: 0, right: 0, alignItems: "center" },
  floatCartBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 22, paddingVertical: 14, ...shadow },
  floatCartText: { color: "#fff", fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(1,49,55,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cartRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
});
