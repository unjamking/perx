import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt, offerImage } from "../theme";
import { api, EMPLOYEE_ID } from "../api";
import { useCart } from "../CartContext";
import { useLang } from "../i18n";
import { Bounce } from "../components";

const PROMPTS = {
  en: [
    "Spa package under 5,000 ALL",
    "Healthy food deals",
    "Gym membership discounts",
    "Weekend travel plans"
  ],
  sq: [
    "Spa nën 5,000 ALL",
    "Ushqim i shëndetshëm",
    "Zbritje për palestër",
    "Udhëtime për fundjavë"
  ]
};

export default function Concierge({ navigation }) {
  const cart = useCart();
  const { t, lang } = useLang();
  const [msgs, setMsgs] = useState([
    { role: "ai", text: t("exodusGreeting") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: pulse.value > 1.2 ? 0.6 : 1,
  }));

  async function send(customText) {
    const text = typeof customText === "string" ? customText.trim() : input.trim();
    if (!text || typing) return;
    if (typeof customText !== "string") setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setTyping(true);
    try {
      const res = await api.concierge(text, EMPLOYEE_ID, lang);
      setMsgs((m) => [...m, { role: "ai", text: res.message, offers: res.recommendations }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: t("conciergeError") }]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }} edges={["top"]}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.header}>
        <View style={s.avatarContainer}>
          <View style={s.avatar}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
          <View style={s.onlineIndicatorOuter}>
            <Animated.View style={[s.onlineIndicator, pulseStyle]} />
          </View>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Exodus</Text>
          <Text style={s.headerSub}>{t("exodusSub")}</Text>
        </View>
        <Bounce onPress={() => navigation.goBack()} hitSlop={12} style={s.closeBtn}>
          <Ionicons name="close" size={22} color={C.textOnDark} />
        </Bounce>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
        {msgs.map((m, i) => <Bubble key={i} m={m} onAdd={cart.add} />)}
        {typing && <TypingIndicator />}
      </ScrollView>

      {/* Quick Suggestions */}
      {input.trim() === "" && (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.promptsContainer}
          >
            {(PROMPTS[lang] || PROMPTS.en).map((p, index) => (
              <Bounce
                key={index}
                style={s.promptChip}
                onPress={() => send(p)}
              >
                <Ionicons name="chatbubble-outline" size={13} color={C.accent} style={{ marginRight: 6 }} />
                <Text style={s.promptText}>{p}</Text>
              </Bounce>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.inputBar}>
        <TextInput style={s.input} placeholder={t("conciergePh")}
          placeholderTextColor={C.textSecondary} value={input} onChangeText={setInput}
          onSubmitEditing={() => send()} returnKeyType="send" />
        <Bounce style={s.sendBtn} scale={0.85} onPress={() => send()}><Ionicons name="send" size={18} color="#fff" /></Bounce>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypingIndicator() {
  return (
    <View style={[s.bubble, s.ai, { alignSelf: "flex-start", flexDirection: "row", gap: 5, paddingVertical: 14, paddingHorizontal: 16 }]}>
      <Dot delay={0} />
      <Dot delay={150} />
      <Dot delay={300} />
    </View>
  );
}

function Dot({ delay }) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        true
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));
  return (
    <Animated.View style={[s.typingDot, animatedStyle]} />
  );
}

function Bubble({ m, onAdd }) {
  const user = m.role === "user";
  return (
    <Animated.View entering={FadeInUp} style={{ alignSelf: user ? "flex-end" : "flex-start", maxWidth: "86%" }}>
      <View style={[s.bubble, user ? s.user : s.ai]}>
        <Text style={{ color: user ? "#fff" : C.text, fontSize: 14, lineHeight: 20 }}>{m.text}</Text>
      </View>
      {m.offers?.map((o) => (
        <Bounce
          key={o.offer_id}
          style={s.offerCard}
          scale={0.97}
          onPress={() => onAdd({ id: o.offer_id, title: o.title, provider: o.provider, price_all: o.price_all, category: o.category || "Wellness" })}
        >
          <Image source={{ uri: offerImage(o) }} style={s.offerImage} resizeMode="cover" />
          <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
            <View style={s.categoryBadge}>
              <Text style={s.categoryBadgeText}>{o.category || "Wellness"}</Text>
            </View>
            <Text style={s.offerTitle} numberOfLines={1}>{o.title}</Text>
            <Text style={s.offerSub}>{o.provider} · <Text style={s.offerPrice}>{fmt(o.price_all)}</Text></Text>
            {o.reason ? <Text style={s.offerReason} numberOfLines={2}>{o.reason}</Text> : null}
          </View>
          <View style={s.plusContainer}>
            <View style={s.plus}>
              <Ionicons name="add" size={18} color="#fff" />
            </View>
          </View>
        </Bounce>
      ))}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: "rgba(1, 49, 55, 0.95)",
    padding: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  headerTitle: { color: C.textOnDark, fontWeight: "800", fontSize: 16 },
  headerSub: { color: C.textOnDark, opacity: 0.6, fontSize: 12 },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  onlineIndicatorOuter: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2bb673",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...shadow,
  },
  user: {
    backgroundColor: C.accent,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  ai: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.accent,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: R.card,
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    ...shadow,
  },
  offerImage: {
    width: 90,
    height: "100%",
    minHeight: 110,
    backgroundColor: "#f4f7f8",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(33,94,104,0.06)",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  categoryBadgeText: {
    color: C.accent,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  offerTitle: {
    fontWeight: "700",
    color: C.text,
    fontSize: 14,
  },
  offerSub: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  offerPrice: {
    color: C.accent,
    fontWeight: "700",
  },
  offerReason: {
    color: C.textSecondary,
    fontSize: 11,
    marginTop: 6,
    opacity: 0.8,
    lineHeight: 15,
  },
  plusContainer: {
    justifyContent: "center",
    paddingRight: 12,
    paddingLeft: 4,
  },
  plus: {
    backgroundColor: C.accent,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  promptsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
  },
  promptChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    ...shadow,
  },
  promptText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    ...shadow,
  },
  input: {
    flex: 1,
    backgroundColor: "#f4f7f8",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    backgroundColor: C.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
});
