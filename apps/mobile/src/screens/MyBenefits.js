import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp, FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "../theme";
import { OfferCard, PrimaryButton, Bounce, ScreenFade } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import { useLang } from "../i18n";

const TABS = ["active", "pending", "history", "saved", "recurring"];
const BADGE = {
  pending: { bg: "#C1D9DE", fg: "#297376" },
  approved: { bg: "#d6ece9", fg: "#215E68" },
  rejected: { bg: "#f7dada", fg: "#b3261e" },
};

export default function MyBenefits({ navigation }) {
  const cart = useCart();
  const { t } = useLang();
  const [tab, setTab] = useState("active");
  const [rows, setRows] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [redeemed, setRedeemed] = useState([]);
  const [subs, setSubs] = useState([]);
  const [reviewFor, setReviewFor] = useState(null);

  const load = useCallback(() => {
    api.selections(EMPLOYEE_ID).then(setRows);
    api.bookmarks(EMPLOYEE_ID).then(setBookmarks);
    api.redeemed(EMPLOYEE_ID).then(setRedeemed);
    api.subscriptions(EMPLOYEE_ID).then(setSubs);
  }, []);
  useFocusEffect(load);

  const cancelSub = async (id) => { await api.unsubscribe(id); load(); };

  const active = rows.filter((r) => r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScreenFade>
      <View style={s.topRow}>
        <Bounce onPress={() => navigation.goBack()} hitSlop={10} scale={0.85} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={C.text} />
        </Bounce>
        <Text style={s.h1}>{t("myBenefits")}</Text>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map((tk) => (
            <Bounce key={tk} onPress={() => setTab(tk)} style={[s.tab, tab === tk && s.tabOn]}>
              <Text style={[s.tabText, tab === tk && { color: "#fff" }]}>{t(tk)}</Text>
            </Bounce>
          ))}
        </ScrollView>
      </View>

      <Animated.View key={tab} entering={FadeIn.duration(420)} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {tab === "active" && (active.length ? active.map((r, i) => <ReqCard key={r.id} r={r} i={i} canReview redeemed={redeemed} onReview={setReviewFor} />) : <Empty msg={t("noActive")} />)}
        {tab === "pending" && (pending.length ? pending.map((r, i) => <ReqCard key={r.id} r={r} i={i} />) : <Empty msg={t("noPending")} />)}
        {tab === "history" && (history.length ? history.map((r, i) => <ReqCard key={r.id} r={r} i={i} />) : <Empty msg={t("noHistory")} />)}
        {tab === "saved" && (bookmarks.length ? bookmarks.map((o) => (
          <OfferCard key={o.id} offer={o} onAdd={cart.add} onSave={(id) => cart.toggleSave(id).then(() => api.bookmarks(EMPLOYEE_ID).then(setBookmarks))} saved full />
        )) : <Empty msg={t("noSaved")} />)}
        {tab === "recurring" && (subs.filter((x) => x.active).length ? subs.filter((x) => x.active).map((sub) => (
          <View key={sub.id} style={s.subCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.subTitle}>{sub.category?.split(" ")[0]} {sub.title}</Text>
              <Text style={s.muted}>{sub.provider} · {fmt(sub.price_all)}/mo</Text>
              <Text style={s.subNext}>{t("nextRenews")} {sub.next_run}</Text>
            </View>
            <Bounce style={s.cancelBtn} onPress={() => cancelSub(sub.id)}>
              <Text style={s.cancelText}>{t("cancel")}</Text>
            </Bounce>
          </View>
        )) : <Empty msg={t("noRecurring")} />)}
      </ScrollView>
      </Animated.View>
      </ScreenFade>

      <ReviewModal target={reviewFor} onClose={() => setReviewFor(null)} onDone={() => { setReviewFor(null); load(); }} />
    </SafeAreaView>
  );
}

function ReqCard({ r, i, canReview, redeemed = [], onReview }) {
  const { t } = useLang();
  const b = BADGE[r.status] || BADGE.pending;
  // Which items in this request are reviewable (redeemed & not yet reviewed)
  const reviewable = canReview ? r.items.filter((it) => redeemed.find((rd) => rd.id === it.offer_id && !rd.reviewed)) : [];
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={{ fontWeight: "800", fontSize: 16, color: C.text }}>{fmt(r.total_amount)}</Text>
        <View style={[s.badge, { backgroundColor: b.bg }]}>
          <Text style={{ color: b.fg, fontWeight: "700", fontSize: 12 }}>{t("status" + r.status[0].toUpperCase() + r.status.slice(1))}</Text>
        </View>
      </View>
      <Text style={[s.muted, { marginTop: 6 }]}>{r.items.map((it) => it.title).join(", ")}</Text>
      {r.gifted_by_name ? <Text style={s.giftedBadge}>{t("giftedBy")} {r.gifted_by_name}</Text> : null}
      <Text style={[s.muted, { marginTop: 2, fontSize: 11 }]}>{r.created_at?.slice(0, 10)}</Text>
      {reviewable.map((it) => (
        <Pressable key={it.offer_id} style={s.reviewBtn} onPress={() => onReview({ offer_id: it.offer_id, title: it.title })}>
          <Ionicons name="star-outline" size={14} color={C.accent} />
          <Text style={s.reviewBtnText}>{t("rate")} {it.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReviewModal({ target, onClose, onDone }) {
  const { t } = useLang();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  if (!target) return null;
  const submit = async () => {
    setSaving(true);
    try { await api.createReview({ employee_id: EMPLOYEE_ID, offer_id: target.offer_id, rating, comment }); onDone(); setComment(""); setRating(5); }
    catch (e) { console.error(e); } finally { setSaving(false); }
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.h3}>{t("rate")} {target.title}</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
              <Ionicons name={n <= rating ? "star" : "star-outline"} size={34} color="#215E68" />
            </Pressable>
          ))}
        </View>
        <TextInput style={s.input} placeholder={t("shareExperience")} placeholderTextColor={C.textSecondary}
          value={comment} onChangeText={setComment} multiline />
        <PrimaryButton label={saving ? t("posting") : t("postReview")} disabled={saving} onPress={submit} style={{ marginTop: 14 }} />
      </View>
    </Modal>
  );
}

function Empty({ msg }) {
  return <Text style={{ color: C.textSecondary, fontStyle: "italic", textAlign: "center", padding: 30 }}>{msg}</Text>;
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: C.text, paddingTop: 8 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingTop: 4 },
  backBtn: { padding: 4 },
  tabs: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border },
  tabOn: { backgroundColor: C.accent, borderColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: "700", lineHeight: 20, includeFontPadding: false },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: C.textSecondary, fontSize: 13 },
  subCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  subTitle: { fontWeight: "700", color: C.text, fontSize: 15 },
  subNext: { color: C.accent, fontWeight: "600", fontSize: 12, marginTop: 4 },
  cancelBtn: { borderWidth: 1.5, borderColor: "#f7dada", borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 8 },
  cancelText: { color: "#b3261e", fontWeight: "700", fontSize: 13 },
  badge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  giftedBadge: { color: "#a64ca6", fontWeight: "700", fontSize: 12, marginTop: 4 },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", borderWidth: 1.5, borderColor: C.border, borderRadius: R.btn, paddingHorizontal: 12, paddingVertical: 7 },
  reviewBtnText: { color: C.accent, fontWeight: "700", fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: "rgba(1,49,55,0.4)" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 99, backgroundColor: C.border, marginBottom: 14 },
  h3: { fontWeight: "800", fontSize: 18, color: C.text },
  stars: { flexDirection: "row", gap: 8, justifyContent: "center", marginVertical: 18 },
  input: { backgroundColor: "#fff", borderWidth: 2, borderColor: C.border, borderRadius: R.btn, padding: 12, minHeight: 70, color: C.text, textAlignVertical: "top" },
});
