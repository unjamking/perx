import { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, R, shadow, fmt } from "../theme";
import { api, EMPLOYEE_ID } from "../api";

const BADGE = {
  pending: { bg: "#C1D9DE", fg: "#297376" },
  approved: { bg: "#d6ece9", fg: "#215E68" },
  rejected: { bg: "#f7dada", fg: "#b3261e" },
};

export default function Requests() {
  const [rows, setRows] = useState([]);
  useFocusEffect(useCallback(() => { api.selections(EMPLOYEE_ID).then(setRows); }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <Text style={s.h3}>My Requests</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={<Text style={s.muted}>No requests yet.</Text>}
        renderItem={({ item, index }) => {
          const b = BADGE[item.status] || BADGE.pending;
          return (
            <Animated.View entering={FadeInUp.delay(index * 50)} style={s.card}>
              <View style={s.row}>
                <Text style={{ fontWeight: "700" }}>{fmt(item.total_amount)}</Text>
                <View style={[s.badge, { backgroundColor: b.bg }]}>
                  <Text style={{ color: b.fg, fontWeight: "700", fontSize: 12, textTransform: "capitalize" }}>{item.status}</Text>
                </View>
              </View>
              <Text style={[s.muted, { marginTop: 6 }]}>{item.items.map((i) => i.title).join(", ")}</Text>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h3: { fontWeight: "800", fontSize: 20, color: C.text, paddingHorizontal: 16, paddingTop: 8 },
  muted: { color: C.textSecondary, fontSize: 13 },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
});
