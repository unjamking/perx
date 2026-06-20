import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Switch, Modal, TextInput } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt, cleanCategory } from "../theme";
import { ProgressBar, PrimaryButton, Bounce, ScreenFade } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import { useAuth } from "../AuthContext";
import { useLang } from "../i18n";

const CATS = ["Fitness", "Food", "Wellness", "Travel", "Telecom", "Education"];
const CAT_COLORS = ["#215E68", "#5C9396", "#297376", "#013137", "#7fb0b2", "#a6cacb"];

export default function Profile({ navigation }) {
  const cart = useCart();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
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
      <ScreenFade>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={s.header}>
          <View style={s.avatar}><Text style={{ fontSize: 30 }}>{(user?.name?.[0] || "U")}</Text></View>
          <Text style={s.name}>{user?.name || t("account")}</Text>
          <Text style={s.role}>{user?.email}</Text>
        </View>

        {/* budget balance */}
        <View style={s.section}>
          <View style={s.budgetCard}>
            <Text style={s.budgetLabel}>{t("availableBalance")}</Text>
            <Text style={s.budgetBig}>{fmt(cart.left)}</Text>
            <ProgressBar pct={pct} dark />
            <View style={s.budgetRow}>
              <Text style={s.budgetMeta}>{t("spent")} {fmt(cart.budget.spent)}</Text>
              <Text style={s.budgetMeta}>{t("ofAmount")} {fmt(cart.budget.total)}</Text>
            </View>
          </View>
        </View>

        {/* My Benefits — opens the benefits screen (no longer a tab) */}
        <View style={s.section}>
          <Bounce style={s.shareCard} scale={0.98} onPress={() => navigation.navigate("MyBenefits")}>
            <Ionicons name="wallet" size={24} color={C.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.shareTitle}>{t("myBenefits")}</Text>
              <Text style={s.muted}>{t("myBenefitsSub")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
          </Bounce>
        </View>

        {/* Year in Benefits */}
        {summary && (
          <View style={s.section}>
            <Text style={s.h3}>{t("yearInBenefits")}</Text>
            <View style={s.yearCard}>
              <View style={s.yearStats}>
                <Stat n={fmt(summary.totalSpent)} l={t("totalRedeemed")} />
                <Stat n={summary.totalRedeemed} l={t("benefitsUsed")} />
                <Stat n={fmt(summary.taxSaved)} l={t("taxSaved")} />
              </View>
              {summary.topCategory && (
                <Text style={s.yearHighlight}>{t("yourFavorite")}<Text style={{ fontWeight: "800" }}>{cleanCategory(summary.topCategory)}</Text>{summary.favoriteProvider ? ` ${t("atProvider")} ${summary.favoriteProvider}` : ""}</Text>
              )}
              <View style={{ gap: 10, marginTop: 8 }}>
                {summary.byCat.map((c, i) => (
                  <View key={c.category}>
                    <View style={s.catRow}>
                      <Text style={s.catName}>{cleanCategory(c.category)}</Text>
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
          <Bounce style={s.shareCard} scale={0.98} onPress={() => setGiftOpen(true)}>
            <View style={{ flex: 1 }}>
              <Text style={s.shareTitle}>{t("shareCredit")}</Text>
              <Text style={s.muted}>{t("giftCreditSub")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
          </Bounce>
        </View>

        {/* preferences */}
        <View style={s.section}>
          <Text style={s.h3}>{t("categoryPrefs")}</Text>
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

        {/* language */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("language")}</Text>
          <View style={s.langRow}>
            {[["en", t("english")], ["sq", t("albanian")]].map(([code, label]) => (
              <Bounce key={code} onPress={() => setLang(code)} style={[s.langBtn, lang === code && s.langBtnOn]}>
                <Text style={[s.langText, lang === code && { color: "#fff" }]}>{label}</Text>
              </Bounce>
            ))}
          </View>
        </View>

        {/* logout */}
        <View style={s.section}>
          <Bounce style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#b3261e" />
            <Text style={s.logoutText}>{t("logOut")}</Text>
          </Bounce>
        </View>
      </ScrollView>
      </ScreenFade>

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
  const { t } = useLang();
  const [kind, setKind] = useState("credit"); // credit | offer | bundle
  const [to, setTo] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pickId, setPickId] = useState(null); // selected offer or package id
  const [offers, setOffers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    api.offers().then(setOffers);
    api.packages().then(setPackages);
  }, [open]);

  // Cost of the current selection, for the budget check + button label.
  const selOffer = offers.find((o) => o.id === pickId);
  const selPkg = packages.find((p) => p.id === pickId);
  const cost = kind === "credit" ? Number(amount) || 0
    : kind === "offer" ? (selOffer?.price_all || 0)
    : (selPkg?.total_price_all || 0);

  const submit = async () => {
    setErr("");
    if (!to) { setErr(t("pickColleague")); return; }
    if (kind === "credit" && !Number(amount)) { setErr(t("pickColleague")); return; }
    if (kind !== "credit" && !pickId) { setErr(t("giftPickItem")); return; }
    if (cost > left) { setErr(t("exceedsBalance")); return; }
    setSaving(true);
    try {
      const body = { from_employee: EMPLOYEE_ID, to_employee: to, kind, note };
      if (kind === "credit") body.amount_all = Number(amount);
      else if (kind === "offer") body.offer_id = pickId;
      else body.package_id = pickId;
      const res = await api.sendGift(body);
      if (res.error) { setErr(res.error); return; }
      setTo(null); setAmount(""); setNote(""); setPickId(null); setKind("credit"); onDone();
    } catch (e) { setErr(t("failedSend")); } finally { setSaving(false); }
  };

  const KINDS = [["credit", t("giftCredit")], ["offer", t("giftProduct")], ["bundle", t("giftBundle")]];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.h3}>{t("sendAGift")}</Text>
        <Text style={[s.muted, { marginBottom: 12 }]}>{t("yourBalance")} {fmt(left)}</Text>

        {/* gift type */}
        <View style={s.giftKindRow}>
          {KINDS.map(([k, label]) => (
            <Bounce key={k} onPress={() => { setKind(k); setPickId(null); }} style={[s.giftKind, kind === k && s.giftKindOn]}>
              <Text style={[s.giftKindText, kind === k && { color: "#fff" }]}>{label}</Text>
            </Bounce>
          ))}
        </View>

        {/* who */}
        <Text style={s.giftLabel}>{t("giftTo")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {colleagues.map((c) => (
            <Bounce key={c.id} onPress={() => setTo(c.id)} style={[s.colChip, to === c.id && s.colChipOn]}>
              <Text style={[s.colChipText, to === c.id && { color: "#fff" }]}>{c.name}</Text>
            </Bounce>
          ))}
        </ScrollView>

        {/* what */}
        {kind === "credit" && (
          <TextInput style={s.input} placeholder={`${t("amountPh")} (ALL)`} placeholderTextColor={C.textSecondary} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        )}
        {kind === "offer" && (
          <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {offers.map((o) => (
              <Bounce key={o.id} onPress={() => setPickId(o.id)} style={[s.giftItem, pickId === o.id && s.giftItemOn]}>
                <Text style={[s.giftItemTitle, pickId === o.id && { color: "#fff" }]}>{o.category?.split(" ")[0]} {o.title}</Text>
                <Text style={[s.giftItemPrice, pickId === o.id && { color: "#fff" }]}>{fmt(o.price_all)}</Text>
              </Bounce>
            ))}
          </ScrollView>
        )}
        {kind === "bundle" && (
          <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {packages.length === 0 && <Text style={s.muted}>{t("noBundles")}</Text>}
            {packages.map((p) => (
              <Bounce key={p.id} onPress={() => setPickId(p.id)} style={[s.giftItem, pickId === p.id && s.giftItemOn]}>
                <Text style={[s.giftItemTitle, pickId === p.id && { color: "#fff" }]}>{p.title}</Text>
                <Text style={[s.giftItemPrice, pickId === p.id && { color: "#fff" }]}>{fmt(p.total_price_all)}</Text>
              </Bounce>
            ))}
          </ScrollView>
        )}

        <TextInput style={s.input} placeholder={t("addNotePh")} placeholderTextColor={C.textSecondary} value={note} onChangeText={setNote} />
        {err ? <Text style={s.err}>{err}</Text> : null}
        <PrimaryButton label={saving ? t("sending") : `${t("sendGift")}${cost ? ` · ${fmt(cost)}` : ""}`} disabled={saving} onPress={submit} style={{ marginTop: 14 }} />
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
  sectionTitle: { fontWeight: "800", fontSize: 16, color: C.text, marginBottom: 10 },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: { flex: 1, paddingVertical: 12, borderRadius: R.btn, backgroundColor: "#fff", borderWidth: 1, borderColor: C.border, alignItems: "center" },
  langBtnOn: { backgroundColor: C.accent, borderColor: C.accent },
  langText: { color: C.textSecondary, fontWeight: "700" },
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
  giftKindRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  giftKind: { flex: 1, paddingVertical: 10, borderRadius: R.btn, backgroundColor: C.bg, alignItems: "center" },
  giftKindOn: { backgroundColor: C.accent },
  giftKindText: { color: C.accent, fontWeight: "700", fontSize: 13 },
  giftLabel: { color: C.textSecondary, fontWeight: "700", fontSize: 12, marginBottom: 4, marginTop: 4 },
  giftItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderRadius: R.btn, backgroundColor: C.bg },
  giftItemOn: { backgroundColor: C.accent },
  giftItemTitle: { color: C.text, fontWeight: "700", flex: 1 },
  giftItemPrice: { color: C.accent, fontWeight: "800", marginLeft: 8 },
});
