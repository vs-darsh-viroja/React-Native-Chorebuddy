import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { colors, font, isBigPad, isSmallPhone, s } from '@/theme';
import { TopGlow, shadow, useFloat } from './parts';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

const FULL_NAME = 'Living Room';
const ICON_COUNT = 18;

const PALETTE = [
  { asset: Images.blueColorImg, top: '#C2ECFF', bottom: '#32ADE6', border: '#32ADE6' },
  { asset: Images.purpleColorImg, top: '#DDC2FF', bottom: '#D67DFF', border: '#D67DFF' },
  { asset: Images.greenColorImg, top: '#A1FFE9', bottom: '#00B792', border: '#00B792' },
  { asset: Images.yellowColorImg, top: '#FFE2B4', bottom: '#E9950D', border: '#E9950D' },
  { asset: Images.redColorImg, top: '#FFB2B2', bottom: '#ED595B', border: '#ED595B' },
  { asset: Images.darkBlueColorImg, top: '#C2D0FF', bottom: '#7D83FF', border: '#7D83FF' },
  { asset: Images.darkGreenColorImg, top: '#92EFFF', bottom: '#4DA4B3', border: '#4DA4B3' },
];

const ZONE_ICONS = [
  Images.zone1Icon, Images.zone2Icon, Images.zone3Icon, Images.zone4Icon, Images.zone5Icon, Images.zone6Icon,
  Images.zone7Icon, Images.zone8Icon, Images.zone9Icon, Images.zone10Icon, Images.zone11Icon, Images.zone12Icon,
  Images.zone13Icon, Images.zone14Icon, Images.zone15Icon, Images.zone16Icon, Images.zone17Icon, Images.zone18Icon,
];

/** iOS `OnboardingZoneView` — page 2, "Create Zones for Every Room". */
export function OnboardingZoneView({ isActive }: { isActive: boolean }) {
  const bunnyFloat = useFloat(-8, 1.8);
  const [typedName, setTypedName] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    // Reset before the early return so an INACTIVE page never holds stale
    // state to flash on its way back in (Rethrive's pager rule).
    setTypedName('');
    setColorIndex(0);
    setIconIndex(0);
    if (!isActive) return;
    const typers = Array.from({ length: FULL_NAME.length }, (_, i) => setTimeout(() => setTypedName(FULL_NAME.slice(0, i + 1)), (i + 1) * 130));
    const cycle = setInterval(() => {
      setColorIndex(current => (current + 1) % PALETTE.length);
      setIconIndex(current => (current + 1) % ICON_COUNT);
    }, 1000);
    return () => { typers.forEach(clearTimeout); clearInterval(cycle); };
  }, [isActive]);

  const swatch = PALETTE[colorIndex];

  return (
    <View style={styles.root}>
      <TopGlow height={301.2} />
      <View style={styles.designBlock}>
        <View style={styles.zoneCard}>
          <Text style={styles.zoneNameLabel}>Zone Name*</Text>
          <View style={styles.field}><Text style={styles.fieldText}>{typedName}</Text></View>
          <Text style={styles.iconLabel}>Icon</Text>
          <LinearGradient colors={[swatch.top, swatch.bottom]} style={[styles.headerTile, { borderColor: swatch.border }]}>
            <AppImage source={ZONE_ICONS[iconIndex]} resizeMode="contain" style={styles.headerTileIcon} tintColor={colors.white} />
          </LinearGradient>
        </View>

        <View style={styles.colorsSection}>
          <Text style={styles.sectionLabel}>COLORS</Text>
          <View style={styles.swatchRow}>
            {PALETTE.map((entry, index) => (
              <View key={index} style={styles.swatchCell}>
                <AppImage source={entry.asset} resizeMode="contain" style={styles.swatch} />
                <AppImage source={Images.checkIcon2} resizeMode="contain" style={[styles.swatchCheck, { opacity: colorIndex === index ? 1 : 0 }]} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.iconsSection}>
          <Text style={styles.sectionLabel}>ICONS</Text>
          <View style={styles.iconGrid}>
            {[0, 1, 2].map(row => (
              <View key={row} style={styles.iconRow}>
                {[0, 1, 2, 3, 4, 5].map(col => {
                  const index = row * 6 + col;
                  const selected = iconIndex === index;
                  return (
                    <View key={col} style={[styles.iconCell, selected && styles.iconCellSelected]}>
                      <AppImage source={ZONE_ICONS[index]} resizeMode="contain" style={styles.iconCellIcon} />
                      <AppImage source={Images.checkIcon3} resizeMode="contain" style={[styles.iconCellCheck, { opacity: selected ? 1 : 0 }]} />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <AnimatedAppImage source={Images.bunnyImg2} resizeMode="stretch" style={[styles.bunny, { transform: [{ translateY: bunnyFloat }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  designBlock: { width: s(375), height: s(540), transform: [{ scale: isSmallPhone || isBigPad ? 0.8 : 1 }], transformOrigin: 'top center' },

  zoneCard: { position: 'absolute', left: s(23.5), top: s(78), width: s(328), height: s(111.1), borderRadius: s(20.15), backgroundColor: colors.white, borderWidth: s(1.12), borderColor: 'rgba(0,0,0,0.1)', ...shadow('rgba(253,83,143,0.1)', 4.48, 4.48) },
  zoneNameLabel: { ...font('medium', 14), color: colors.text, position: 'absolute', left: s(14.9), top: s(19) },
  field: { position: 'absolute', left: s(14.9), top: s(48), width: s(165), height: s(44), borderRadius: s(10.57), backgroundColor: '#FAF9FE', borderWidth: s(0.66), borderColor: 'rgba(31,31,31,0.1)', justifyContent: 'center', paddingLeft: s(9.3) },
  fieldText: { ...font('medium', 15), color: colors.text },
  iconLabel: { ...font('medium', 13.6), color: colors.text, position: 'absolute', left: s(200.3), top: s(19.7) },
  headerTile: { position: 'absolute', left: s(189.9), top: s(49.3), width: s(46.8), height: s(46.8), borderRadius: s(15.59), borderWidth: s(0.97), alignItems: 'center', justifyContent: 'center', ...shadow('rgba(0,0,0,0.3)', 5.85, 2.92) },
  headerTileIcon: { width: s(29.2), height: s(29.2) },

  sectionLabel: { ...font('medium', 15), color: colors.text },
  colorsSection: { position: 'absolute', left: s(23.5), top: s(244.3), alignItems: 'flex-start', gap: s(17) },
  swatchRow: { flexDirection: 'row', gap: s(10.6) },
  swatchCell: { width: s(37.7), height: s(37.7), alignItems: 'center', justifyContent: 'center' },
  swatch: { width: s(37.7), height: s(37.7) },
  swatchCheck: { position: 'absolute', width: s(16.7), height: s(16.7) },

  iconsSection: { position: 'absolute', left: s(22), top: s(337.3), alignItems: 'flex-start', gap: s(12.1) },
  iconGrid: { gap: s(9.3) },
  iconRow: { flexDirection: 'row', gap: s(9.3) },
  iconCell: { width: s(46.9), height: s(46.9), borderRadius: s(14.58), backgroundColor: colors.white, borderWidth: s(1.04), borderColor: 'rgba(31,31,31,0.1)', alignItems: 'center', justifyContent: 'center', ...shadow('rgba(0,0,0,0.1)', 5.3, 2.65) },
  iconCellSelected: { borderColor: colors.purple },
  iconCellIcon: { width: s(25), height: s(25) },
  iconCellCheck: { position: 'absolute', right: s(-6.2), top: s(-6.7), width: s(20.8), height: s(20.8) },

  bunny: { position: 'absolute', left: s(251.7), top: s(109.8), width: s(110.72), height: s(164.6) },
});
