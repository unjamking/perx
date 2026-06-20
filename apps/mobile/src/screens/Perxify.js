import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withDelay,
  runOnJS, interpolate, FadeIn, FadeInUp, FadeInDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt, offerImage } from "../theme";
import { Bounce, OfferCard, ScreenFade } from "../components";
import { api } from "../api";
import { useCart } from "../CartContext";
import { useLang } from "../i18n";

const { width, height } = Dimensions.get("window");
const SWIPE_X = width * 0.28; // horizontal threshold for like/dislike

// action chosen by gesture direction: right=like, left=dislike, up=superlike
export default function Perxify() {
  const { t } = useLang();
  const cart = useCart();
  const [deck, setDeck] = useState(null);
  const [i, setI] = useState(0);
  const [recs, setRecs] = useState(null);
  const [burst, setBurst] = useState(null); // {action, key} flashes feedback icon
  const cardRef = useRef(null);

  const load = useCallback(() => {
    api.perxifyDeck().then((d) => { setDeck(d); setI(0); setRecs(null); });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Record swipe (fire-and-forget) + burst feedback, then advance. Fires for both
  // gesture swipes and button taps (both land here when the card exits).
  const onSwiped = useCallback((offer, action) => {
    if (offer) api.perxifySwipe(offer.id, action).catch(() => {});
    setBurst({ action, key: Date.now() });
    setI((n) => {
      const next = n + 1;
      if (deck && next >= deck.length) api.perxifyRecs().then(setRecs);
      return next;
    });
  }, [deck]);

  // Button press → fling the card the matching direction (burst fires on exit).
  const act = useCallback((action) => cardRef.current?.fling(action), []);

  if (!deck) return <Center><Loader t={t} /></Center>;

  const done = i >= deck.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }} edges={["top"]}>
      <ScreenFade>
        <Animated.View entering={FadeInDown.duration(400)} style={s.head}>
          <Text style={s.title}>{t("perxify")}</Text>
          <Text style={s.sub}>{t("perxifySub")}</Text>
        </Animated.View>

        {done ? (
          <Results recs={recs} cart={cart} onRestart={load} t={t} />
        ) : (
          <View style={s.deck}>
            {/* next card peeking behind */}
            {deck[i + 1] && <View style={[s.cardWrap, s.behind]}><Card offer={deck[i + 1]} /></View>}
            <SwipeCard ref={cardRef} key={deck[i].id} offer={deck[i]} onSwiped={onSwiped} t={t} />
            {burst && <ActionBurst key={burst.key} action={burst.action} />}
          </View>
        )}

        {!done && (
          <Animated.View entering={FadeInUp.duration(400)} style={s.actions}>
            <ActionBtn icon="close" color="#e0537b" onPress={() => act("dislike")} />
            <ActionBtn icon="play-skip-forward" color={C.textSecondary} small onPress={() => act("skip")} />
            <ActionBtn icon="star" color="#f0b429" onPress={() => act("superlike")} />
            <ActionBtn icon="heart" color="#2bb673" onPress={() => act("like")} />
          </Animated.View>
        )}
      </ScreenFade>
    </SafeAreaView>
  );
}

// Animated loading — pulsing flame while the deck loads.
function Loader({ t }) {
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ alignItems: "center", gap: 12 }, aStyle]}>
      <Ionicons name="flame" size={48} color={C.surface} />
      <Text style={s.muted}>{t("loadingPerks")}</Text>
    </Animated.View>
  );
}

// Center burst: the action's icon pops big then fades. Plays on every swipe.
const BURST = {
  like: { icon: "heart", color: "#2bb673" },
  superlike: { icon: "star", color: "#f0b429" },
  dislike: { icon: "close-circle", color: "#e0537b" },
  skip: { icon: "play-skip-forward-circle", color: C.surface },
};
function ActionBurst({ action }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withTiming(1, { duration: 520 }); }, []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(v.value, [0, 0.4, 1], [0.4, 1.25, 1.7]) }],
  }));
  const b = BURST[action] || BURST.like;
  return (
    <Animated.View pointerEvents="none" style={[s.burst, style]}>
      <Ionicons name={b.icon} size={140} color={b.color} />
    </Animated.View>
  );
}

const SwipeCard = forwardRef(function SwipeCard({ offer, onSwiped, t }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const enter = useSharedValue(0); // 0→1 pop-in on mount
  useEffect(() => { enter.value = withSpring(1, { damping: 14, stiffness: 140 }); }, []);

  // Stable JS callback the worklet can hop to. Must be invoked via runOnJS.
  const finish = useCallback((action) => onSwiped(offer, action), [offer, onSwiped]);

  // Button-driven fling — same exit motion as a gesture, by direction of action.
  useImperativeHandle(ref, () => ({
    fling(action) {
      if (action === "superlike") y.value = withTiming(-height, { duration: 280 }, () => runOnJS(finish)("superlike"));
      else if (action === "like") x.value = withTiming(width * 1.5, { duration: 280 }, () => runOnJS(finish)("like"));
      else if (action === "dislike") x.value = withTiming(-width * 1.5, { duration: 280 }, () => runOnJS(finish)("dislike"));
      else { // skip: drop down and out
        y.value = withTiming(height, { duration: 260 }, () => runOnJS(finish)("skip"));
      }
    },
  }), [finish]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      "worklet";
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationY < -SWIPE_X && Math.abs(e.translationX) < SWIPE_X) {
        x.value = withTiming(e.translationX, { duration: 220 });
        y.value = withTiming(-width, { duration: 220 }, () => runOnJS(finish)("superlike"));
      } else if (e.translationX > SWIPE_X) {
        y.value = withTiming(e.translationY, { duration: 220 });
        x.value = withTiming(width * 1.5, { duration: 220 }, () => runOnJS(finish)("like"));
      } else if (e.translationX < -SWIPE_X) {
        y.value = withTiming(e.translationY, { duration: 220 });
        x.value = withTiming(-width * 1.5, { duration: 220 }, () => runOnJS(finish)("dislike"));
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateX: x.value }, { translateY: y.value },
      { rotate: `${interpolate(x.value, [-width, width], [-12, 12])}deg` },
      { scale: interpolate(enter.value, [0, 1], [0.92, 1]) },
      { translateY: interpolate(enter.value, [0, 1], [24, 0]) },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, SWIPE_X], [0, 1]) }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-SWIPE_X, 0], [1, 0]) }));
  const superStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [-SWIPE_X, 0], [1, 0]) }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.cardWrap, cardStyle]}>
        <Card offer={offer} />
        <Animated.View style={[s.stamp, s.stampLike, likeStyle]}><Text style={s.stampText}>{t("like")}</Text></Animated.View>
        <Animated.View style={[s.stamp, s.stampNope, nopeStyle]}><Text style={s.stampText}>{t("nope")}</Text></Animated.View>
        <Animated.View style={[s.stamp, s.stampSuper, superStyle]}><Text style={s.stampText}>★ {t("superLike")}</Text></Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

// The visible benefit card (static visual; SwipeCard handles motion).
function Card({ offer }) {
  const final = offer.discount_pct ? Math.round(offer.price_all * (1 - offer.discount_pct / 100)) : offer.price_all;
  return (
    <View style={s.card}>
      <Image source={{ uri: offerImage(offer) }} style={s.cardImg} resizeMode="cover" />
      <View style={s.cardBody}>
        <View style={s.catTag}><Text style={s.catTagText}>{offer.category}</Text></View>
        <Text style={s.cardProvider} numberOfLines={1}>{offer.provider}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{offer.title}</Text>
        {offer.description ? <Text style={s.cardDesc} numberOfLines={3}>{offer.description}</Text> : null}
        <View style={s.cardFoot}>
          {offer.discount_pct ? <View style={s.dealTag}><Text style={s.dealTagText}>-{offer.discount_pct}%</Text></View> : null}
          <Text style={s.cardPrice}>{fmt(final)}</Text>
        </View>
      </View>
    </View>
  );
}

function ActionBtn({ icon, color, onPress, small }) {
  const size = small ? 52 : 64;
  return (
    <Bounce onPress={onPress} scale={0.85}
      style={[s.actionBtn, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <Ionicons name={icon} size={small ? 22 : 28} color={color} />
    </Bounce>
  );
}

function Results({ recs, cart, onRestart, t }) {
  return (
    <Animated.View entering={FadeIn} style={{ flex: 1 }}>
      <View style={s.resultsHead}>
        <Text style={{ fontSize: 40 }}>✨</Text>
        <Text style={s.resultsTitle}>{t("perxifyDone")}</Text>
        <Text style={s.sub}>{recs?.topCategories?.length ? `${t("youLove")} ${recs.topCategories.join(" · ")}` : t("perxifyKeepSwiping")}</Text>
      </View>
      <Animated.ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {recs?.offers?.length ? (
          recs.offers.map((o) => (
            <OfferCard key={o.id} offer={o} onAdd={cart.add} onSave={cart.toggleSave} saved={cart.saved.has(o.id)} full />
          ))
        ) : <Text style={[s.muted, { textAlign: "center", padding: 24 }]}>{t("perxifyKeepSwiping")}</Text>}
        <Bounce onPress={onRestart} style={s.restartBtn}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={s.restartText}>{t("perxifyMore")}</Text>
        </Bounce>
      </Animated.ScrollView>
    </Animated.View>
  );
}

function Center({ children }) {
  return <SafeAreaView style={[{ flex: 1, backgroundColor: C.dark, alignItems: "center", justifyContent: "center" }]}>{children}</SafeAreaView>;
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff" },
  sub: { color: C.textOnDark, opacity: 0.8, fontSize: 13, marginTop: 2 },
  muted: { color: C.textOnDark, opacity: 0.7 },
  deck: { flex: 1, alignItems: "center", justifyContent: "center" },
  burst: { position: "absolute", alignItems: "center", justifyContent: "center" },
  cardWrap: { position: "absolute", width: width - 48, height: "82%", maxHeight: 520 },
  behind: { transform: [{ scale: 0.94 }, { translateY: 16 }], opacity: 0.6 },
  card: { flex: 1, backgroundColor: C.card, borderRadius: 28, overflow: "hidden", ...shadow },
  cardImg: { height: "46%", width: "100%", backgroundColor: C.bg },
  cardBody: { flex: 1, padding: 20, gap: 6 },
  catTag: { alignSelf: "flex-start", backgroundColor: C.accent, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  catTagText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  cardProvider: { color: C.textSecondary, fontWeight: "600", fontSize: 13, marginTop: 4 },
  cardTitle: { color: C.text, fontWeight: "800", fontSize: 22 },
  cardDesc: { color: C.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 2 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: "auto" },
  dealTag: { backgroundColor: "#e0537b", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  dealTagText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cardPrice: { color: C.accent, fontWeight: "800", fontSize: 22 },
  stamp: { position: "absolute", top: 28, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 4 },
  stampLike: { right: 24, borderColor: "#2bb673", transform: [{ rotate: "14deg" }] },
  stampNope: { left: 24, borderColor: "#e0537b", transform: [{ rotate: "-14deg" }] },
  stampSuper: { alignSelf: "center", top: 60, borderColor: "#f0b429" },
  stampText: { fontWeight: "900", fontSize: 22, color: C.text, letterSpacing: 1 },
  actions: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 18, paddingVertical: 18 },
  actionBtn: { backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, ...shadow },
  resultsHead: { alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
  resultsTitle: { color: "#fff", fontWeight: "800", fontSize: 22 },
  restartBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: R.btn, paddingVertical: 14, marginTop: 8 },
  restartText: { color: "#fff", fontWeight: "800" },
});
