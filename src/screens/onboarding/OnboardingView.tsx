import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, font, isSmallPhone, s } from '@/theme';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { OnboardingProgressView } from './pages/OnboardingProgressView';
import { OnboardingZoneView } from './pages/OnboardingZoneView';
import { OnboardingCalendarView } from './pages/OnboardingCalendarView';
import { OnboardingAvatarView } from './pages/OnboardingAvatarView';
import { OnboardingStreakView } from './pages/OnboardingStreakView';
import { OnboardingUserSayView } from './pages/OnboardingUserSayView';

/** iOS `PagingTabView` copy for each of the seven `SwipeView` pages. */
const COPY = [
  { title: '', subtitle: '' },
  { title: 'Keep Your\nHome Organized', subtitle: 'Manage every task by room, zone,\nand schedule.' },
  { title: 'Create Zones\nfor Every Room', subtitle: 'Organize chores by living room, kitchen,\nbedroom, bathroom, and more.' },
  { title: 'Never Miss\na Chore Again', subtitle: 'See what’s due today, overdue, or\ncoming up soon.' },
  { title: 'Assign\nChores to Members', subtitle: 'Share tasks with family, roommates,\nor helpers.' },
  { title: 'Track Your Cleaning Progress', subtitle: 'View completed chores, pending tasks,\nand overdue work easily.' },
  { title: '', subtitle: '' },
];
const TOTAL = COPY.length;
/**
 * The reveal now starts the instant the pager lands.
 *
 * This was 180 → 300 → 200 across earlier passes, all of it compensating for
 * activation happening MID-DRAG: the page used to become `active` as soon as the
 * scroll crossed the dead zone, so the delay held its art back until the pager had
 * visually settled. Activation has been driven by `settled` (momentum end) since
 * 2026-08-24, so the delay no longer defers anything — it is just dead time.
 *
 * Measured on the user's screen recording of a swipe onto page 1: the page landed
 * at t=1.07s and the first pixel of content appeared at t=1.35s, i.e. 278ms of a
 * completely empty page between the swipe finishing and anything showing up. That
 * empty beat, followed by everything popping in at once, is the reported jerk.
 */
const PAGE_REVEAL_DELAY = 0;

function PageReveal({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.stopAnimation();
    // Reset to hidden FIRST, on every run — deactivation included. A page that
    // is not the settled page must never hold visible content, because that is
    // what produced the "everything is already there, then it disappears, then
    // it comes back" jerk: the page slid in still lit from its last visit, and
    // activation blanked it while it was on screen. Rethrive's pager fixes the
    // same bug the same way (`GestureControlsSheet`: "Always start hidden — so
    // an INACTIVE page never shows stale content").
    opacity.setValue(0);
    if (!active) return;

    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      delay: PAGE_REVEAL_DELAY,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, opacity]);

  return <Animated.View style={[styles.pageContent, { opacity }]}>{children}</Animated.View>;
}

/**
 * One pager cell, memoised so an index change re-renders only the page being
 * left and the page being entered. Without this every setIndex re-rendered all
 * seven art trees (SVGs, gradients, icon grids) mid-scroll, dropping frames.
 */
const PageCell = React.memo(function PageCell({ page, active, width, height }: { page: number; active: boolean; width: number; height: number }) {
  return (
    <View style={[styles.page, { width, height }]}>
      {page === 0 ? <WelcomeScreen /> : null}
      {page > 0 ? (
        <PageReveal active={active}>
          {page === 1 ? <OnboardingProgressView isActive={active} /> : null}
          {page === 2 ? <OnboardingZoneView isActive={active} /> : null}
          {page === 3 ? <OnboardingCalendarView isActive={active} /> : null}
          {page === 4 ? <OnboardingAvatarView isActive={active} /> : null}
          {page === 5 ? <OnboardingStreakView isActive={active} /> : null}
          {page === 6 ? <OnboardingUserSayView isActive={active} /> : null}
        </PageReveal>
      ) : null}
    </View>
  );
});

export function OnboardingView({ onDone }: { onDone(): void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pager = useRef<ScrollView>(null);
  const offset = useRef(new Animated.Value(0)).current;
  /**
   * Two signals, split by what can safely change mid-gesture:
   *
   * - `index` follows the drag (from `onScroll`) and now drives ONLY the dots. A
   *   dot moving under the finger is responsive and cannot flash content.
   * - `settled` changes only once the pager has landed, and drives everything that
   *   renders content: the page art, each page's inner animations, the copy text,
   *   and the CTA label. Anything content-bearing that keys off the drag appears
   *   over the page that is still sliding away. Rethrive's pager likewise sets its
   *   page `active` flag from `onMomentumScrollEnd` alone.
   *
   * The copy's *visibility* is still gesture-linked, via `copyFade` below, so it
   * responds to the drag without its text ever changing early.
   */
  const [index, setIndex] = useState(0);
  const [settled, setSettled] = useState(0);
  const driving = useRef(false);
  /** Native-driven live scroll position, for the gesture-linked copy fade. */
  const scrollX = useRef(new Animated.Value(0)).current;
  /** Same value read from JS, for the dead-zone dot tracking and settle fallback. */
  const scrollXValue = useRef(0);
  const settleFallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleIn = useRef(new Animated.Value(0)).current;
  const subtitleIn = useRef(new Animated.Value(0)).current;

  // Arbora's Android paging strategy: drive `scrollTo` per frame instead of using
  // the native animated scroll, which can settle between pages on this flow.
  useEffect(() => {
    const id = offset.addListener(({ value }) => pager.current?.scrollTo({ x: value, animated: false }));
    return () => offset.removeListener(id);
  }, [offset]);

  /**
   * Reset the copy to hidden SYNCHRONOUSLY when the settled page changes —
   * BEFORE paint. The overlay stays mounted, so on a page swap `titleIn` is
   * still at 1 (the previous page's settled value); a reset inside `useEffect`
   * runs only AFTER the first paint, so the new title flashed fully visible for
   * a frame, was blanked by the reset, then sprang back in — the "already
   * there, disappears, re-appears" jerk. Rethrive's `OnboardingShell` fixes the
   * same bug the same way: setValue(0) during render, guarded by the last-seen
   * key, so the swapped-in text paints at opacity 0 from frame one.
   */
  const lastCopyReset = useRef(settled);
  if (lastCopyReset.current !== settled) {
    lastCopyReset.current = settled;
    titleIn.setValue(0);
    subtitleIn.setValue(0);
  }

  /**
   * iOS `performAnimation()`: the title springs in at 0.4s, the subtitle at 0.6s.
   *
   * Keyed to `settled`, not `index`. On `index` the new page's copy appeared
   * mid-gesture — the strings swapped as soon as the drag crossed the dead zone,
   * so the incoming title rendered over the outgoing page while it was still
   * sliding, and the 400/600ms springs ran from that moment instead of from the
   * landing. That is why the jerk showed on a swipe but not on Continue: the CTA
   * scroll takes 300ms, which both delays outlast, so there the copy could never
   * appear early. Deriving both the copy and the art from the landing makes the
   * two paths behave identically. (The hidden reset happens synchronously during
   * render above — here we only start the spring-in.)
   */
  useEffect(() => {
    const reveal = (value: Animated.Value, delay: number) =>
      Animated.spring(value, { toValue: 1, stiffness: 100, damping: 15, mass: 1, delay, useNativeDriver: true });
    const animation = Animated.parallel([reveal(titleIn, 400), reveal(subtitleIn, 600)]);
    animation.start();
    return () => animation.stop();
  }, [settled, titleIn, subtitleIn]);

  /**
   * The copy sits in a fixed overlay that does not travel with the pager, so with
   * the text now pinned to the settled page it would otherwise hang there at full
   * opacity for the whole drag — the original complaint. Fading it out against the
   * live scroll position keeps it tied to the gesture without ever showing the
   * next page's words early. Native-driven, so it tracks the finger exactly.
   */
  const copyFade = scrollX.interpolate({
    inputRange: [(settled - 1) * width, settled * width, (settled + 1) * width],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });

  /**
   * Moves the active dot only. It must NOT touch the title/subtitle values any
   * more: those belong to `settled`, so zeroing them here would blank the copy of
   * the page still on screen the moment a drag crossed the dead zone — the very
   * flash this whole change removes. The copy reset now lives solely in the
   * `settled` effect.
   */
  const selectPage = (nextIndex: number) => {
    if (nextIndex === index) return;
    setIndex(nextIndex);
  };

  /** Commit the landed page: reveals its art and starts its inner animations. */
  const settlePage = (landed: number) => {
    if (settleFallback.current) { clearTimeout(settleFallback.current); settleFallback.current = null; }
    if (landed >= 0 && landed < TOTAL) setSettled(landed);
  };

  useEffect(() => () => { if (settleFallback.current) clearTimeout(settleFallback.current); }, []);

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index >= TOTAL - 1) return onDone();
    const target = index + 1;
    selectPage(target);
    // The frame-driven scroll below emits onScroll events that initially still
    // round to the OLD page; suppress scroll-derived selection until it lands
    // so the press-time index (and its 400/600ms title choreography) survives.
    driving.current = true;
    Animated.timing(offset, { toValue: width * target, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start(() => { driving.current = false; settlePage(target); });
  };

  const reveal = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
  });

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
          listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            // Only the dots track the drag now; the copy and the art both wait for
            // the landing. The 0.45 dead zone still keeps a slow drag hovering at
            // the midpoint from flip-flopping the active dot.
            scrollXValue.current = event.nativeEvent.contentOffset.x;
            if (driving.current) return;
            const progress = scrollXValue.current / width;
            const nearest = Math.round(progress);
            if (nearest >= 0 && nearest < TOTAL && Math.abs(progress - nearest) <= 0.45) selectPage(nearest);
          },
        })}
        onScrollEndDrag={() => {
          // A slow drag-release snaps without ever emitting onMomentumScrollEnd —
          // the same trap Rethrive documents. Without this fallback `settled`
          // would never advance and the incoming page would stay blank forever.
          if (settleFallback.current) clearTimeout(settleFallback.current);
          settleFallback.current = setTimeout(() => settlePage(Math.round(scrollXValue.current / width)), 180);
        }}
        onMomentumScrollEnd={event => {
          const x = event.nativeEvent.contentOffset.x;
          scrollXValue.current = x;
          offset.setValue(x);
          const landed = Math.round(x / width);
          selectPage(landed);
          settlePage(landed);
        }}
      >
        {COPY.map((_, page) => (
          <PageCell key={page} page={page} active={settled === page} width={width} height={height} />
        ))}
      </Animated.ScrollView>

      {/* iOS overlays this bottom-anchored stack on top of the pager. */}
      <View style={[styles.overlay, { paddingBottom: Math.max(s(isSmallPhone ? 21 : 37), insets.bottom + s(10)) }]}>
        <Animated.View style={[styles.copy, { opacity: copyFade }]}>
          <Animated.Text style={[styles.title, reveal(titleIn)]}>{COPY[settled].title}</Animated.Text>
          <Animated.Text style={[styles.subtitle, reveal(subtitleIn)]}>{COPY[settled].subtitle}</Animated.Text>
        </Animated.View>
        <View style={styles.dots}>
          {COPY.map((_, page) => <View key={page} style={[styles.dot, index === page && styles.dotActive]} />)}
        </View>
        <Pressable onPress={next} style={styles.button}>
          {/* `settled`, so a partial drag can't flicker the label mid-gesture. */}
          <Text style={styles.buttonLabel}>{settled === 0 ? 'Get Started' : 'Continue'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const GAP = s(isSmallPhone ? 15.5 : 17);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  page: { backgroundColor: colors.background, overflow: 'hidden' },
  pageContent: { flex: 1 },
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: GAP },
  copy: { gap: s(10) },
  title: { ...font('bold', 26), color: colors.text, textAlign: 'center' },
  subtitle: { ...font('regular', 17), color: 'rgba(31,31,31,0.5)', textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: s(6) },
  dot: { width: s(5), height: s(5), borderRadius: s(2.5), backgroundColor: `${colors.purple}33` },
  dotActive: { width: s(15), height: s(5), borderRadius: s(100), backgroundColor: colors.purple },
  button: { marginHorizontal: s(25), height: s(52), borderRadius: s(100), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  buttonLabel: { ...font('semibold', 16), color: colors.white },
});
