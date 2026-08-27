import React, { useEffect, useRef } from 'react';
import { Animated, Easing, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, isPad, isSmallDevice, isSmallPhone, s, screen } from '@/theme';
import { AnimatedAppImage } from '@/components/AppImage';

const CARDS = [
  Images.onboardingRatingFirstIcon, Images.onboardingRatingSecondIcon, Images.onboardingRatingThirdIcon,
  Images.onboardingRatingFourthIcon, Images.onboardingRatingFifthIcon, Images.onboardingRatingSixthIcon,
];

const CARD_WIDTH = screen.width * 0.8;
const CARD_HEIGHT = s(isSmallPhone ? 309 : 369);
const SPACING = s(-33.5);
const SIDE_PADDING = (screen.width - CARD_WIDTH) / 2;
const INTERVAL = CARD_WIDTH + SPACING;
/** scrollX that centres card `index`, matching `scrollTo(index, anchor: .center)`. */
const anchorFor = (index: number) => SIDE_PADDING + index * INTERVAL + CARD_WIDTH / 2 - screen.width / 2;

/** iOS `OnboardingUserSayView` — page 6, "Loved by Thousands". */
export function OnboardingUserSayView({ isActive }: { isActive: boolean }) {
  const title = useRef(new Animated.Value(0)).current;
  const subtitle = useRef(new Animated.Value(0)).current;
  const carousel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset before the early return so an INACTIVE page never holds stale
    // state to flash on its way back in (Rethrive's pager rule).
    title.setValue(0);
    subtitle.setValue(0);
    carousel.setValue(0);
    if (!isActive) return;
    const reveal = (value: Animated.Value, at: number) => {
      value.setValue(0);
      return setTimeout(() => Animated.timing(value, { toValue: 1, duration: 400, delay: 200, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(), at);
    };
    const timers = [reveal(title, 300), reveal(subtitle, 600), reveal(carousel, 900)];
    return () => timers.forEach(clearTimeout);
  }, [isActive, title, subtitle, carousel]);

  const rise = (value: Animated.Value) => ({ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [s(12), 0] }) }] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.titleBlock, rise(title)]}>
        <Text style={styles.title}>Loved by</Text>
        <Text style={styles.subtitleBold}>Thousands</Text>
      </Animated.View>
      <Animated.Text style={[styles.blurb, rise(subtitle)]}>Making home chores easier, one task{'\n'}at a time.</Animated.Text>
      <Animated.View style={[styles.carousel, { opacity: carousel }]}>
        <ParallaxCarousel isActive={isActive} />
      </Animated.View>
    </View>
  );
}

function ParallaxCarousel({ isActive }: { isActive: boolean }) {
  const list = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(anchorFor(1))).current;
  const driver = useRef(new Animated.Value(anchorFor(1))).current;
  const index = useRef(1);

  useEffect(() => {
    const id = driver.addListener(({ value }) => list.current?.scrollTo({ x: value, animated: false }));
    return () => driver.removeListener(id);
  }, [driver]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      index.current = (index.current + 1) % CARDS.length;
      Animated.timing(driver, { toValue: anchorFor(index.current), duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: false }).start();
    }, 2000);
    return () => clearInterval(timer);
  }, [isActive, driver]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    driver.setValue(x);
    index.current = Math.max(0, Math.min(CARDS.length - 1, Math.round((x - anchorFor(0)) / INTERVAL)));
  };

  return (
    <Animated.ScrollView
      ref={list}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
      contentOffset={{ x: anchorFor(1), y: 0 }}
      snapToInterval={INTERVAL}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      onMomentumScrollEnd={onMomentumEnd}
    >
      {CARDS.map((source, i) => {
        const anchor = anchorFor(i);
        return (
          <AnimatedAppImage
            key={i}
            source={source}
            resizeMode="stretch"
            style={[
              styles.card,
              i < CARDS.length - 1 && { marginRight: SPACING },
              // iOS: max(0.85, 1 - (distance / screenWidth) * 0.3) — 0.85 is reached at half a screen.
              { transform: [{ scale: scrollX.interpolate({ inputRange: [anchor - screen.width / 2, anchor, anchor + screen.width / 2], outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' }) }] },
            ]}
          />
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingTop: s(isSmallDevice || isPad ? 52 : 104) },
  titleBlock: { width: s(318.68), alignItems: 'center' },
  title: { ...font('bold', 43), color: colors.purple, includeFontPadding: false },
  subtitleBold: { ...font('semibold', 28), color: colors.text, includeFontPadding: false },
  blurb: { ...font('regular', 18), color: 'rgba(31,31,31,0.75)', textAlign: 'center', marginTop: s(10) },
  carousel: { marginTop: s(42.5), height: CARD_HEIGHT, alignSelf: 'stretch' },
  track: { paddingHorizontal: SIDE_PADDING, alignItems: 'center' },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT },
});
