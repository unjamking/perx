import { useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, R, shadow, fmt } from "../theme";
import { ProgressBar, Bounce, ScreenFade } from "../components";
import { api, EMPLOYEE_ID } from "../api";
import { useLang } from "../i18n";

export default function Challenges() {
  const { t } = useLang();
  const [challenges, setChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const load = useCallback(() => {
    api.challenges(EMPLOYEE_ID).then(setChallenges);
    api.achievements(EMPLOYEE_ID).then(setAchievements);
  }, []);
  useFocusEffect(load);

  const join = async (id) => { await api.joinChallenge(id, EMPLOYEE_ID); load(); };
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const streak = challenges.filter((c) => c.joined).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <ScreenFade>
      <Text style={s.h1}>{t("challenges")}</Text>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* streak banner */}
        <View style={s.streakCard}>
          <View>
            <Text style={s.streakNum}>🔥 {streak}</Text>
            <Text style={s.streakLabel}>{t("activeChallenges")}</Text>
          </View>
          <View style={s.streakDivider} />
          <View>
            <Text style={s.streakNum}>🏅 {unlocked}/{achievements.length}</Text>
            <Text style={s.streakLabel}>{t("achievements")}</Text>
          </View>
        </View>

        {/* team goals */}
        <View>
          <Text style={s.h3}>{t("teamGoals")}</Text>
          {challenges.map((c, i) => {
            const pct = c.participants ? Math.round((c.completed_count / c.participants) * 100) : 0;
            return (
              <View key={c.id} style={s.challengeCard}>
                <View style={s.row}>
                  <Text style={s.challengeTitle}>{c.title}</Text>
                  <View style={s.bonusTag}><Text style={s.bonusText}>{fmt(c.bonus_all)}</Text></View>
                </View>
                <Text style={s.muted}>{c.description}</Text>
                <View style={{ marginTop: 10 }}>
                  <View style={s.progLabel}>
                    <Text style={s.progText}>{t("teamProgress")}</Text>
                    <Text style={s.progText}>{c.completed_count}/{c.participants} {t("doneCount")}</Text>
                  </View>
                  <ProgressBar pct={pct} />
                </View>
                {c.completed ? (
                  <View style={s.doneTag}><Text style={s.doneText}>{t("completed")}</Text></View>
                ) : c.joined ? (
                  <View style={s.joinedTag}><Text style={s.joinedText}>{t("joinedKeepGoing")}</Text></View>
                ) : (
                  <Bounce style={s.joinBtn} onPress={() => join(c.id)}><Text style={s.joinText}>{t("joinChallenge")}</Text></Bounce>
                )}
              </View>
            );
          })}
          {challenges.length === 0 && <Text style={s.muted}>{t("noChallenges")}</Text>}
        </View>

        {/* rewards / achievements */}
        <View>
          <Text style={s.h3}>{t("achievementsRewards")}</Text>
          <View style={s.badgeGrid}>
            {achievements.map((a) => (
              <View key={a.key} style={[s.badge, !a.unlocked && s.badgeLocked]}>
                <Text style={{ fontSize: 30, opacity: a.unlocked ? 1 : 0.35 }}>{a.emoji}</Text>
                <Text style={[s.badgeTitle, !a.unlocked && { color: C.textSecondary }]}>{a.title}</Text>
                <Text style={s.badgeHint}>{a.unlocked ? t("unlocked") : (a.progress || a.hint)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      </ScreenFade>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: C.text, paddingHorizontal: 16, paddingTop: 8 },
  h3: { fontWeight: "800", fontSize: 18, color: C.text, marginBottom: 10 },
  muted: { color: C.textSecondary, fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streakCard: { backgroundColor: C.dark, borderRadius: R.card, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-around", ...shadow },
  streakNum: { color: "#fff", fontWeight: "800", fontSize: 24 },
  streakLabel: { color: C.textOnDark, opacity: 0.8, fontSize: 12, marginTop: 2 },
  streakDivider: { width: 1, height: 40, backgroundColor: "rgba(193,217,222,0.25)" },
  challengeCard: { backgroundColor: C.card, borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: C.border, ...shadow, marginBottom: 12, gap: 4 },
  challengeTitle: { fontWeight: "800", fontSize: 16, color: C.text },
  bonusTag: { backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  bonusText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progText: { color: C.textSecondary, fontSize: 12, fontWeight: "600" },
  joinBtn: { backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 11, alignItems: "center", marginTop: 12 },
  joinText: { color: "#fff", fontWeight: "700" },
  joinedTag: { marginTop: 12, alignSelf: "flex-start" },
  joinedText: { color: C.surface, fontWeight: "700" },
  doneTag: { marginTop: 12, backgroundColor: "#d6ece9", borderRadius: R.btn, paddingVertical: 9, alignItems: "center" },
  doneText: { color: C.accent, fontWeight: "800" },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badge: { width: "30.5%", backgroundColor: C.card, borderRadius: R.card, padding: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: C.border, ...shadow },
  badgeLocked: { backgroundColor: "rgba(255,255,255,0.5)" },
  badgeTitle: { fontWeight: "700", fontSize: 12, color: C.text, textAlign: "center" },
  badgeHint: { fontSize: 10, color: C.textSecondary, textAlign: "center" },
});
