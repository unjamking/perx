import { View, Text, Pressable, StyleSheet } from "react-native";
import { C, R, shadow, fmt } from "./theme";

export function Tag({ label, dark }) {
  return (
    <View style={[s.tag, dark && { backgroundColor: C.accent }]}>
      <Text style={[s.tagText, dark && { color: "#fff" }]}>{label}</Text>
    </View>
  );
}

export function OfferCard({ offer, onAdd }) {
  const emoji = offer.category.split(" ")[0];
  return (
    <View style={s.card}>
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <Tag label={offer.category} />
      <Text style={s.provider}>{offer.provider}</Text>
      <Text style={s.title}>{offer.title}</Text>
      <View style={s.cardFoot}>
        <Text style={s.price}>{fmt(offer.price_all)}</Text>
        <Pressable style={s.addBtn} onPress={() => onAdd(offer)} hitSlop={8}>
          <Text style={s.addBtnText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PrimaryButton({ label, onPress, style, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.primary, style, disabled && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}>
      <Text style={s.primaryText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 14, gap: 6,
    borderWidth: 1, borderColor: C.border, ...shadow, flex: 1 },
  tag: { alignSelf: "flex-start", backgroundColor: C.bg, borderRadius: R.tag, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { color: C.accent, fontWeight: "700", fontSize: 12 },
  provider: { color: C.textSecondary, fontWeight: "600", fontSize: 12 },
  title: { color: C.text, fontWeight: "700", fontSize: 14 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  price: { color: C.accent, fontWeight: "800" },
  addBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: "#fff", fontWeight: "700" },
  primary: { backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
