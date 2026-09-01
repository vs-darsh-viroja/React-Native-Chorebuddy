import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph, ChevronGlyph, CrossGlyph, MoreDotsGlyph, PauseGlyph } from '@/components/glyphs';
import { CircleButton, PressScale, SlideInCard, SoftGlow, useFloat } from '@/components/motion';
import { ChartDownloadSheet, ChartMemberSheet, ScheduleFilterSheet, ZoneTile, emptyScheduleFilter, scheduleFilterActive, type ReportPeriod, type ScheduleFilter } from '@/components/ScheduleSheets';
import { useChores, type Chore } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { AvatarView } from '@/components/AvatarView';
import { cardColor, colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

/** iOS `ChartCell`. */
type Cell = 'completed' | 'missed' | 'skipped' | 'pending' | 'noTask' | 'snoozed';
type ZoneRow = { name: string; chores: Array<{ chore: Chore; cells: Cell[] }> };
type MemberVM = { member: HouseholdMember; colorIndex: number; zones: ZoneRow[] };

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/** iOS uses `firstWeekday = 2` (Monday) throughout the Schedule tab. */
const mondayOf = (offset: number) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7); return date; };
const weekFrom = (start: Date) => Array.from({ length: 7 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });

/** iOS `weekLabel`: "Week of MMM d - d" collapsing the month when both ends share it. */
function weekLabel(days: Date[]) {
  const [first] = days;
  const last = days[days.length - 1];
  const start = first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = first.getMonth() === last.getMonth()
    ? String(last.getDate())
    : last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week of ${start} - ${end}`;
}

/** iOS `ScheduleView`: week navigation, per-member day grids, filter/download sheets, and PDF/print export. */
export function ChartView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useChores();
  const { members } = useHousehold();
  const [weekOffset, setWeekOffset] = useState(0);
  const [filter, setFilter] = useState<ScheduleFilter>(emptyScheduleFilter);
  const [sheet, setSheet] = useState<'filter' | 'download' | null>(null);
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<HouseholdMember | null>(null);
  const [cardsAppeared, setCardsAppeared] = useState(false);

  const weekDays = useMemo(() => weekFrom(mondayOf(weekOffset)), [weekOffset]);
  const todayIndex = weekDays.findIndex(day => dayKey(day) === dayKey(new Date()));

  useEffect(() => {
    const timer = setTimeout(() => setCardsAppeared(true), 50);
    return () => clearTimeout(timer);
  }, []);

  /** iOS `status(_:on:)`: recorded outcomes win, then an elapsed occurrence reads missed, otherwise pending. */
  const status = (chore: Chore, day: Date): Cell => {
    if (store.hasEvent(chore.id, day, 'done')) return 'completed';
    if (store.hasEvent(chore.id, day, 'skipped')) return 'skipped';
    if (store.hasEvent(chore.id, day, 'missed')) return 'missed';
    if (store.hasEvent(chore.id, day, 'paused')) return 'snoozed';
    if (!store.occurs(chore, day)) return 'noTask';
    return dayKey(day) < dayKey(new Date()) ? 'missed' : 'pending';
  };

  /** iOS `buildMembers`: members keep their roster index for colour, and only members with matching chores appear. */
  const buildMembers = (days: Date[], memberIds: string[], zones: string[]): MemberVM[] => members.flatMap((member, colorIndex) => {
    if (memberIds.length && !memberIds.includes(member.id)) return [];
    const mine = store.chores.filter(chore => chore.assignedMemberIds.includes(member.id)
      && (!zones.length || zones.includes(chore.zoneName))
      && days.some(day => store.occurs(chore, day)));
    if (!mine.length) return [];
    const order: string[] = [];
    const byZone = new Map<string, Chore[]>();
    mine.forEach(chore => {
      if (!byZone.has(chore.zoneName)) { order.push(chore.zoneName); byZone.set(chore.zoneName, []); }
      byZone.get(chore.zoneName)!.push(chore);
    });
    return [{
      member,
      colorIndex,
      zones: order.map(name => ({ name, chores: (byZone.get(name) ?? []).map(chore => ({ chore, cells: days.map(day => status(chore, day)) })) })),
    }];
  });

  const data = useMemo(() => buildMembers(weekDays, filter.memberIds, filter.zones), [members, store.chores, store.events, store.overrides, weekDays, filter]);

  const exportReport = async (period: ReportPeriod, memberIds: string[]) => {
    const offsets = period === 'previousWeek' ? [-1] : period === 'thisWeek' ? [0] : monthWeekOffsets();
    const weeks = offsets.map(offset => { const days = weekFrom(mondayOf(offset)); return { label: weekLabel(days), days, members: buildMembers(days, memberIds, []) }; }).filter(week => week.members.length);
    if (!weeks.length) return;
    await deliverPdf(reportHtml(weeks.map(week => reportSection(week.label, week.members, week.days, weeks.length > 1)).join('')), false);
  };
  const printCurrentWeek = async () => {
    const current = buildMembers(weekDays, [], []);
    if (!current.length) return;
    await deliverPdf(reportHtml(reportSection(weekLabel(weekDays), current, weekDays, false)), true);
  };

  return (
    <View style={styles.root}>

      <View style={styles.titleBar}>
        <Text style={styles.title}>Chores Chart</Text>
        <CircleButton onPress={() => setMenu(!menu)}>
          <MoreDotsGlyph size={s(22)} color={colors.purple} />
        </CircleButton>
      </View>

      <View style={styles.controlRow}>
        <PressScale onPress={() => setSheet('filter')} style={styles.filterCircle}>
          <AppImage source={Images.filterIcon} resizeMode="contain" style={styles.filterIcon} />
          {scheduleFilterActive(filter) && <View style={styles.filterDot} />}
        </PressScale>
        <View style={styles.controlDivider} />
        <View style={styles.weekPill}>
          <WeekArrow forward={false} onPress={() => setWeekOffset(weekOffset - 1)} />
          <Text style={styles.weekLabel} numberOfLines={1}>{weekLabel(weekDays)}</Text>
          <WeekArrow forward onPress={() => setWeekOffset(weekOffset + 1)} />
        </View>
      </View>

      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <ChartLegend />
          <View style={styles.cards}>
            {data.map((entry, index) => (
              <SlideInCard key={entry.member.id} index={index} appeared={cardsAppeared}>
                <PressScale onPress={() => setSelected(entry.member)} style={styles.memberCard}>
                  <MemberCard entry={entry} weekDays={weekDays} todayIndex={todayIndex} />
                </PressScale>
              </SlideInCard>
            ))}
          </View>
        </ScrollView>
      )}

      {menu && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} />
          <View style={[styles.menu, data.length === 0 && styles.menuDisabled]} pointerEvents={data.length ? 'auto' : 'none'}>
            <Pressable onPress={() => { setMenu(false); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTimeout(() => setSheet('download'), 200); }} style={styles.menuRow}>
              <Images.chartDownloadIcon width={s(20)} height={s(20)} />
              <Text style={styles.menuLabel}>Download PDF</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable onPress={() => { setMenu(false); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTimeout(() => void printCurrentWeek(), 200); }} style={styles.menuRow}>
              <Images.chartPrintIcon width={s(20)} height={s(20)} />
              <Text style={styles.menuLabel}>Print</Text>
            </Pressable>
          </View>
        </View>
      )}

      {sheet === 'filter' && <ScheduleFilterSheet initial={filter} onSave={next => { setFilter(next); setSheet(null); }} onClose={() => setSheet(null)} />}
      {sheet === 'download' && <ChartDownloadSheet members={members} onDownload={(period, ids) => { setSheet(null); void exportReport(period, ids); }} onClose={() => setSheet(null)} />}
      {selected && (
        <ChartMemberSheet
          memberId={selected.id}
          memberName={selected.name}
          weekDays={weekDays}
          onChoreTap={(chore, day) => { setSelected(null); navigation.push('ChoreStatus', { choreId: chore.id, day: dayKey(day) }); }}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

/** iOS `chevronButton`: a 28pt white circle holding the drawn chevron, mirrored for "previous". */
function WeekArrow({ forward, onPress }: { forward: boolean; onPress(): void }) {
  return (
    <PressScale haptic="none" onPress={() => { void Haptics.selectionAsync(); onPress(); }} style={styles.weekArrow}>
      <View style={forward ? undefined : styles.mirrored}>
        <ChevronGlyph width={s(4)} height={s(8)} color={colors.purple} />
      </View>
    </PressScale>
  );
}

/** iOS `ChartMemberCard`: avatar ring in the member's card colour, weekday header with today filled, zone sections split by dividers. */
function MemberCard({ entry, weekDays, todayIndex }: { entry: MemberVM; weekDays: Date[]; todayIndex: number }) {
  const color = cardColor(entry.colorIndex);
  return (
    <>
      <View style={styles.memberHead}>
        <View style={[styles.memberAvatarRing, { backgroundColor: `${color}33` }]}>
          <AvatarView avatar={entry.member.avatar} photoData={entry.member.photoData} size={s(33)} />
        </View>
        <Text style={styles.memberName} numberOfLines={1}>{entry.member.name}</Text>
      </View>

      <View style={styles.weekdayHeader}>
        <View style={styles.nameColumn} />
        {weekDays.map((day, index) => (
          <View key={dayKey(day)} style={[styles.dayBox, { backgroundColor: index === todayIndex ? color : `${color}1A` }]}>
            <Text style={[styles.dayLetter, { color: index === todayIndex ? colors.white : color }]}>{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</Text>
          </View>
        ))}
      </View>

      {entry.zones.map((zone, index) => (
        <View key={zone.name}>
          {index > 0 && <View style={styles.zoneDivider} />}
          <View style={[styles.zoneSection, index === 0 && { marginTop: s(12) }]}>
            <View style={styles.zoneHead}>
              <ZoneTile zoneName={zone.name} size={24} radius={8} glyph={15} />
              <Text style={styles.zoneName} numberOfLines={1}>{zone.name}</Text>
            </View>
            {zone.chores.map(row => (
              <View key={row.chore.id} style={styles.choreRow}>
                <Text style={styles.choreName} numberOfLines={2}>{row.chore.name}</Text>
                {row.cells.map((cell, cellIndex) => <StatusCell key={cellIndex} cell={cell} color={color} />)}
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

/**
 * iOS `statusCell`: 26×22 rounded tile whose fill and glyph encode the outcome.
 *
 * Deliberate divergence from iOS, at the user's request: iOS `cellGlyph` draws
 * the same member-coloured dot for `.noTask` and `.snoozed`, so a snoozed
 * occurrence is indistinguishable from a day with nothing scheduled. Snoozed
 * now gets the pause glyph on the app's snooze accent (the purple
 * `ChoreStatusView` already themes the Snoozed state with), and the dot is
 * reserved for genuinely empty days.
 */
function StatusCell({ cell, color }: { cell: Cell; color: string }) {
  const background = cell === 'completed' ? '#9BD38126'
    : cell === 'missed' ? '#FF57571A'
      : cell === 'skipped' ? '#FB8C071A'
        : cell === 'snoozed' ? `${colors.purple}1A`
          : `${color}0D`;
  return (
    <View style={[styles.cell, { backgroundColor: background }]}>
      {cell === 'completed' && <CheckmarkGlyph width={s(8)} height={s(6)} color="#9BD381" strokeWidth={1.75} />}
      {cell === 'missed' && <CrossGlyph size={s(6)} color="#FF8181" strokeWidth={1.5} />}
      {cell === 'skipped' && <View style={styles.skipBar} />}
      {cell === 'snoozed' && <PauseGlyph width={s(6)} height={s(7.5)} color={colors.purple} />}
      {cell === 'noTask' && <View style={[styles.noTaskDot, { backgroundColor: color }]} />}
    </View>
  );
}

/** iOS `ChartLegend`. */
function ChartLegend() {
  return (
    <View style={styles.legend}>
      <LegendItem label="Completed"><CheckmarkGlyph width={s(9)} height={s(7)} color="#9BD381" strokeWidth={1.6} /></LegendItem>
      <LegendItem label="Missed"><CrossGlyph size={s(7)} color="#FF8181" strokeWidth={1.6} /></LegendItem>
      <LegendItem label="Skipped"><View style={styles.skipBar} /></LegendItem>
      <LegendItem label="Snoozed"><PauseGlyph width={s(6.5)} height={s(8)} color={colors.purple} /></LegendItem>
      <LegendItem label="No Task"><View style={[styles.noTaskDot, { backgroundColor: colors.purple }]} /></LegendItem>
    </View>
  );
}

function LegendItem({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <View style={styles.legendItem}>
      <View style={styles.legendGlyph}>{children}</View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

/** iOS `emptyState`: floating overviewMascot over a pink glow. */
function EmptyState() {
  const float = useFloat(8, 1.8);
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <SoftGlow color="#FFC7CE" opacity={0.3} style={styles.emptyGlow} />
        <AnimatedAppImage source={Images.overviewMascot} resizeMode="contain" style={[styles.emptyMascot, { transform: [{ translateY: float }] }]} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>No Chores Scheduled</Text>
        <Text style={styles.emptySubtitle}>Enjoy your free time or add one to stay organized.</Text>
      </View>
    </View>
  );
}

/** iOS `reportWeeks(.thisMonth)`: every Monday-week that overlaps the current month. */
function monthWeekOffsets() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const thisMonday = mondayOf(0);
  const firstMonday = new Date(monthStart); firstMonday.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const offsets: number[] = [];
  for (let cursor = new Date(firstMonday); cursor <= monthEnd; cursor.setDate(cursor.getDate() + 7)) {
    offsets.push(Math.round((cursor.getTime() - thisMonday.getTime()) / (7 * 86400000)));
  }
  return offsets;
}

/**
 * Report cell marks. These mirror `StatusCell`, so the printed chart reads the
 * same as the screen: snoozed is the pause symbol and the dot means no task.
 * The pause is inline SVG rather than a glyph character so the print engine
 * cannot substitute a missing font.
 */
const PAUSE_SVG = `<svg width="6" height="8" viewBox="0 0 6 8" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="2.2" height="8" rx="1.1" fill="#9871E8"/><rect x="3.8" y="0" width="2.2" height="8" rx="1.1" fill="#9871E8"/></svg>`;
const CELL_TEXT: Record<Cell, string> = {
  completed: '<span class="ok">✓</span>',
  missed: '<span class="no">✕</span>',
  skipped: '<span class="sk">–</span>',
  snoozed: PAUSE_SVG,
  noTask: '<span class="nt">•</span>',
  pending: '',
};

/**
 * Android report generation. iOS renders SwiftUI cards into a PDF via
 * `ImageRenderer`; RN has no equivalent, so the same data is laid out as an
 * HTML table and handed to `expo-print` for the system PDF/print pipeline.
 */
function reportSection(label: string, data: MemberVM[], days: Date[], showLabel: boolean) {
  const rows = data.flatMap(entry => entry.zones.flatMap(zone => zone.chores.map(row => (
    `<tr><td>${escapeHtml(entry.member.name)}</td><td>${escapeHtml(zone.name)}</td><td>${escapeHtml(row.chore.name)}</td>${row.cells.map(cell => `<td class="c">${CELL_TEXT[cell]}</td>`).join('')}</tr>`
  )))).join('');
  const heading = showLabel ? `<h2>${escapeHtml(label)}</h2>` : `<p class="sub">${escapeHtml(label)}</p>`;
  return `<section>${heading}<table><tr><th>Member</th><th>Zone</th><th>Chore</th>${days.map(day => `<th class="c">${day.toLocaleDateString('en-US', { weekday: 'narrow' })}</th>`).join('')}</tr>${rows}</table></section>`;
}

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character);

function reportHtml(sections: string) {
  return `<html><head><meta name="viewport" content="width=device-width"><style>
    body{font-family:sans-serif;color:#1F1F1F;background:#FBF7FD;padding:20px}
    h1{color:#9871E8;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px}
    .sub{color:#1F1F1F99;font-size:12px;margin:0 0 12px}
    section{page-break-inside:avoid;margin-bottom:22px}
    table{border-collapse:collapse;width:100%;font-size:10px}
    th,td{border:1px solid #E4DCF0;padding:6px;text-align:left}
    th{background:#F2ECFF}.c{text-align:center;width:22px}
    .ok{color:#5EA83F}.no{color:#FF5757}.sk{color:#FB8C07}.nt{color:#9871E8}
    .key{font-size:10px;color:#1F1F1F99;margin:0 0 14px}.key span{margin-right:12px}
    .key svg{vertical-align:-1px}
  </style></head><body><h1>Chores Chart</h1>
  <p class="key"><span class="ok">✓ Completed</span><span class="no">✕ Missed</span><span class="sk">– Skipped</span><span class="nt">${PAUSE_SVG} Snoozed</span><span class="nt">• No Task</span></p>
  ${sections}</body></html>`;
}

async function deliverPdf(html: string, print: boolean) {
  if (print) { await Print.printAsync({ html }); return; }
  const file = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Chores Report' });
  else await Share.share({ message: 'Chores report created.' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBar: { paddingTop: s(59), paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...font('semibold', 24), color: colors.text },
  controlRow: { marginTop: s(20), paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', gap: s(12) },
  filterCircle: { width: s(38), height: s(38), borderRadius: s(19), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.1)' }] },
  filterIcon: { width: s(18), height: s(18) },
  filterDot: { position: 'absolute', right: s(8), top: s(8), width: s(8), height: s(8), borderRadius: s(4), backgroundColor: colors.purple },
  controlDivider: { width: 1, height: s(26), backgroundColor: `${colors.text}26` },
  weekPill: { flex: 1, height: s(38), borderRadius: s(19), backgroundColor: colors.purple, borderWidth: 1, borderColor: `${colors.text}0D`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(5) },
  weekArrow: { width: s(28), height: s(28), borderRadius: s(14), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center' },
  mirrored: { transform: [{ scaleX: -1 }] },
  weekLabel: { flex: 1, textAlign: 'center', ...font('medium', 14), color: colors.white },
  scroll: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(140) },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: s(6), rowGap: s(6), paddingBottom: s(8) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  legendGlyph: { width: s(13), height: s(13), alignItems: 'center', justifyContent: 'center' },
  legendLabel: { ...font('regular', 11), color: colors.text },
  cards: { gap: s(12) },
  memberCard: { paddingHorizontal: s(15), paddingVertical: s(12), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  memberHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  memberAvatarRing: { width: s(40), height: s(40), borderRadius: s(20), alignItems: 'center', justifyContent: 'center', borderWidth: s(1.15), borderColor: colors.white },
  memberAvatar: { width: s(33), height: s(33), borderRadius: s(16.5) },
  memberName: { ...font('bold', 13), color: colors.text, flexShrink: 1 },
  weekdayHeader: { marginTop: s(8), flexDirection: 'row', gap: s(5) },
  nameColumn: { flex: 1 },
  dayBox: { width: s(26), height: s(22), borderRadius: s(5), alignItems: 'center', justifyContent: 'center' },
  dayLetter: { ...font('bold', 12) },
  zoneDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginVertical: s(12) },
  zoneSection: { gap: s(10) },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: s(7) },
  zoneName: { ...font('semibold', 12), color: colors.text, flexShrink: 1 },
  choreRow: { flexDirection: 'row', alignItems: 'center', gap: s(5) },
  choreName: { flex: 1, ...font('regular', 11), color: colors.text, paddingRight: s(6) },
  cell: { width: s(26), height: s(22), borderRadius: s(5), alignItems: 'center', justifyContent: 'center' },
  skipBar: { width: s(8), height: s(1.75), borderRadius: s(1), backgroundColor: '#FCA945' },
  noTaskDot: { width: s(5), height: s(5), borderRadius: s(2.5) },
  menu: { position: 'absolute', top: s(107), right: s(15), width: s(171), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}33`, boxShadow: [{ offsetX: -s(5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  menuDisabled: { opacity: 0.5 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(16), height: s(48) },
  menuLabel: { ...font('regular', 14), color: colors.text },
  menuDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginHorizontal: s(16) },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: s(120) },
  emptyArt: { alignItems: 'center', justifyContent: 'center' },
  // Figma centres the glow 6.6 above the mascot's centre (glow centre y 356.4, mascot 281->445).
  emptyGlow: { position: 'absolute', transform: [{ translateY: -s(6.6) }] },
  emptyMascot: { width: s(119), height: s(164) },
  emptyCopy: { marginTop: s(19), gap: s(10), alignItems: 'center' },
  emptyTitle: { ...font('semibold', 18), color: colors.text },
  emptySubtitle: { ...font('regular', 15), color: `${colors.text}99`, width: s(240), textAlign: 'center' },
});
