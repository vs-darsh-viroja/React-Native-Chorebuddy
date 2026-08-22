import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, isBigPad, isPad, isSmallPhone, s } from '@/theme';
import { FadeOutMask, TopGlow, artShadow } from './parts';

const BASE_SIZE = 75;
const AVATARS = [
  Images.avatarIcon2, Images.avatarIcon3, Images.avatarIcon4, Images.avatarIcon5, Images.avatarIcon6,
  Images.avatarIcon7, Images.avatarIcon8, Images.avatarIcon9, Images.avatarIcon10, Images.avatarIcon11, Images.avatarIcon12,
];
const SLOTS = [
  { x: 40.7, y: 421.2, size: 45.6 },
  { x: 259.0, y: 432.6, size: 51.7 },
  { x: 292.3, y: 370.3, size: 45.6 },
  { x: 69.7, y: 351.3, size: 38.0 },
  { x: 149.9, y: 393.1, size: 66.9 },
  { x: 236.9, y: 335.0, size: 36.0 },
  { x: 293.9, y: 273.0, size: 50.2 },
  { x: 31.0, y: 281.4, size: 38.0 },
  { x: 236.9, y: 238.8, size: 35.0 },
  { x: 91.8, y: 229.0, size: 42.6 },
  { x: 140.9, y: 264.4, size: 75.0 },
];

const slotX = (slot: (typeof SLOTS)[number]) => s(slot.x + slot.size / 2 - BASE_SIZE / 2);
const slotY = (slot: (typeof SLOTS)[number]) => s(slot.y + slot.size / 2 - BASE_SIZE / 2);

/** iOS `OnboardingAvatarView` — page 4, "Assign Chores to Members". */
export function OnboardingAvatarView({ isActive }: { isActive: boolean }) {
  const crown = useRef(new Animated.Value(1)).current;
  const drift = useMemo(
    () => SLOTS.map((_, index) => ({
      x: new Animated.Value(slotX(SLOTS[index])),
      y: new Animated.Value(slotY(SLOTS[index])),
      scale: new Animated.Value(SLOTS[index].size / BASE_SIZE),
    })),
    [],
  );

  useEffect(() => {
    const step = (toValue: number) => Animated.timing(crown, { toValue, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(1.12), step(1)]));
    loop.start();
    return () => loop.stop();
  }, [crown]);

  useEffect(() => {
    if (!isActive) return;
    const shuffle = () => {
      const order = SLOTS.map((_, index) => index);
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const timing = (value: Animated.Value, toValue: number) => Animated.timing(value, { toValue, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true });
      Animated.parallel(
        drift.flatMap((entry, index) => {
          const slot = SLOTS[order[index]];
          const jitter = 0.92 + Math.random() * 0.16;
          return [timing(entry.x, slotX(slot)), timing(entry.y, slotY(slot)), timing(entry.scale, (slot.size / BASE_SIZE) * jitter)];
        }),
      ).start();
    };
    const first = setTimeout(shuffle, 2000);
    const repeat = setInterval(shuffle, 5500);
    return () => { clearTimeout(first); clearInterval(repeat); };
  }, [isActive, drift]);

  return (
    <View style={styles.root}>
      <TopGlow height={301.2} />
      <View style={styles.designBlock}>
        <View style={styles.cluster}>
          {AVATARS.map((source, index) => (
            <Animated.Image
              key={index}
              source={source}
              resizeMode="contain"
              style={[styles.avatar, { transform: [{ translateX: drift[index].x }, { translateY: drift[index].y }, { scale: drift[index].scale }] }]}
            />
          ))}
          <FadeOutMask opaqueUntil={0.754} clearFrom={0.968} />
        </View>

        <View style={styles.ownerCard}>
          <View style={styles.ownerPlate}>
            <View style={styles.plateCircleTop} />
            <View style={styles.plateCircleBottom} />
          </View>
          <Image source={Images.avatarIcon1} resizeMode="stretch" style={styles.ownerAvatar} />
          <View style={styles.ownerText}>
            <Text style={styles.ownerName}>Alisa</Text>
            <Text style={styles.ownerRole}>Home Owner</Text>
          </View>
          <Animated.Image source={Images.crownIcon2} resizeMode="stretch" style={[styles.crown, { transform: [{ scale: crown }] }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  designBlock: { width: s(isPad ? 475 : 375), height: s(500), transform: [{ scale: isSmallPhone || isBigPad ? 0.8 : 1 }], transformOrigin: 'top center' },
  cluster: { position: 'absolute', top: 0, alignSelf: 'center', width: s(375), height: s(500) },
  avatar: { position: 'absolute', left: 0, top: 0, width: s(BASE_SIZE), height: s(BASE_SIZE) },

  ownerCard: { position: 'absolute', left: s(22.5), top: s(80), width: s(isPad ? 430 : 330), height: s(104.3) },
  ownerPlate: { ...StyleSheet.absoluteFillObject, borderRadius: s(21.04), backgroundColor: colors.purple, borderWidth: s(0.96), borderColor: 'rgba(31,31,31,0.1)', overflow: 'hidden' },
  plateCircleTop: { position: 'absolute', left: s(218.7), top: s(-61.9), width: s(132.3), height: s(132.3), borderRadius: s(66.15), backgroundColor: 'rgba(255,255,255,0.05)' },
  plateCircleBottom: { position: 'absolute', left: s(-40.6), top: s(46.7), width: s(111), height: s(111), borderRadius: s(55.5), backgroundColor: 'rgba(255,255,255,0.05)' },
  ownerAvatar: { position: 'absolute', left: s(4.3), top: s(6.4), width: s(111), height: s(105) },
  ownerText: { position: 'absolute', left: s(115.4), top: s(16.4), alignItems: 'flex-start', gap: s(8.6) },
  ownerName: { ...font('semibold', 24.6), color: colors.white },
  ownerRole: { ...font('medium', 14.8), color: colors.white, width: s(104.7), height: s(27.1), lineHeight: s(27.1), textAlign: 'center', borderRadius: s(9.86), backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  crown: { position: 'absolute', left: s(70.5), top: s(20), width: s(31.5), height: s(26.4), ...artShadow('rgba(0,0,0,0.25)', 4.9, 4.9) },
});
