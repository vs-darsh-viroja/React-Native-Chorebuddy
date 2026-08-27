import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Images } from '@/constants/assets';
import { isBigPad, isSmallPhone, s } from '@/theme';
import { FadeOutMask, TopGlow, spring, useFloat } from './parts';
import { AnimatedAppImage } from '@/components/AppImage';

const TASK_SLIDE = 55;
const TASKS = [
  { source: Images.storageTaskImg, width: 296, height: 100, x: 0, y: 0 },
  { source: Images.floorTaskImg, width: 283.8, height: 99.7, x: 6.1, y: 86 },
  { source: Images.towelsTaskImg, width: 264.8, height: 89.8, x: 15.6, y: 170 },
  { source: Images.windowsTaskImg, width: 227, height: 65.8, x: 34.5, y: 248 },
];

/** iOS `OnboardingCalendarView` — page 3, "Never Miss a Chore Again". */
export function OnboardingCalendarView({ isActive }: { isActive: boolean }) {
  const bunnyDip = useFloat(70, 1.3);
  const tasks = useRef(TASKS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Reset before the early return so an INACTIVE page never holds stale
    // state to flash on its way back in (Rethrive's pager rule).
    tasks.forEach(value => value.setValue(0));
    if (!isActive) return;
    const timers = tasks.map((value, index) => setTimeout(() => spring(value, 1, 0.55, 0.82).start(), 250 + index * 140));
    return () => timers.forEach(clearTimeout);
  }, [isActive, tasks]);

  return (
    <View style={styles.root}>
      <TopGlow height={301.2} />
      <View style={styles.canvas}>
        {/* Task cards sit behind the calendar and fade out toward the bottom. */}
        <View style={styles.tasksLayer}>
          {TASKS.map((task, index) => (
            <AnimatedAppImage
              key={index}
              source={task.source}
              resizeMode="stretch"
              style={{
                position: 'absolute',
                left: s(task.x),
                top: s(task.y),
                width: s(task.width),
                height: s(task.height),
                opacity: tasks[index],
                transform: [{ translateY: tasks[index].interpolate({ inputRange: [0, 1], outputRange: [s(TASK_SLIDE), 0] }) }],
              }}
            />
          ))}
          <FadeOutMask opaqueUntil={0.7} clearFrom={0.95} />
        </View>

        {/* The bunny face slides down behind the calendar to produce the peek. */}
        <AnimatedAppImage source={Images.bunnyFaceImg} resizeMode="stretch" style={[styles.bunnyFace, { transform: [{ translateY: bunnyDip }] }]} />
        <AnimatedAppImage source={Images.calendarImg} resizeMode="stretch" style={styles.calendar} />
        <AnimatedAppImage source={Images.bunnyRightHandImg} resizeMode="stretch" style={styles.rightHand} />
        <AnimatedAppImage source={Images.bunnyLeftHandImg} resizeMode="stretch" style={styles.leftHand} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  canvas: { flex: 1, transform: [{ scale: isSmallPhone || isBigPad ? 0.8 : 1 }], transformOrigin: 'top center' },
  tasksLayer: { position: 'absolute', left: s(39.1), top: s(245), width: s(296), height: s(320) },
  bunnyFace: { position: 'absolute', left: s(153.6), top: s(70.6), width: s(63.2), height: s(74.1) },
  calendar: { position: 'absolute', left: 0, top: s(127.4), width: s(375), height: s(112) },
  rightHand: { position: 'absolute', left: s(147.5), top: s(131.4), width: s(16.6), height: s(15) },
  leftHand: { position: 'absolute', left: s(210.9), top: s(131.4), width: s(16.6), height: s(15) },
});
