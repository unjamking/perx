import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, memo } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withDelay,
  runOnJS, interpolate, FadeIn, FadeInUp, FadeInDown, Extrapolation,
} from "react-native-reanimated";

const SPRING = { damping: 20, stiffness: 220, mass: 0.8 };
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R, shadow, fmt, offerImage, cleanCategory } from "../theme";
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
  const cardRef = useRef(null);
  const burstRef = useRef(null);

  const load = useCallback(() => {
    api.perxifyDeck().then((d) => { setDeck(d); setI(0); setRecs(null); });
  }, []);
  useEffect(() => { load(); }, [load]);

  // Prefetch the next few card images so the photo is cached before the card
  // enters the stack — the on-enter remote load was the main post-swipe hitch.
  useEffect(() => {
    if (!deck) return;
    for (const o of deck.slice(i, i + 4)) Image.prefetch(offerImage(o));
  }, [deck, i]);

  // Keep deck in a ref so onSwiped is stable (no [deck] dep) — a changing callback
  // would re-render every DeckCard each swipe and cause the post-swipe hitch.
  const deckRef = useRef(deck);
  deckRef.current = deck;

  // Record swipe (fire-and-forget) + burst feedback, then advance. Fires for both
  // gesture swipes and button taps (both land here when the card exits).
  const onSwiped = useCallback((offer, action) => {
    if (offer) api.perxifySwipe(offer.id, action).catch(() => {});
    burstRef.current?.play(action); // imperative — no parent re-render
    setI((n) => {
      const next = n + 1;
      const d = deckRef.current;
      if (d && next >= d.length) api.perxifyRecs().then(setRecs);
      return next;
    });
  }, []);

  // Button press → fling the card the matching direction (burst fires on exit).
  const act = useCallback((action) => cardRef.current?.fling(action), []);

  if (!deck) return <Center><Loader t={t} /></Center>;

  const done = i >= deck.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.dark }} edges={["top"]}>
      <ScreenFade>
        <Animated.View entering={FadeInDown.duration(520)} style={s.head}>
          <Text style={s.title}>{t("perxify")}</Text>
          <Text style={s.sub}>{t("perxifySub")}</Text>
        </Animated.View>

        {done ? (
          <Results recs={recs} cart={cart} onRestart={load} t={t} />
        ) : (
          <View style={s.deck}>
            {/* Render bottom→top, keyed by id. As the top card leaves and i++ each
                card's depth drops by 1 and springs forward — no remount, seamless. */}
            {[2, 1, 0, -1].map((dpt) => {
              const card = deck[i + dpt];
              if (!card) return null;
              return (
                <DeckCard
                  key={card.id}
                  ref={dpt === 0 ? cardRef : null}
                  offer={card}
                  depth={dpt}
                  onSwiped={onSwiped}
                  t={t}
                />
              );
            })}
            <ActionBurst ref={burstRef} />
          </View>
        )}

        {!done && (
          <Animated.View entering={FadeInUp.duration(520)} style={s.actions}>
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
  like: { icon: "heart", color: "#2bb673", bgColor: "rgba(43, 182, 115, 0.12)" },
  superlike: { icon: "star", color: "#f0b429", bgColor: "rgba(240, 180, 41, 0.12)" },
  dislike: { icon: "close", color: "#e0537b", bgColor: "rgba(224, 83, 123, 0.12)" },
  skip: { icon: "play-skip-forward", color: "#ffffff", bgColor: "rgba(255, 255, 255, 0.12)" },
};

// Owns its own state so triggering a burst (via ref.play) does NOT re-render the
// parent / the card stack — that re-render was part of the post-swipe glitch.
const ActionBurst = forwardRef(function ActionBurst(_, ref) {
  const [action, setAction] = useState(null);
  const v = useSharedValue(0);
  useImperativeHandle(ref, () => ({
    play(a) { setAction(a); v.value = 0; v.value = withTiming(1, { duration: 550 }); },
  }), []);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(v.value, [0, 0.15, 0.65, 1], [0, 1, 1, 0]),
    transform: [
      { scale: interpolate(v.value, [0, 0.18, 0.65, 1], [0.4, 1.15, 1.0, 0.85]) },
      { translateY: interpolate(v.value, [0, 1], [0, -70]) },
      { rotate: `${interpolate(v.value, [0, 1], [0, -8])}deg` },
    ],
  }));
  if (!action) return null;
  const b = BURST[action] || BURST.like;
  return (
    <Animated.View pointerEvents="none" style={s.burst}>
      <Animated.View style={[s.burstBadge, { backgroundColor: b.bgColor, borderColor: b.color }, style]}>
        <Ionicons name={b.icon} size={42} color={b.color} />
      </Animated.View>
    </Animated.View>
  );
});

const DEPTH = { scale: 0.06, y: 16 }; // per-level shrink + offset

// One card for every slot in the stack. Keyed by offer id and never swapped for a
// different component, so promotion top↔behind is a pure style spring — seamless.
// depth 0 = top (gesturable); the parent attaches `swipeRef` to it.
const DeckCard = forwardRef(function DeckCard({ offer, depth, onSwiped, t }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const d = useSharedValue(depth);
  useEffect(() => {
    d.value = withSpring(depth, SPRING);
  }, [depth]);

  const finish = useCallback((action) => onSwiped(offer, action), [offer, onSwiped]);

  const EXIT_DURATION = 220;
  useImperativeHandle(ref, () => ({
    fling(action) {
      if (action === "superlike") {
        y.value = withTiming(-height, { duration: EXIT_DURATION });
        finish("superlike");
      }
      else if (action === "like") {
        x.value = withTiming(width * 1.5, { duration: EXIT_DURATION });
        finish("like");
      }
      else if (action === "dislike") {
        x.value = withTiming(-width * 1.5, { duration: EXIT_DURATION });
        finish("dislike");
      }
      else {
        y.value = withTiming(height, { duration: EXIT_DURATION });
        finish("skip");
      }
    },
  }), [finish]);

  const pan = Gesture.Pan()
    .enabled(depth === 0)
    .onUpdate((e) => { "worklet"; x.value = e.translationX; y.value = e.translationY; })
    .onEnd((e) => {
      "worklet";
      if (e.translationY < -SWIPE_X && Math.abs(e.translationX) < SWIPE_X) {
        y.value = withTiming(-height, { duration: EXIT_DURATION });
        runOnJS(finish)("superlike");
      } else if (e.translationX > SWIPE_X) {
        y.value = withTiming(y.value, { duration: EXIT_DURATION });
        x.value = withTiming(width * 1.5, { duration: EXIT_DURATION });
        runOnJS(finish)("like");
      } else if (e.translationX < -SWIPE_X) {
        y.value = withTiming(y.value, { duration: EXIT_DURATION });
        x.value = withTiming(-width * 1.5, { duration: EXIT_DURATION });
        runOnJS(finish)("dislike");
      } else {
        x.value = withSpring(0, SPRING);
        y.value = withSpring(0, SPRING);
      }
    });

  // Compose depth (stack position) with swipe offset (gesture). Both live here so
  // there's no remount when a behind card becomes the top card.
  const cardStyle = useAnimatedStyle(() => ({
    zIndex: Math.round(10 - d.value),
    opacity: interpolate(
      d.value,
      [-1, 0, 1, 2],
      [1, 1, 0.6, 0.32],
      Extrapolation.CLAMP
    ),
    transform: [
      { translateX: x.value },
      { translateY: y.value + interpolate(d.value, [-1, 0, 1, 2], [0, 0, DEPTH.y, DEPTH.y * 2], Extrapolation.CLAMP) },
      { rotate: `${interpolate(x.value, [-width, width], [-8, 8])}deg` },
      { scale: interpolate(d.value, [-1, 0, 1, 2], [1, 1, 1 - DEPTH.scale, 1 - DEPTH.scale * 2], Extrapolation.CLAMP) },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({ opacity: d.value <= 0 ? interpolate(x.value, [0, SWIPE_X], [0, 1], Extrapolation.CLAMP) : 0 }));
  const nopeStyle = useAnimatedStyle(() => ({ opacity: d.value <= 0 ? interpolate(x.value, [-SWIPE_X, 0], [1, 0], Extrapolation.CLAMP) : 0 }));
  const superStyle = useAnimatedStyle(() => ({ opacity: d.value <= 0 ? interpolate(y.value, [-SWIPE_X, 0], [1, 0], Extrapolation.CLAMP) : 0 }));

  // Glow border per direction — green right, red left, gold up. Border + shadow
  // intensify with drag and breathe via `pulse` once near commit (shine effect).
  const glowFrom = (p) => {
    "worklet";
    return {
      opacity: p,
      borderWidth: interpolate(p, [0, 1], [0, 6]),
      transform: [{ scale: interpolate(p, [0, 1], [1, 1.006]) }],
    };
  };
  const glowLike = useAnimatedStyle(() => {
    const up = -y.value > Math.abs(x.value);
    return glowFrom(d.value <= 0 && !up ? interpolate(x.value, [0, SWIPE_X * 1.2], [0, 1], Extrapolation.CLAMP) : 0);
  });
  const glowNope = useAnimatedStyle(() => {
    const up = -y.value > Math.abs(x.value);
    return glowFrom(d.value <= 0 && !up ? interpolate(x.value, [-SWIPE_X * 1.2, 0], [1, 0], Extrapolation.CLAMP) : 0);
  });
  const glowSuper = useAnimatedStyle(() => {
    const up = -y.value > Math.abs(x.value);
    return glowFrom(d.value <= 0 && up ? interpolate(y.value, [-SWIPE_X * 1.2, 0], [1, 0], Extrapolation.CLAMP) : 0);
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.cardWrap, cardStyle]} pointerEvents={depth === 0 ? "auto" : "none"}>
        <Card offer={offer} />
        {/* directional glow overlays (border-only, content shows through) */}
        <Animated.View pointerEvents="none" style={[s.glow, s.glowLike, glowLike]} />
        <Animated.View pointerEvents="none" style={[s.glow, s.glowNope, glowNope]} />
        <Animated.View pointerEvents="none" style={[s.glow, s.glowSuper, glowSuper]} />
        <Animated.View style={[s.stamp, s.stampLike, likeStyle]}><Text style={s.stampText}>{t("like")}</Text></Animated.View>
        <Animated.View style={[s.stamp, s.stampNope, nopeStyle]}><Text style={s.stampText}>{t("nope")}</Text></Animated.View>
        <Animated.View style={[s.stamp, s.stampSuper, superStyle]}><Text style={s.stampText}>{t("superLike")}</Text></Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

// The visible benefit card (static visual; SwipeCard handles motion).
// Memoized: re-renders only when its offer changes, so swiping doesn't re-render
// the other two stacked cards (the source of the post-swipe lag).
const Card = memo(function Card({ offer }) {
  const final = offer.discount_pct ? Math.round(offer.price_all * (1 - offer.discount_pct / 100)) : offer.price_all;
  const [imgLoaded, setImgLoaded] = useState(false);
  return (
    <View style={s.card}>
      <View style={s.cardImg}>
        <Image source={{ uri: offerImage(offer) }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={() => setImgLoaded(true)} />
        <View style={s.imgOverlay} />
        {!imgLoaded && <Shimmer />}
      </View>
      <View style={s.cardBody}>
        <View style={s.catRow}>
          <View style={s.catTag}><Text style={s.catTagText}>{cleanCategory(offer.category)}</Text></View>
          <Text style={s.cardPrice}>{fmt(final)}</Text>
        </View>
        <Text style={s.cardProvider} numberOfLines={1}>{offer.provider}</Text>
        <Text style={s.cardTitle} numberOfLines={2}>{offer.title}</Text>
        {offer.description ? <Text style={s.cardDesc} numberOfLines={3}>{offer.description}</Text> : null}
        <View style={s.cardFoot}>
          {offer.discount_pct ? <View style={s.dealTag}><Text style={s.dealTagText}>-{offer.discount_pct}%</Text></View> : null}
        </View>
      </View>
    </View>
  );
});

// Shimmer placeholder over an image until it loads. Sweeping highlight band.
function Shimmer() {
  const p = useSharedValue(0);
  useEffect(() => { p.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false); }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(p.value, [0, 1], [-width, width]) }],
  }));
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, overflow: "hidden" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.surface, opacity: 0.25 }, style]} />
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
  burst: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", zIndex: 100 },
  burstBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  cardWrap: { position: "absolute", width: width - 48, height: "82%", maxHeight: 520 },
  card: { flex: 1, backgroundColor: C.card, borderRadius: 28, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 28, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  glowLike: { borderColor: "#2bb673", shadowColor: "#2bb673" },
  glowNope: { borderColor: "#e0537b", shadowColor: "#e0537b" },
  glowSuper: { borderColor: "#f0b429", shadowColor: "#f0b429" },
  cardImg: { height: "46%", width: "100%", backgroundColor: C.bg },
  imgOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 64, backgroundColor: "rgba(1,49,55,0.06)" },
  cardBody: { flex: 1, padding: 20, gap: 6 },
  cardBody: { flex: 1, padding: 16, gap: 8 },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  catTag: { backgroundColor: "transparent", borderWidth: 1, borderColor: C.accent, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 3 },
  catTagText: { color: C.accent, fontWeight: "700", fontSize: 12 },
  cardProvider: { color: C.textSecondary, fontWeight: "600", fontSize: 13, marginTop: 2 },
  cardTitle: { color: C.dark, fontWeight: "800", fontSize: 20, marginTop: 6 },
  cardDesc: { color: C.text, fontSize: 14, lineHeight: 20, marginTop: 6, opacity: 0.9 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: "auto" },
  dealTag: { backgroundColor: "#e0537b", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  dealTagText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  cardPrice: { color: C.accent, fontWeight: "800", fontSize: 18 },
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
