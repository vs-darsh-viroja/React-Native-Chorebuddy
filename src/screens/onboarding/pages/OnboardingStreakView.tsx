import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { colors, font, isBigPad, isSmallPhone, s } from '@/theme';
import { GradientText, TopGlow, spring, useFloat } from './parts';

const PINK: [string, string] = ['#FB4786', '#FD6A96'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Status = 'done' | 'missed' | 'skipped' | 'upcoming';
const STATUSES: Status[] = ['done', 'done', 'missed', 'skipped', 'done', 'upcoming', 'upcoming'];
const FACE = { done: Images.doneImg, missed: Images.missedImg, skipped: Images.skippedImg, upcoming: Images.upcomingDayImg };
const CIRCLE: Record<Status, string | null> = { done: '#9871E8', missed: '#FF5757', skipped: '#FB8C07', upcoming: null };
const GLYPH = { done: Images.statusCheckIcon, missed: Images.statusXIcon, skipped: Images.statusMinusIcon, upcoming: null };

/** iOS marquee rows advance by the sum of the *declared* card widths plus spacing. */
const MARQUEE_UNIT = 245.7 + 169.9 + 1 * 2;
const ROW_ONE = [Images.bedroomTaskImg, Images.kitchenTask2Img];
const ROW_TWO = [Images.kitchenTaskImg, Images.bedroomTaskImg];

/** Per-element `rollIn` delays, in iOS declaration order. */
const ROLL_DELAYS = [0.05, 0.12, 0.2, 0.28, 0.34, 0.4, 0.46, 0.52];

/** iOS `OnboardingStreakView` — page 5, "Track Your Cleaning Progress". */
export function OnboardingStreakView({ isActive }: { isActive: boolean }) {
  const bunnyFloat = useFloat(-7, 2);
  const rolls = useRef(ROLL_DELAYS.map(() => new Animated.Value(0))).current;
  const bunnyIn = useRef(new Animated.Value(0)).current;
  const dayShown = useRef(DAYS.map(() => new Animated.Value(0))).current;
  const scroll1 = useRef(new Animated.Value(0)).current;
  const scroll2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;
    rolls.forEach(value => value.setValue(0));
    dayShown.forEach(value => value.setValue(0));
    scroll1.setValue(0);
    scroll2.setValue(0);

    Animated.parallel(
      rolls.map((value, index) => Animated.timing(value, { toValue: 1, duration: 550, delay: ROLL_DELAYS[index] * 1000, easing: Easing.out(Easing.ease), useNativeDriver: true })),
    ).start();
    spring(bunnyIn, 1, 0.7, 0.7).start();

    // iOS animates only the first five day columns; Sat/Sun stay in their upcoming state.
    const timers = dayShown.slice(0, 5).map((value, index) => setTimeout(() => spring(value, 1, 0.65, 0.72).start(), 900 + index * 500));
    const marquee = setTimeout(() => {
      const loop = (value: Animated.Value, duration: number) =>
        Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
      loop(scroll1, 22000).start();
      loop(scroll2, 20000).start();
    }, 300);
    return () => { timers.forEach(clearTimeout); clearTimeout(marquee); };
  }, [isActive, rolls, bunnyIn, dayShown, scroll1, scroll2]);

  /** iOS `rollIn`: fade in while settling down from `-travel`. */
  const rollIn = (index: number, travel = 16) => ({
    opacity: rolls[index],
    transform: [{ translateY: rolls[index].interpolate({ inputRange: [0, 1], outputRange: [-s(travel), 0] }) }],
  });

  return (
    <View style={styles.root}>
      <TopGlow height={301} />

      <View style={styles.canvas}>
        <View style={styles.streakHeader}>
          <Animated.View style={rollIn(0)}>
            <GradientText value="CURRENT STREAK" style={styles.streakLabel} ramp={PINK} />
          </Animated.View>
          <Animated.View style={[styles.streakValueRow, rollIn(1, 22)]}>
            <GradientText value="24" style={styles.streakValue} ramp={PINK} />
            <Text style={styles.streakUnit}>Days</Text>
          </Animated.View>
        </View>

        <View style={styles.statCards}>
          <StatCard gradient={['#FFF5EF', '#FFFFFF']} iconBg="#FB8C07" icon={Images.championIcon} iconSize={17.3} value="24" valueColor="#FB8C07" label="Best Streak" style={rollIn(2)} />
          <StatCard gradient={['#F0F2FF', '#FFFFFF']} iconBg="#4584FE" icon={Images.riseArrowIcon} iconSize={19.9} value="12" valueColor="#4584FE" label="Average Streak" style={rollIn(3)} />
        </View>

        <LinearGradient colors={['#E5D8FF', '#FFFFFF']} style={styles.weekCard}>
          {DAYS.map((day, index) => (
            <DayColumn key={day} day={day} status={STATUSES[index]} shown={dayShown[index]} />
          ))}
        </LinearGradient>

        <View style={styles.overview}>
          <Animated.Text style={[styles.overviewTitle, rollIn(4)]}>Chores Overview</Animated.Text>
          <View style={styles.overviewRow}>
            <OverviewPill value="24" label="Completed" color="#2DA100" style={rollIn(5)} />
            <OverviewPill value="6" label="Skipped" color="#FB8C07" style={rollIn(6)} />
            <OverviewPill value="4" label="Missed" color="#FF5757" style={rollIn(7)} />
          </View>
        </View>
      </View>

      <View style={styles.canvas} pointerEvents="none">
        <Animated.Image
          source={Images.bunnyImg3}
          resizeMode="contain"
          style={[styles.bunny, { opacity: bunnyIn, transform: [{ translateY: Animated.add(bunnyIn.interpolate({ inputRange: [0, 1], outputRange: [s(40), 0] }), bunnyFloat) }] }]}
        />
      </View>

      <View style={styles.canvas} pointerEvents="none">
        <MarqueeRow cards={ROW_ONE} base={10} progress={scroll1} top={450 + MARQUEE_DROP} />
        <MarqueeRow cards={ROW_TWO} base={-80} progress={scroll2} top={504 + MARQUEE_DROP} />
        <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.marqueeFade} />
      </View>
    </View>
  );
}

function MarqueeRow({ cards, base, progress, top }: { cards: number[]; base: number; progress: Animated.Value; top: number }) {
  return (
    <View style={[styles.marqueeRow, { top: s(top) }]}>
      <Animated.View style={[styles.marqueeTrack, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [s(base), s(base - MARQUEE_UNIT)] }) }] }]}>
        {[0, 1, 2].flatMap(rep => cards.map((source, index) => (
          <Image key={`${rep}-${index}`} source={source} resizeMode="stretch" style={styles.marqueeCard} />
        )))}
      </Animated.View>
    </View>
  );
}

function StatCard({ gradient, iconBg, icon, iconSize, value, valueColor, label, style }: { gradient: [string, string]; iconBg: string; icon: number; iconSize: number; value: string; valueColor: string; label: string; style: object }) {
  return (
    <Animated.View style={[styles.statCard, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.statCardFill}>
        <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
          <Image source={icon} resizeMode="contain" style={{ width: s(iconSize), height: s(iconSize) }} tintColor={colors.white} />
        </View>
        <View style={styles.statText}>
          <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function DayColumn({ day, status, shown }: { day: string; status: Status; shown: Animated.Value }) {
  const circleColor = CIRCLE[status];
  const Glyph = GLYPH[status];
  return (
    <View style={styles.dayColumn}>
      <Text style={styles.dayLabel}>{day}</Text>
      <View style={styles.dayFace}>
        <Animated.Image source={Images.upcomingDayImg} resizeMode="contain" style={[styles.dayFaceArt, { opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />
        <Animated.Image
          source={FACE[status]}
          resizeMode="contain"
          style={[styles.dayFaceArt, { opacity: shown, transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}
        />
      </View>
      <View style={styles.statusCircle}>
        <Animated.View style={[styles.statusOutline, circleColor ? { opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) } : null]} />
        {circleColor ? (
          <Animated.View style={[styles.statusFill, { backgroundColor: circleColor, opacity: shown }]}>{Glyph ? <Glyph width={s(7)} height={s(7)} /> : null}</Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function OverviewPill({ value, label, color, style }: { value: string; label: string; color: string; style: object }) {
  return (
    <Animated.View style={[styles.pill, { backgroundColor: `${color}1F` }, style]}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const artScale = isSmallPhone || isBigPad ? 0.8 : 1;

/**
 * USER-REQUESTED DIVERGENCE FROM iOS (2026-08-19).
 *
 * iOS pins the marquee rows at y=450/504 and the fade at 540, which leaves the
 * scrolling cards ~2pt below the Chores Overview pills — visually touching.
 * The user asked for real separation, so all three shift down together by this
 * one value, preserving iOS's internal 54pt row pitch and 36pt fade offset.
 *
 * Change this number, not the individual tops.
 */
const MARQUEE_DROP = 16;

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  canvas: { position: 'absolute', top: 0, width: s(375), height: '100%', transform: [{ scale: artScale }], transformOrigin: 'top center' },

  streakHeader: { position: 'absolute', left: s(25.4), top: s(77), alignItems: 'flex-start', gap: s(3) },
  streakLabel: { ...font('bold', 16), letterSpacing: s(1) },
  streakValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: s(5) },
  streakValue: { ...font('bold', 43.77) },
  streakUnit: { ...font('medium', 18.36), color: colors.text, includeFontPadding: false },

  statCards: { position: 'absolute', left: s(25), top: s(162), flexDirection: 'row', gap: s(9.62) },
  statCard: { width: s(150.69), height: s(62), borderRadius: s(10.26), overflow: 'hidden' },
  statCardFill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(7.7), paddingLeft: s(8) },
  statIcon: { width: s(36), height: s(36), borderRadius: s(11.57), alignItems: 'center', justifyContent: 'center' },
  statText: { alignItems: 'flex-start', gap: s(1) },
  statValue: { ...font('bold', 16) },
  statLabel: { ...font('semibold', 12), color: colors.text },

  weekCard: { position: 'absolute', left: s(20), top: s(242.9), width: s(335), height: s(123.7), borderRadius: s(25), paddingHorizontal: s(10), flexDirection: 'row', alignItems: 'center' },
  dayColumn: { flex: 1, alignItems: 'center', gap: s(5.3) },
  dayLabel: { ...font('regular', 12.76), color: colors.text },
  dayFace: { width: s(47.9), height: s(47.9), alignItems: 'center', justifyContent: 'center' },
  dayFaceArt: { position: 'absolute', width: s(47.9), height: s(47.9) },
  statusCircle: { width: s(16), height: s(16), alignItems: 'center', justifyContent: 'center' },
  statusOutline: { ...StyleSheet.absoluteFillObject, borderRadius: s(8), borderWidth: s(1.3), borderColor: 'rgba(31,31,31,0.25)' },
  statusFill: { ...StyleSheet.absoluteFillObject, borderRadius: s(8), alignItems: 'center', justifyContent: 'center' },

  overview: { position: 'absolute', left: 0, right: 0, top: s(382.1), paddingHorizontal: s(20), alignItems: 'flex-start', gap: s(12) },
  /**
   * `includeFontPadding: false` IS LOAD-BEARING, not tidying.
   *
   * iOS lays this section out at a fixed `y: 382.1` and starts the marquee at
   * `y: 450`, leaving only ~2pt of clearance below the pills. Android's default
   * `includeFontPadding: true` adds ascender/descender padding around the title,
   * inflating this block by several points — which is exactly enough to push the
   * Completed/Skipped/Missed pills down into the scrolling cards. SwiftUI has no
   * equivalent padding, so switching it off restores iOS's own metrics.
   */
  overviewTitle: { ...font('semibold', 14), color: colors.text, includeFontPadding: false },
  overviewRow: { flexDirection: 'row', alignSelf: 'stretch', gap: s(13.6) },
  pill: { flex: 1, height: s(36.9), borderRadius: s(7.77), alignItems: 'center', justifyContent: 'center', gap: s(1) },
  pillValue: { ...font('bold', 9.71) },
  pillLabel: { ...font('medium', 9.71) },

  bunny: { position: 'absolute', left: s(243.8), top: s(34.8), width: s(123.3), height: s(169.1) },

  marqueeRow: { position: 'absolute', left: 0, width: s(375), height: s(72), overflow: 'hidden', justifyContent: 'flex-start' },
  marqueeTrack: { flexDirection: 'row', gap: s(1) },
  marqueeCard: { width: s(227), height: s(63.37) },
  marqueeFade: { position: 'absolute', left: 0, top: s(540 + MARQUEE_DROP), width: s(375), height: s(60) },
});
