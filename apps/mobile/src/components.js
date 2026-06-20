import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt } from "./theme";

export function Tag({ label, dark }) {
  return (
    <View style={[s.tag, dark && { backgroundColor: C.accent }]}>
      <Text style={[s.tagText, dark && { color: "#fff" }]}>{label}</Text>
    </View>
  );
}

const today = new Date().toISOString().slice(0, 10);

// Revolutionary offer card: gradient accent, discount strike-through, deal countdown, save heart.
export function OfferCard({ offer, onAdd, onSave, saved, onSubscribe, subscribed, full }) {
  const emoji = offer.provider_emoji || offer.category.split(" ")[0];
  const dealLive = offer.deal_ends && offer.deal_ends >= today;
  const final = offer.discount_pct ? Math.round(offer.price_all * (1 - offer.discount_pct / 100)) : offer.price_all;
  return (
    <View style={[s.card, full && { flex: undefined, width: "100%" }]}>
      <View style={s.cardTop}>
        <View style={s.emojiCircle}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          {onSubscribe && (
            <Pressable onPress={() => onSubscribe(offer.id)} hitSlop={10}>
              <Ionicons name={subscribed ? "sync-circle" : "sync-circle-outline"} size={24} color={subscribed ? C.accent : C.textSecondary} />
            </Pressable>
          )}
          {onSave && (
            <Pressable onPress={() => onSave(offer.id)} hitSlop={10}>
              <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={saved ? "#e0537b" : C.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>
      <View style={s.badgeRow}>
        <Tag label={offer.category} />
        {offer.discount_pct ? <View style={s.dealTag}><Text style={s.dealTagText}>-{offer.discount_pct}%</Text></View> : null}
      </View>
      <Text style={s.provider} numberOfLines={1}>{offer.provider}</Text>
      <Text style={s.title} numberOfLines={2}>{offer.title}</Text>
      {dealLive && <Text style={s.dealEnds}>⏰ Ends {offer.deal_ends}</Text>}
      <View style={s.cardFoot}>
        <View>
          {offer.discount_pct ? <Text style={s.strike}>{fmt(offer.price_all)}</Text> : null}
          <Text style={s.price}>{fmt(final)}</Text>
        </View>
        <Pressable style={s.addBtn} onPress={() => onAdd(offer)} hitSlop={8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PrimaryButton({ label, onPress, style, disabled, icon }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.primary, style, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
      {icon ? <Ionicons name={icon} size={16} color="#fff" style={{ marginRight: 6 }} /> : null}
      <Text style={s.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      {action ? <Pressable onPress={onAction}><Text style={s.sectionAction}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function ProgressBar({ pct, dark }) {
  return (
    <View style={[s.track, dark && { backgroundColor: "rgba(193,217,222,0.2)" }]}>
      <View style={[s.fill, { width: `${Math.min(100, pct)}%` }, dark && { backgroundColor: C.surface }]} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 14, gap: 5,
    borderWidth: 1, borderColor: C.border, ...shadow, flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  emojiCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  badgeRow: { flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" },
  tag: { alignSelf: "flex-start", backgroundColor: C.bg, borderRadius: R.tag, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: C.accent, fontWeight: "700", fontSize: 11 },
  dealTag: { backgroundColor: "#e0537b", borderRadius: R.tag, paddingHorizontal: 8, paddingVertical: 3 },
  dealTagText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  provider: { color: C.textSecondary, fontWeight: "600", fontSize: 12 },
  title: { color: C.text, fontWeight: "700", fontSize: 14, minHeight: 36 },
  dealEnds: { color: "#e0537b", fontSize: 11, fontWeight: "600" },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 8 },
  strike: { color: C.textSecondary, fontSize: 11, textDecorationLine: "line-through" },
  price: { color: C.accent, fontWeight: "800", fontSize: 14 },
  addBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 11, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 1 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  primary: { backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontWeight: "800", fontSize: 18, color: C.text },
  sectionAction: { color: C.accent, fontWeight: "700", fontSize: 13 },
  track: { height: 8, backgroundColor: C.border, borderRadius: 99, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: C.accent, borderRadius: 99 },
});
