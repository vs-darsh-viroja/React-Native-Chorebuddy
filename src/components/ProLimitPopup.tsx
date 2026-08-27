import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { PeekBunny, PeekHands } from '@/components/BottomSheet';
import { PressScale } from '@/components/motion';
import { colors, font, s } from '@/theme';
import { AppImage } from '@/components/AppImage';

/** iOS `ProLimitKind` with its exact title/message copy. */
export type ProLimitKind = 'chore' | 'zone' | 'markAllDone';

const COPY: Record<ProLimitKind, { title: string; message: string; usesHand: boolean }> = {
  chore: {
    title: 'Chore Limit Reached',
    message: 'You’ve reached your chore creation limit. Upgrade to Pro to create unlimited chores and keep everything organized.',
    usesHand: true,
  },
  zone: {
    title: 'Zone Limit Reached',
    message: 'You’ve reached your zone creation limit. Upgrade to Pro to create unlimited zones and organize your home your way.',
    usesHand: false,
  },
  markAllDone: {
    title: 'Complete All at Once',
    message: 'Mark all your chores as done in one tap with ChoreBuddy Pro.',
    usesHand: false,
  },
};

/**
 * iOS `ProLimitPopup`: a 325pt centred card with the peeking bunny, the
 * lock/hand art, and the May be later / Unlock Pro buttons. It springs in
 * (response .4, damping .85) and eases out over 200ms.
 */
export function ProLimitPopup({ kind, onUnlock, onClose }: { kind: ProLimitKind; onUnlock(): void; onClose(): void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const copy = COPY[kind];

  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.4) ** 2;
    Animated.spring(progress, { toValue: 1, stiffness, damping: 2 * 0.85 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
  }, [progress]);

  const close = (after: () => void) => {
    Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(after);
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close(onClose)} />
      <Animated.View style={[styles.popup, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        <View style={styles.peek} pointerEvents="none"><PeekBunny /></View>
        <View style={styles.card}>
          <View style={styles.iconArea}>
            <AppImage
              source={copy.usesHand ? Images.handIcon : Images.lockIcon}
              resizeMode="contain"
              style={copy.usesHand ? styles.handIcon : styles.lockIcon}
            />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.message}>{copy.message}</Text>
          <View style={styles.buttons}>
            <PressScale onPress={() => close(onClose)} style={[styles.button, styles.buttonPlain]}>
              <Text style={styles.buttonPlainLabel}>May be later</Text>
            </PressScale>
            <PressScale onPress={() => close(onUnlock)} style={[styles.button, styles.buttonFilled]}>
              <Text style={styles.buttonFilledLabel}>Unlock Pro</Text>
            </PressScale>
          </View>
        </View>
        <PeekHands style={styles.hands} />
      </Animated.View>
    </View>
  );
}

/** Shared helper so every locked control reaches the popup the same way iOS does. */
export function useProLimitHaptic() {
  return () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  popup: { width: s(325) },
  peek: { position: 'absolute', top: -s(91), left: 0, right: 0, alignItems: 'center' },
  hands: { top: -s(10), transform: [{ translateX: 0 }] },
  card: { width: s(325), borderRadius: s(41), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}33`, paddingHorizontal: s(20), paddingBottom: s(24), alignItems: 'center', boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(40), color: 'rgba(0,0,0,0.08)' }] },
  iconArea: { height: s(80), marginTop: s(35), alignItems: 'center', justifyContent: 'center' },
  handIcon: { width: s(80), height: s(80) },
  lockIcon: { width: s(120), height: s(120) },
  title: { ...font('semibold', 26), color: colors.text, textAlign: 'center', marginTop: s(36) },
  message: { ...font('regular', 18), color: `${colors.text}80`, textAlign: 'center', lineHeight: s(18 * 1.35), marginTop: s(15) },
  buttons: { flexDirection: 'row', gap: s(15), marginTop: s(44), alignSelf: 'stretch' },
  button: { flex: 1, height: s(48), borderRadius: s(24), alignItems: 'center', justifyContent: 'center' },
  buttonPlain: { backgroundColor: `${colors.purple}1A` },
  buttonFilled: { backgroundColor: colors.purple },
  buttonPlainLabel: { ...font('medium', 16), color: colors.text },
  buttonFilledLabel: { ...font('medium', 16), color: colors.white },
});
