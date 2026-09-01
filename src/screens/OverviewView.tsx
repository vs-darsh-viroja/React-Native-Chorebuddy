import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph } from '@/components/glyphs';
import { CircleButton, useFloat } from '@/components/motion';
import { useChores } from '@/services/ChoreContext';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

const GREEN = '#2DA100';
const ORANGE = '#FB8C07';
const RED = '#FF5757';
const SEGMENTS = [
  { key: 'completed', title: 'Completed', accent: GREEN, outcome: 'done' },
  { key: 'skipped', title: 'Skipped', accent: ORANGE, outcome: 'skipped' },
  { key: 'missed', title: 'Missed', accent: RED, outcome: 'missed' },
] as const;

const formatDay = (day: string) => { const date = new Date(`${day}T00:00:00`); return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`; };

/** iOS `OverviewView`: header with back + delete-history, floating mascot, name/zone row, tri-segment control, and the swipeable dated history card. */
export function OverviewView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Overview'>) {
  const store = useChores();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const float = useFloat(8, 1.8);
  const [segment, setSegment] = useState(0);
  const pager = useRef<ScrollView>(null);
  const thumb = useRef(new Animated.Value(0)).current;

  /** Params carry the already-filtered dates from Stats; the Chart screen pushes without them, so fall back to live events. */
  const rows = useMemo(() => {
    const fromParams = [route.params.doneDates, route.params.skippedDates, route.params.missedDates];
    if (fromParams.every(list => Array.isArray(list))) return fromParams as string[][];
    return SEGMENTS.map(({ outcome }) => store.events.filter(event => event.choreId === route.params.choreId && event.outcome === outcome).sort((a, b) => b.day.localeCompare(a.day)).map(event => formatDay(event.day)));
  }, [route.params, store.events]);

  const zone = route.params.zone ?? store.chores.find(chore => chore.id === route.params.choreId)?.zoneName ?? '';
  const segmentWidth = (width - s(30) - s(10)) / 3;

  const selectSegment = (index: number) => {
    if (index === segment) return;
    void Haptics.selectionAsync();
    setSegment(index);
    const stiffness = (2 * Math.PI / 0.35) ** 2;
    Animated.spring(thumb, { toValue: index, stiffness, damping: 2 * 0.85 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
    pager.current?.scrollTo({ x: index * width, animated: true });
  };

  const confirmDelete = () => {
    Alert.alert('Delete History', `This will permanently delete all history for "${route.params.name}". This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.deleteChoreEvents(route.params.choreId); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          <CircleButton onPress={confirmDelete}>
            <Images.deleteIcon width={s(20)} height={s(20)} />
          </CircleButton>
        </View>
      </View>

      <AnimatedAppImage source={Images.overviewMascot} resizeMode="contain" style={[styles.mascot, { transform: [{ translateY: float }] }]} />

      <View style={styles.nameBlock}>
        <Text style={styles.name}>{route.params.name}</Text>
        <View style={styles.zoneRow}>
          <View style={styles.zoneDot} />
          <Text style={styles.zoneName}>{zone}</Text>
        </View>
      </View>

      <View style={styles.segment}>
        <Animated.View style={[styles.thumb, { width: segmentWidth, backgroundColor: SEGMENTS[segment].accent, transform: [{ translateX: thumb.interpolate({ inputRange: [0, 1, 2], outputRange: [0, segmentWidth, segmentWidth * 2] }) }] }]} />
        {SEGMENTS.map((item, index) => (
          <Pressable key={item.key} onPress={() => selectSegment(index)} style={styles.segmentButton}>
            <Text style={[styles.segmentLabel, { color: segment === index ? colors.white : `${item.accent}CC` }, segment === index && styles.segmentLabelOn]}>{item.title}</Text>
          </Pressable>
        ))}
      </View>

      {/*
        * iOS's card is the flexible element in a VStack that ignores the safe area,
        * so it ends exactly 30 above the screen edge — where an iPhone's home
        * indicator sits. Android's window includes the navigation-bar zone under
        * edge-to-edge, and s(30) is ~34dp against a 48dp three-button bar, so the
        * card's bottom edge and its rounded corners were rendering BEHIND the bar.
        */}
      <View style={[styles.listCard, { marginBottom: Math.max(s(30), insets.bottom + s(12)) }]}>
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => selectSegment(Math.round(event.nativeEvent.contentOffset.x / width))}
        >
          {SEGMENTS.map((item, index) => (
            <ScrollView key={item.key} showsVerticalScrollIndicator={false} style={{ width: width - s(30) }} contentContainerStyle={styles.listContent}>
              {rows[index].length === 0 ? (
                <Text style={styles.emptyText}>Nothing here yet.</Text>
              ) : rows[index].map((date, rowIndex) => (
                <React.Fragment key={`${date}-${rowIndex}`}>
                  {rowIndex > 0 && <View style={styles.divider} />}
                  <View style={styles.dateRow}>
                    <View style={[styles.mark, { backgroundColor: `${item.accent}1A` }]}>
                      {item.key === 'completed' ? <CheckmarkGlyph width={s(8)} height={s(6)} color={item.accent} strokeWidth={1.8} />
                        : item.key === 'skipped' ? <View style={[styles.bar, { backgroundColor: item.accent }]} />
                          : <View style={styles.cross}>
                            <View style={[styles.bar, { backgroundColor: item.accent, transform: [{ rotate: '45deg' }] }]} />
                            <View style={[styles.bar, { backgroundColor: item.accent, position: 'absolute', transform: [{ rotate: '-45deg' }] }]} />
                          </View>}
                    </View>
                    <Text style={styles.dateText}>{date}</Text>
                  </View>
                </React.Fragment>
              ))}
            </ScrollView>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(59), paddingHorizontal: s(15), height: s(99), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 24), color: colors.text },
  headerButtons: { position: 'absolute', top: s(59), left: s(15), right: s(15), flexDirection: 'row', justifyContent: 'space-between' },
  headerIcon: { width: s(20), height: s(20) },
  mascot: { alignSelf: 'center', marginTop: s(22), height: s(164) },
  nameBlock: { paddingHorizontal: s(15), marginTop: s(20), gap: s(4) },
  name: { ...font('semibold', 30), color: colors.text },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  zoneDot: { width: s(5), height: s(5), borderRadius: s(2.5), backgroundColor: `${colors.text}80` },
  zoneName: { ...font('regular', 14), color: `${colors.text}80` },
  segment: { marginHorizontal: s(15), marginTop: s(20), padding: s(5), borderRadius: s(15), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row' },
  thumb: { position: 'absolute', left: s(5), top: s(5), height: s(40), borderRadius: s(12), borderWidth: 1, borderColor: '#0B254533' },
  segmentButton: { flex: 1, height: s(40), alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { ...font('medium', 14) },
  segmentLabelOn: { ...font('semibold', 14), color: colors.white },
  listCard: { flex: 1, marginHorizontal: s(15), marginTop: s(20), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, overflow: 'hidden', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  listContent: { padding: s(15) },
  emptyText: { ...font('regular', 14), color: `${colors.text}66`, textAlign: 'center', paddingVertical: s(24) },
  dateRow: { height: s(26), flexDirection: 'row', alignItems: 'center', gap: s(10) },
  divider: { height: 1, backgroundColor: `${colors.text}14`, marginLeft: s(34), marginVertical: s(12) },
  mark: { width: s(24), height: s(24), borderRadius: s(12), alignItems: 'center', justifyContent: 'center' },
  bar: { width: s(8), height: s(2), borderRadius: s(1) },
  cross: { width: s(8), height: s(8), alignItems: 'center', justifyContent: 'center' },
  dateText: { ...font('regular', 14), color: colors.text },
});
