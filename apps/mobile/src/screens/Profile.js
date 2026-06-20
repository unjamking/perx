import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Modal, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "../theme";
import { ProgressBar, PrimaryButton } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";

const CATS = ["💪 Fitness", "🍽️ Food", "🧘 Wellness", "✈️ Travel", "📱 Telecom", "📚 Education"];
const CAT_COLORS = ["#215E68", "#5C9396", "#297376", "#013137", "#7fb0b2", "#a6cacb"];

export default function Profile() {
  const cart = useCart();
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [colleagues, setColleagues] = useState([]);
  const [prefs, setPrefs] = useState(() => Object.fromEntries(CATS.map((c) => [c, true])));
  const [giftOpen, setGiftOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    api.summary(EMPLOYEE_ID).then(setSummary);
    api.employees().then((all) => setColleagues(all.filter((e) => e.id !== EMPLOYEE_ID)));
    cart.refreshBudget();
  }, []));

  const pct = cart.budget.total ? Math.round((cart.budget.spent / cart.budget.total) * 100) : 0;
  const maxCat = summary?.byCat?.[0]?.total || 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={s.header}>
          <View style={s.avatar}><Text style={{ fontSize: 30 }}>{(user?.name?.[0] || "👤")}</Text></View>
          <Text style={s.name}>{user?.name || "Account"}</Text>
          <Text style={s.role}>{user?.email}</Text>
        </View>

        {/* budget balance */}
        <View style={s.section}>
          <Animated.View entering={FadeInUp} style={s.budgetCard}>
            <Text style={s.budgetLabel}>Available Balance</Text>
            <Text style={s.budgetBig}>{fmt(cart.left)}</Text>
            <ProgressBar pct={pct} dark />
            <View style={s.budgetRow}>
              <Text style={s.budgetMeta}>Spent {fmt(cart.budget.spent)}</Text>
              <Text style={s.budgetMeta}>of {fmt(cart.budget.total)}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Year in Benefits */}
        {summary && (
          <View style={s.section}>
            <Text style={s.h3}>📊 Year in Benefits</Text>
            <View style={s.yearCard}>
              <View style={s.yearStats}>
                <Stat n={fmt(summary.totalSpent)} l="Total redeemed" />
                <Stat n={summary.totalRedeemed} l="Benefits used" />
                <Stat n={fmt(summary.taxSaved)} l="Tax saved" />
              </View>
              {summary.topCategory && (
                <Text style={s.yearHighlight}>Your favorite: <Text style={{ fontWeight: "800" }}>{summary.topCategory}</Text>{summary.favoriteProvider ? ` at ${summary.favoriteProvider}` : ""} 🎉</Text>
              )}
              <View style={{ gap: 10, marginTop: 8 }}>
                {summary.byCat.map((c, i) => (
                  <View key={c.category}>
                    <View style={s.catRow}>
                      <Text style={s.catName}>{c.category}</Text>
                      <Text style={s.catVal}>{fmt(c.total)}</Text>
                    </View>
                    <View style={s.catTrack}>
                      <View style={[s.catFill, { width: `${(c.total / maxCat) * 100}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* share with colleagues */}
        <View style={s.section}>
          <Pressable style={s.shareCard} onPress={() => setGiftOpen(true)}>
            <Text style={{ fontSize: 26 }}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.shareTitle}>Share credit with a colleague</Text>
              <Text style={s.muted}>Gift reward credits to your team</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* preferences */}
        <View style={s.section}>
          <Text style={s.h3}>⚙️ Category Preferences</Text>
          <View style={s.prefCard}>
            {CATS.map((cat) => (
              <View key={cat} style={s.prefRow}>
                <Text style={s.prefLabel}>{cat}</Text>
                <Switch value={prefs[cat]} onValueChange={(v) => setPrefs((p) => ({ ...p, [cat]: v }))}
                  trackColor={{ true: C.accent, false: C.border }} thumbColor="#fff" />
              </View>
            ))}
          </View>
        </View>

        {/* logout */}
        <View style={s.section}>
          <Pressable style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#b3261e" />
            <Text style={s.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <GiftModal open={giftOpen} colleagues={colleagues} left={cart.left}
        onClose={() => setGiftOpen(false)} onDone={() => { setGiftOpen(false); cart.refreshBudget(); }} />
    </SafeAreaView>
  );
}

function Stat({ n, l }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statL}>{l}</Text>
    </View>
  );
}

function GiftModal({ open, colleagues, left, onClose, onDone }) {
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr("");
    const amt = Number(amount);
    if (!to || !amt) { setErr("Pick a colleague and amount"); return; }
    if (amt > left) { setErr("Exceeds your balance"); return; }
    setSaving(true);
    try {
      const res = await api.sendGift({ from_employee: EMPLOYEE_ID, to_employee: to, amount_all: amt, note });
      if (res.error) { setErr(res.error); return; }
      setTo(null); setAmount(""); setNote(""); onDone();
    } catch (e) { setErr("Failed to send"); } finally { setSaving(false); }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.h3}>Gift Credit</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>Your balance: {fmt(left)}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {colleagues.map((c) => (
            <Pressable key={c.id} onPress={() => setTo(c.id)} style={[s.colChip, to === c.id && s.colChipOn]}>
              <Text style={[s.colChipText, to === c.id && { color: "#fff" }]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput style={s.input} placeholder="Amount (ALL)" placeholderTextColor={C.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <TextInput style={s.input} placeholder="Add a note (optional)" placeholderTextColor={C.textSecondary} value={note} onChangeText={setNote} />
        {err ? <Text style={s.err}>{err}</Text> : null}
        <PrimaryButton label={saving ? "Sending…" : "Send Gift 🎁"} disabled={saving} onPress={submit} style={{ marginTop: 14 }} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: { alignItems: "center", paddingTop: 16, paddingBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...shadow },
  name: { fontSize: 22, fontWeight: "800", color: C.text, marginTop: 10 },
  role: { color: C.textSecondary, fontSize: 13 },
  section: { paddingHorizontal: 16, marginTop: 18 },
  h3: { fontWeight: "800", fontSize: 18, color: C.text, marginBottom: 10 },
  muted: { color: C.textSecondary, fontSize: 13 },
  budgetCard: { backgroundColor: C.dark, borderRadius: R.card, padding: 20, gap: 10, ...shadow },
  budgetLabel: { color: C.textOnDark, opacity: 0.8, fontSize: 13 },
  budgetBig: { color: "#fff", fontWeight: "800", fontSize: 32 },
  budgetRow: { flexDirection: "row", justifyContent: "space-between" },
  budgetMeta: { color: C.textOnDark, opacity: 0.8, fontSize: 12 },
  yearCard: { backgroundColor: C.card, borderRadius: R.card, padding: 18, borderWidth: 1, borderColor: C.border, ...shadow, gap: 12 },
  yearStats: { flexDirection: "row" },
  statN: { fontWeight: "800", fontSize: 16, color: C.accent },
  statL: { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: "center" },
  yearHighlight: { color: C.text, fontSize: 14, textAlign: "center" },
  catRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  catName: { color: C.text, fontWeight: "600", fontSize: 13 },
  catVal: { color: C.textSecondary, fontSize: 13 },
  catTrack: { height: 8, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  catFill: { height: "100%", borderRadius: 99 },
  shareCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  shareTitle: { fontWeight: "700", color: C.text, fontSize: 15 },
  prefCard: { backgroundColor: C.card, borderRadius: R.card, padding: 8, borderWidth: 1, borderColor: C.border, ...shadow },
  prefRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 },
  prefLabel: { color: C.text, fontWeight: "600", fontSize: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f7dada", borderRadius: R.btn, paddingVertical: 14 },
  logoutText: { color: "#b3261e", fontWeight: "800", fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: "rgba(1,49,55,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 99, backgroundColor: C.border, marginBottom: 14 },
  colChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, backgroundColor: C.bg },
  colChipOn: { backgroundColor: C.accent },
  colChipText: { color: C.accent, fontWeight: "700" },
  input: { backgroundColor: "#fff", borderWidth: 2, borderColor: C.border, borderRadius: R.btn, padding: 12, color: C.text, marginTop: 12 },
  err: { color: "#b3261e", fontWeight: "600", marginTop: 10 },
});
