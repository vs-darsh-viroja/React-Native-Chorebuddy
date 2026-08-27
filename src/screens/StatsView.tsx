import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CircleButton, PressScale, SlideInCard, SoftGlow, useFloat } from '@/components/motion';
import { StatsFilterSheet, emptyFilter, filterIsActive, type StatsFilter } from '@/components/StatsFilterSheet';
import { GradientText } from '@/screens/onboarding/pages/parts';
import { useChores, type ChoreEvent, type StatsRange } from '@/services/ChoreContext';
import { usePurchases } from '@/services/PurchaseManager';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GREEN = '#2DA100';
const ORANGE = '#FB8C07';
const RED = '#FF5757';
const BLUE = '#4584FE';
const PINK_RAMP: [string, string] = ['#FB4786', '#FD6A96'];

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/** iOS `weekRange`/`monthRange` (Sunday-first weeks), returned as yyyy-MM-dd bounds. */
function periodRange(filter: StatsFilter): StatsRange {
  const now = new Date();
  switch (filter.period) {
    case 'thisWeek': case 'prevWeek': {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay() + (filter.period === 'prevWeek' ? -7 : 0));
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start: dayKey(start), end: dayKey(end) };
    }
    case 'thisMonth': case 'prevMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() + (filter.period === 'prevMonth' ? -1 : 0), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { start: dayKey(start), end: dayKey(end) };
    }
    case 'custom':
      if (filter.customStart && filter.customEnd) return { start: filter.customStart, end: filter.customEnd };
      return { start: dayKey(now), end: dayKey(now) };
    default: return null;
  }
}

const face = (outcome: string) => outcome === 'done' ? Images.statsFaceHappy : outcome === 'missed' ? Images.statsFaceMissed : outcome === 'skipped' ? Images.statsFaceSkipped : Images.statsFaceIdle;

/** iOS `StatsView`: streak label + card with the week faces, Best/Average streak cards, legend + filter, slide-in overview rows, and the filter sheet. */
export function StatsView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useChores();
  const { hasPro } = usePurchases();
  const [filter, setFilter] = useState<StatsFilter>(emptyFilter);
  const [showFilter, setShowFilter] = useState(false);
  const [cardsAppeared, setCardsAppeared] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCardsAppeared(true), 50);
    return () => clearTimeout(timer);
  }, []);

  /**
   * All of this is memoised on the store + filter. It used to run on EVERY
   * render, so merely opening or closing the filter sheet re-ran the whole
   * stats engine — three separate `perfectStreakDays` passes, two `statsEvents`
   * passes, `weekStatuses` filtering the event list seven times, and a full
   * re-format of every event date. That is what made the sheet take seconds to
   * appear and left the peeking bunny frozen on screen after dismissal: the JS
   * thread was busy, so neither the mount nor the exit animation could run.
   * `store` is the memoised context value, so a local `showFilter` toggle no
   * longer invalidates any of it.
   */
  const filteredEvents = useMemo(() => store.statsEvents(filter.memberIds, filter.zones, periodRange(filter)), [store, filter]);
  const streakEvents = useMemo(() => (filter.memberIds.length ? store.statsEvents(filter.memberIds, [], null) : store.events), [store, filter]);
  const streak = useMemo(() => store.currentStreak(filter.memberIds), [store, filter]);
  const best = useMemo(() => store.bestStreak(filter.memberIds), [store, filter]);
  const average = useMemo(() => store.averageStreak(filter.memberIds), [store, filter]);
  const weekStatuses = useMemo(() => store.weekStatuses(streakEvents, filter.memberIds), [store, streakEvents, filter]);
  const count = (outcome: string) => filteredEvents.filter(event => event.outcome === outcome).length;

  /** iOS `overview(_:includeChores:)`: every filter-matching chore plus event-only chores, dates newest-first as "EEE, d MMM yyyy". */
  const overviewRows = useMemo(() => {
    // Built by hand rather than with `toLocaleDateString`: this formats every
    // event date (two Intl calls each), and Intl is slow enough on Hermes that
    // a few hundred events cost seconds. Output is identical — "Thu, 27 Aug 2026".
    const format = (day: string) => {
      const [year, month, date] = day.split('-').map(Number);
      const weekday = WEEKDAY_SHORT[new Date(year, month - 1, date).getDay()];
      return `${weekday}, ${date} ${MONTH_SHORT[month - 1]} ${year}`;
    };
    const dates = (list: ChoreEvent[], outcome: string) => list.filter(event => event.outcome === outcome).sort((a, b) => b.day.localeCompare(a.day)).map(event => format(event.day));
    const byChore = new Map<string, ChoreEvent[]>();
    filteredEvents.forEach(event => byChore.set(event.choreId, [...(byChore.get(event.choreId) ?? []), event]));
    const seen = new Set<string>();
    const rows = store.overviewChores(filter.memberIds, filter.zones).map(chore => {
      seen.add(chore.id);
      const list = byChore.get(chore.id) ?? [];
      return { id: chore.id, name: chore.name, zone: chore.zoneName, doneDates: dates(list, 'done'), skippedDates: dates(list, 'skipped'), missedDates: dates(list, 'missed') };
    });
    byChore.forEach((list, choreId) => {
      if (seen.has(choreId)) return;
      rows.push({ id: choreId, name: list[0]?.choreName ?? '', zone: list[0]?.zoneName ?? '', doneDates: dates(list, 'done'), skippedDates: dates(list, 'skipped'), missedDates: dates(list, 'missed') });
    });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [store, filter, filteredEvents]);

  return (
    <View style={styles.root}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Stats & Progress</Text>
        <View style={styles.titleActions}>
          <CircleButton onPress={() => navigation.push('Settings')}>
            <AppImage source={Images.settingsIcon} resizeMode="contain" style={styles.titleIcon} />
          </CircleButton>
          {!hasPro && (
            <CircleButton onPress={() => navigation.push('Paywall')} background={colors.purple} borderColor={colors.white}>
              <AppImage source={Images.crownIcon} resizeMode="contain" style={styles.titleIcon} />
            </CircleButton>
          )}
        </View>
      </View>

      {store.chores.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {streak > 0 && (
            <View style={styles.streakLabel}>
              <View style={styles.fireBadge}>
                <AppImage source={Images.statsFireIcon} resizeMode="contain" style={styles.fireIcon} />
              </View>
              <View style={styles.streakLabelCopy}>
                <Text style={styles.streakLabelTitle}>Streak</Text>
                <Text style={styles.streakLabelSub}>Keep it up! You're doing great!</Text>
              </View>
            </View>
          )}
          <StreakCard streak={streak} statuses={weekStatuses} />
          <View style={styles.statCards}>
            <StatCard icon={Images.statsChampionIcon} tint={ORANGE} value={best} label="Best Streak" gradientTop="#FFF5F0" />
            <StatCard icon={Images.statsRiseIcon} tint={BLUE} value={average} label="Average Streak" gradientTop="#F1F3FF" />
          </View>

          <Text style={styles.overviewTitle}>Chores Overview</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendPills}>
              <LegendPill count={count('done')} label="Completed" color={GREEN} />
              <LegendPill count={count('skipped')} label="Skipped" color={ORANGE} />
              <LegendPill count={count('missed')} label="Missed" color={RED} />
            </View>
            <View style={styles.legendDivider} />
            <PressScale onPress={() => setShowFilter(true)} style={styles.filterButton}>
              <AppImage source={Images.filterIcon} resizeMode="contain" style={styles.filterIcon} />
              {filterIsActive(filter) && <View style={styles.filterDot} />}
            </PressScale>
          </View>

          <View style={styles.overviewList}>
            {overviewRows.map((row, index) => (
              <SlideInCard key={row.id} index={index} appeared={cardsAppeared}>
                <PressScale haptic="light" onPress={() => navigation.push('Overview', { name: row.name, choreId: row.id, zone: row.zone, doneDates: row.doneDates, skippedDates: row.skippedDates, missedDates: row.missedDates })} style={styles.overviewCard}>
                  <View style={styles.overviewCopy}>
                    <Text style={styles.overviewName}>{row.name}</Text>
                    <View style={styles.zoneRow}>
                      <View style={styles.zoneDot} />
                      <Text style={styles.zoneName}>{row.zone}</Text>
                    </View>
                  </View>
                  <View style={styles.overviewStats}>
                    <OverviewStat value={row.doneDates.length} label="Done" color={GREEN} />
                    <OverviewStat value={row.skippedDates.length} label="Skipped" color={ORANGE} />
                    <OverviewStat value={row.missedDates.length} label="Missed" color={RED} />
                  </View>
                </PressScale>
              </SlideInCard>
            ))}
          </View>
        </ScrollView>
      )}

      {showFilter && (
        <StatsFilterSheet initial={filter} onSave={next => { setFilter(next); setShowFilter(false); }} onClose={() => setShowFilter(false)} />
      )}
    </View>
  );
}

/** iOS `streakCard`: FFEDF4→white panel, floating mascot, pink-gradient CURRENT STREAK figures, Mon–Sun faces with status glyphs. */
function StreakCard({ streak, statuses }: { streak: number; statuses: Array<{ name: string; outcome: string }> }) {
  const float = useFloat(8, 1.8);
  return (
    <LinearGradient colors={['#FFEDF4', colors.white]} style={styles.streakCard}>
      <View style={styles.streakTop}>
        <AnimatedAppImage source={Images.statsStreakMascot} resizeMode="contain" style={[styles.mascot, { transform: [{ translateY: float }] }]} />
        <View style={styles.streakFigures}>
          <GradientText value="CURRENT STREAK" style={{ ...font('medium', 18) }} ramp={PINK_RAMP} />
          <View style={styles.daysRow}>
            <GradientText value={String(streak)} style={{ ...font('bold', 42) }} ramp={PINK_RAMP} />
            <Text style={styles.daysLabel}>Days</Text>
          </View>
        </View>
      </View>
      <View style={styles.weekRow}>
        {statuses.map(day => (
          <View key={day.name} style={styles.dayColumn}>
            <Text style={styles.dayName}>{day.name}</Text>
            <AppImage source={face(day.outcome)} resizeMode="contain" style={styles.face} />
            {day.outcome === 'done' ? <AppImage source={Images.statsCheck} style={styles.statusGlyph} />
              : day.outcome === 'missed' ? <AppImage source={Images.statsCross} style={styles.statusGlyph} />
                : day.outcome === 'skipped' ? <AppImage source={Images.statsDash} style={styles.statusGlyph} />
                  : <View style={styles.statusEmpty} />}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

function StatCard({ icon, tint, value, label, gradientTop }: { icon: number; tint: string; value: number; label: string; gradientTop: string }) {
  return (
    <LinearGradient colors={[gradientTop, colors.white]} style={styles.statCard}>
      <View style={[styles.statBadge, { backgroundColor: `${tint}1A` }]}>
        <AppImage source={icon} resizeMode="contain" style={styles.statIcon} />
      </View>
      <View style={styles.statCopy}>
        <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </LinearGradient>
  );
}

function LegendPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={[styles.legendPill, { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.legendCount, { color }]}>{count}</Text>
      <Text style={[styles.legendLabel, { color }]}>{label}</Text>
    </View>
  );
}

function OverviewStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.overviewStat}>
      <Text style={[styles.overviewStatValue, { color }]}>{value}</Text>
      <Text style={styles.overviewStatLabel}>{label}</Text>
    </View>
  );
}

/** iOS `emptyState`: floating 345pt mascot over a purple glow, bottom-aligned copy, all lifted 50pt. */
function EmptyState() {
  const float = useFloat(8, 1.8);
  return (
    <View style={styles.emptyRoot}>
      <View style={styles.emptyStack}>
        <SoftGlow color={colors.purple} opacity={0.12} style={styles.emptyGlow} />
        <AnimatedAppImage source={Images.statsEmptyImg} resizeMode="stretch" style={[styles.emptyImage, { transform: [{ translateY: float }] }]} />
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>No Progress Yet</Text>
          <Text style={styles.emptySubtitle}>Complete your first chore to unlock{'\n'}streaks, achievements, and cleaning{'\n'} insights.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBar: { paddingTop: s(59), paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...font('semibold', 24), color: colors.text },
  titleActions: { flexDirection: 'row', gap: s(10) },
  titleIcon: { width: s(22), height: s(22) },
  scroll: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(140) },
  streakLabel: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  fireBadge: { width: s(30), height: s(30), borderRadius: s(9.643), backgroundColor: `${ORANGE}1A`, alignItems: 'center', justifyContent: 'center' },
  fireIcon: { width: s(18), height: s(18) },
  streakLabelCopy: { gap: s(1) },
  streakLabelTitle: { ...font('medium', 15), color: colors.text },
  streakLabelSub: { ...font('regular', 10), color: `${colors.text}80` },
  streakCard: { marginTop: s(10), height: s(237), borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(15), paddingTop: s(4), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(15), color: 'rgba(0,0,0,0.1)' }] },
  streakTop: { height: s(125), flexDirection: 'row', alignItems: 'center' },
  mascot: { width: s(94), height: s(121), marginRight: s(26) },
  streakFigures: { flex: 1 },
  /**
   * iOS uses `.lastTextBaseline` here. RN can't baseline-align across
   * `GradientText`'s View wrapper (it holds an invisible measuring Text plus an
   * absolute SVG), so bottoms are aligned instead and the smaller label is
   * nudged down by the descent difference between 42pt and 18pt.
   */
  daysRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s(6) },
  daysLabel: { ...font('medium', 18), color: colors.text, marginBottom: s(6) },
  weekRow: { height: s(88), flexDirection: 'row' },
  dayColumn: { flex: 1, alignItems: 'center', paddingTop: s(4), gap: s(5) },
  dayName: { ...font('regular', 12), color: `${colors.text}80` },
  face: { width: s(45), height: s(45) },
  statusGlyph: { width: s(15), height: s(15), resizeMode: 'contain' },
  statusEmpty: { width: s(15), height: s(15), borderRadius: s(7.5), borderWidth: 1, borderColor: `${colors.text}33` },
  statCards: { marginTop: s(10), flexDirection: 'row', gap: s(15) },
  statCard: { flex: 1, height: s(68), borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, flexDirection: 'row', alignItems: 'center', gap: s(12), paddingLeft: s(15), boxShadow: [{ offsetX: 0, offsetY: s(1), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  statBadge: { width: s(38), height: s(38), borderRadius: s(12.214), alignItems: 'center', justifyContent: 'center' },
  statIcon: { width: s(21), height: s(21) },
  statCopy: { gap: s(2) },
  statValue: { ...font('bold', 20) },
  statLabel: { ...font('regular', 12), color: `${colors.text}CC` },
  overviewTitle: { marginTop: s(25), ...font('semibold', 16), color: colors.text },
  legendRow: { marginTop: s(15), height: s(38), flexDirection: 'row', alignItems: 'center', gap: s(12) },
  legendPills: { flex: 1, flexDirection: 'row', gap: s(14) },
  legendPill: { flex: 1, height: s(38), borderRadius: s(8), alignItems: 'center', justifyContent: 'center', gap: s(2) },
  legendCount: { ...font('bold', 10) },
  legendLabel: { ...font('medium', 10) },
  legendDivider: { width: 1, height: s(26), backgroundColor: `${colors.text}1A` },
  filterButton: { width: s(38), height: s(38), borderRadius: s(12), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  filterIcon: { width: s(20), height: s(20) },
  filterDot: { position: 'absolute', right: s(6), top: s(6), width: s(8), height: s(8), borderRadius: s(4), backgroundColor: colors.purple },
  overviewList: { marginTop: s(15), gap: s(8) },
  overviewCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(15), paddingVertical: s(16), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  overviewCopy: { flex: 1, gap: s(2) },
  overviewName: { ...font('medium', 15), color: colors.text },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  zoneDot: { width: s(4), height: s(4), borderRadius: s(2), backgroundColor: `${colors.text}80` },
  zoneName: { ...font('regular', 12), color: `${colors.text}80` },
  overviewStats: { flexDirection: 'row', gap: s(25) },
  overviewStat: { width: s(35), alignItems: 'center', gap: s(5) },
  overviewStatValue: { ...font('bold', 14) },
  overviewStatLabel: { ...font('regular', 10), color: `${colors.text}CC` },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStack: { alignItems: 'center', transform: [{ translateY: s(-50) }] },
  emptyGlow: { position: 'absolute', alignSelf: 'center', top: s(100) },
  emptyImage: { width: s(345), height: s(345) },
  emptyCopy: { marginTop: s(-60), gap: s(10), alignItems: 'center' },
  emptyTitle: { ...font('semibold', 18), color: colors.text },
  emptySubtitle: { ...font('regular', 15), color: `${colors.text}99`, width: s(238), textAlign: 'center' },
});
