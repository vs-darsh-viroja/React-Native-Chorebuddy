import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
const PAGE_REVEAL_DELAY = 300;

function PageReveal({ active, children }: { active: boolean; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.stopAnimation();
    // Deactivation keeps the current opacity: the index flips while the
    // outgoing page is still half on screen, and zeroing here made its art
    // vanish mid-swipe (the "jerk"). iOS TabView pages keep their content
    // while sliding away; the reset to 0 happens on the NEXT activation,
    // right before the reveal, when the page is guaranteed off-screen.
    if (!active) return;
    opacity.setValue(0);

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
  const [index, setIndex] = useState(0);
  const driving = useRef(false);
  const titleIn = useRef(new Animated.Value(0)).current;
  const subtitleIn = useRef(new Animated.Value(0)).current;

  // Arbora's Android paging strategy: drive `scrollTo` per frame instead of using
  // the native animated scroll, which can settle between pages on this flow.
  useEffect(() => {
    const id = offset.addListener(({ value }) => pager.current?.scrollTo({ x: value, animated: false }));
    return () => offset.removeListener(id);
  }, [offset]);

  /** iOS `performAnimation()`: the title springs in at 0.4s, the subtitle at 0.6s. */
  useEffect(() => {
    titleIn.setValue(0);
    subtitleIn.setValue(0);
    const reveal = (value: Animated.Value, delay: number) =>
      Animated.spring(value, { toValue: 1, stiffness: 100, damping: 15, mass: 1, delay, useNativeDriver: true });
    Animated.parallel([reveal(titleIn, 400), reveal(subtitleIn, 600)]).start();
  }, [index, titleIn, subtitleIn]);

  const selectPage = (nextIndex: number) => {
    if (nextIndex === index) return;
    // Hide the old copy before React renders text for the new page. Without
    // this, the new strings get one frame at the previous page's opacity (1).
    titleIn.stopAnimation();
    subtitleIn.stopAnimation();
    titleIn.setValue(0);
    subtitleIn.setValue(0);
    setIndex(nextIndex);
  };

  const next = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index >= TOTAL - 1) return onDone();
    const target = index + 1;
    selectPage(target);
    // The frame-driven scroll below emits onScroll events that initially still
    // round to the OLD page; suppress scroll-derived selection until it lands
    // so the press-time index (and its 400/600ms title choreography) survives.
    driving.current = true;
    Animated.timing(offset, { toValue: width * target, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start(() => { driving.current = false; });
  };

  const reveal = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
  });

  return (
    <View style={styles.root}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={event => {
          // Track the page the user is actually looking at, iOS-onAppear style.
          // Waiting for onMomentumScrollEnd leaves the previous page's copy
          // fully visible for the whole drag + settle (~1s), after which it
          // vanishes and re-animates — the visible flash this replaces. The
          // 0.45 dead zone keeps a slow drag hovering at the midpoint from
          // flip-flopping the index and restarting the reveals.
          if (driving.current) return;
          const progress = event.nativeEvent.contentOffset.x / width;
          const nearest = Math.round(progress);
          if (nearest >= 0 && nearest < TOTAL && Math.abs(progress - nearest) <= 0.45) selectPage(nearest);
        }}
        onMomentumScrollEnd={event => {
          const x = event.nativeEvent.contentOffset.x;
          offset.setValue(x);
          selectPage(Math.round(x / width));
        }}
      >
        {COPY.map((_, page) => (
          <PageCell key={page} page={page} active={index === page} width={width} height={height} />
        ))}
      </ScrollView>

      {/* iOS overlays this bottom-anchored stack on top of the pager. */}
      <View style={[styles.overlay, { paddingBottom: Math.max(s(isSmallPhone ? 21 : 37), insets.bottom + s(10)) }]}>
        <View style={styles.copy}>
          <Animated.Text style={[styles.title, reveal(titleIn)]}>{COPY[index].title}</Animated.Text>
          <Animated.Text style={[styles.subtitle, reveal(subtitleIn)]}>{COPY[index].subtitle}</Animated.Text>
        </View>
        <View style={styles.dots}>
          {COPY.map((_, page) => <View key={page} style={[styles.dot, index === page && styles.dotActive]} />)}
        </View>
        <Pressable onPress={next} style={styles.button}>
          <Text style={styles.buttonLabel}>{index === 0 ? 'Get Started' : 'Continue'}</Text>
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
