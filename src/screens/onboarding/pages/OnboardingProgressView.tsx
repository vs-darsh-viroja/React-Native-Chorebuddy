import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import { Images } from '@/constants/assets';
import { colors, font, isPad, isSmallPhone, s } from '@/theme';
import { shadow, spring, useFloat } from './parts';

const RING_SWEEP = 0.391;
const RING_RADIUS = 48.5;
const RING_PAD = 4.5; // the 9pt stroke straddles the inscribed path, so the SVG canvas has to be wider
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** iOS `OnboardingProgressView` — page 1, "Keep Your Home Organized". */
export function OnboardingProgressView({ isActive }: { isActive: boolean }) {
  const bunnyFloat = useFloat(-8, 1.8);
  const tasks = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;
    tasks.forEach(value => value.setValue(0));
    ring.setValue(0);
    const timers = tasks.map((value, index) => setTimeout(() => spring(value, 1, 0.55, 0.8).start(), 250 + index * 180));
    const ringTimer = setTimeout(() => Animated.timing(ring, { toValue: 1, duration: 1000, useNativeDriver: false }).start(), 350);
    return () => { timers.forEach(clearTimeout); clearTimeout(ringTimer); };
  }, [isActive, tasks, ring]);

  return (
    <View style={styles.root}>
      <View style={styles.headRow}>
        <ProgressCard ring={ring} />
        <Animated.Image source={Images.bunnyImg1} resizeMode="stretch" style={[styles.bunny, { transform: [{ translateY: bunnyFloat }] }]} />
      </View>
      <View style={styles.taskStack}>
        <View style={styles.taskRowLeft}><TaskCard source={Images.task1Img} shown={tasks[0]} /></View>
        <View style={styles.taskRowCenter}><TaskCard source={Images.task2Img} shown={tasks[1]} /></View>
        <View style={styles.taskRowRight}><TaskCard source={Images.task3Img} shown={tasks[2]} /></View>
      </View>
    </View>
  );
}

/** iOS: a clear 232x58 layout box overlaid with the 262x88 artwork. */
function TaskCard({ source, shown }: { source: number; shown: Animated.Value }) {
  return (
    <Animated.View style={[styles.taskBox, { opacity: shown, transform: [{ translateX: shown.interpolate({ inputRange: [0, 1], outputRange: [-s(40), 0] }) }] }]}>
      <Image source={source} resizeMode="stretch" style={styles.taskArt} />
    </Animated.View>
  );
}

function ProgressCard({ ring }: { ring: Animated.Value }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={['#FB4786', '#FD6A96']} style={styles.headerBadge}>
          <Images.calendarGlyphIcon width={s(20)} height={s(20)} />
        </LinearGradient>
        <Text style={styles.headerLabel}>Today’s Progress</Text>
      </View>
      <View style={styles.ring}>
        <Svg width={s(97 + RING_PAD * 2)} height={s(97 + RING_PAD * 2)} style={StyleSheet.absoluteFill}>
          <Circle cx={s(53)} cy={s(53)} r={s(RING_RADIUS)} stroke="#FDE6F1" strokeWidth={s(8.5)} fill="none" />
          {/* SwiftUI trims from 3 o'clock clockwise, then rotates -90 and mirrors X. */}
          <G transform={`translate(${s(53)} ${s(53)}) scale(-1 1) rotate(-90) translate(${-s(53)} ${-s(53)})`}>
            <AnimatedCircle
              cx={s(53)}
              cy={s(53)}
              r={s(RING_RADIUS)}
              stroke={colors.purple}
              strokeWidth={s(9)}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[s(CIRCUMFERENCE), s(CIRCUMFERENCE)]}
              strokeDashoffset={ring.interpolate({ inputRange: [0, 1], outputRange: [s(CIRCUMFERENCE), s(CIRCUMFERENCE * (1 - RING_SWEEP))] })}
            />
          </G>
        </Svg>
        <View style={styles.ringCount}>
          <Text style={styles.ringValue}>4</Text>
          <Text style={styles.ringTotal}>/6</Text>
        </View>
        <Text style={styles.ringCaption}>Chores Completed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: s(isSmallPhone ? 44 : 76.68) },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: s(197), gap: s(isPad ? 64.81 : 34.81) },
  bunny: { width: s(124), height: s(194) },
  taskStack: { marginTop: s(37), gap: s(11) },
  taskRowLeft: { alignItems: 'flex-start', paddingLeft: s(isPad ? 81.5 : 31.5) },
  taskRowCenter: { alignItems: 'center' },
  taskRowRight: { alignItems: 'flex-end', paddingRight: s(isPad ? 81.5 : 31.5) },
  taskBox: { width: s(232), height: s(58) },
  taskArt: { position: 'absolute', left: s(-15), top: s(-15), width: s(262), height: s(88) },

  card: { width: s(156), height: s(197), borderRadius: s(18), backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', ...shadow('rgba(253,83,143,0.1)', 4, 4) },
  cardHeader: { position: 'absolute', left: s(22), top: s(20), flexDirection: 'row', alignItems: 'center', gap: s(7) },
  headerBadge: { width: s(32), height: s(32), borderRadius: s(10), borderWidth: s(0.89), borderColor: 'rgba(31,31,31,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerLabel: { ...font('bold', 16), color: colors.text, width: s(85), textAlign: 'center' },
  ring: { position: 'absolute', left: s(32 - RING_PAD), top: s(77 - RING_PAD), width: s(97 + RING_PAD * 2), height: s(97 + RING_PAD * 2), alignItems: 'center', justifyContent: 'center' },
  ringCount: { flexDirection: 'row', alignItems: 'baseline', gap: s(1) },
  ringValue: { ...font('semibold', 28), color: colors.text },
  ringTotal: { ...font('medium', 16), color: 'rgba(31,31,31,0.5)' },
  ringCaption: { ...font('regular', 10), letterSpacing: s(0.5), color: 'rgba(31,31,31,0.5)', width: s(66), textAlign: 'center', marginTop: s(2) },
});
