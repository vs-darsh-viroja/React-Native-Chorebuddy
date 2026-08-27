import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PeekBunny, PeekHands, SheetCheckbox, useSheetAnimation } from '@/components/BottomSheet';
import { PressScale } from '@/components/motion';
import { predefinedZoneSections, zoneIcon, zonePalettes } from '@/models/zones';
import { useChores } from '@/services/ChoreContext';
import { useHousehold } from '@/services/HouseholdContext';
import { AvatarView } from '@/components/AvatarView';
import { colors, font, s, screen } from '@/theme';
import { AppImage } from '@/components/AppImage';

export type StatsTimePeriod = 'thisWeek' | 'prevWeek' | 'thisMonth' | 'prevMonth' | 'custom';
export type StatsFilter = { zones: string[]; memberIds: string[]; period: StatsTimePeriod | null; customStart: string | null; customEnd: string | null };
export const emptyFilter: StatsFilter = { zones: [], memberIds: [], period: null, customStart: null, customEnd: null };
export const filterIsActive = (filter: StatsFilter) => filter.zones.length > 0 || filter.memberIds.length > 0 || filter.period !== null;

const SHEET_HEIGHT = screen.height * (617 / 812);
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' }) + ', ' + date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const weekRangeText = (offset: number) => {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay() + offset * 7);
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return `${shortDate(start)} - ${shortDate(end)}`;
};
export const monthText = (offset: number) => { const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset); return base.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };

const TABS = ['Zones', 'Member', 'Time Period'];

/** iOS `StatsFilterSheet`: peeking bunny, Filter By header, left tab rail (defaulting to Time Period), zone/member/period content, Clear all + Save. */
export function StatsFilterSheet({ initial, onSave, onClose }: { initial: StatsFilter; onSave(filter: StatsFilter): void; onClose(): void }) {
  const insets = useSafeAreaInsets();
  const store = useChores();
  const { members } = useHousehold();
  const { progress, drag, close, pan } = useSheetAnimation(onClose);
  const [tab, setTab] = useState(2);
  const [draft, setDraft] = useState<StatsFilter>(initial);
  const [memberSearch, setMemberSearch] = useState('');
  const [showRange, setShowRange] = useState(false);

  const predefined = useMemo(() => predefinedZoneSections.flatMap(section => section.items), []);
  const filteredMembers = members.filter(member => !memberSearch.trim() || member.name.toLowerCase().includes(memberSearch.trim().toLowerCase()));
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const customRangeText = draft.customStart && draft.customEnd
    ? `${shortDate(new Date(`${draft.customStart}T00:00:00`))} - ${shortDate(new Date(`${draft.customEnd}T00:00:00`))}`
    : 'Pick a custom date range';

  const filterRow = (key: string, selected: boolean, leading: React.ReactNode, title: string, onTap: () => void) => (
    <Pressable key={key} onPress={() => { void Haptics.selectionAsync(); onTap(); }} style={styles.filterRow}>
      {leading}
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.spacer} />
      <SheetCheckbox on={selected} />
    </Pressable>
  );

  const periodRow = (period: StatsTimePeriod, title: string, subtitle: string) => {
    const selected = draft.period === period;
    return (
      <Pressable key={period} onPress={() => { void Haptics.selectionAsync(); setDraft({ ...draft, period: selected ? null : period }); }} style={styles.periodRow}>
        <View style={styles.periodCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        <SheetCheckbox on={selected} />
      </Pressable>
    );
  };

  const Chevron = Images.choreChevronIcon;
  const SearchIcon = Images.choreSearchIcon;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      <Animated.View style={[styles.cardWrap, { transform: [{ translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }), drag) }] }]}>
        <View style={styles.peekBunny} pointerEvents="none"><View style={{ transform: [{ translateX: -s(96.5) }] }}><PeekBunny /></View></View>
        <View style={styles.card}>
          <View {...pan.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter By</Text>
              <PressScale onPress={() => close()} style={styles.closeCircle}><Text style={styles.closeX}>✕</Text></PressScale>
            </View>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.body}>
            <View style={styles.rail}>
              {TABS.map((title, index) => {
                const selected = tab === index;
                return (
                  <Pressable key={title} onPress={() => { void Haptics.selectionAsync(); setTab(index); }} style={[styles.railButton, selected && styles.railButtonOn]}>
                    <View style={[styles.railAccent, { backgroundColor: selected ? colors.white : `${colors.text}4D` }]} />
                    <Text style={[styles.railLabel, selected && { color: colors.white }]}>{title}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.content}>
              {tab === 0 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                  {store.createdZones.map(zone => filterRow(zone.id, draft.zones.includes(zone.name), (
                    <View style={styles.createdTile}><AppImage source={zoneIcon(zone.iconAsset)} resizeMode="contain" style={styles.createdTileIcon} /></View>
                  ), zone.name, () => setDraft({ ...draft, zones: toggle(draft.zones, zone.name) })))}
                  {predefined.map(zone => filterRow(zone.name, draft.zones.includes(zone.name), (
                    <LinearGradient colors={[zonePalettes[zone.palette].top, zonePalettes[zone.palette].bottom]} style={[styles.zoneTile, { borderColor: zonePalettes[zone.palette].border }]}>
                      <AppImage source={zoneIcon(zone.iconAsset)} resizeMode="contain" style={styles.zoneTileIcon} />
                    </LinearGradient>
                  ), zone.name, () => setDraft({ ...draft, zones: toggle(draft.zones, zone.name) })))}
                </ScrollView>
              )}
              {tab === 1 && (
                <View style={styles.memberBlock}>
                  <View style={styles.memberSearch}>
                    <View style={{ opacity: 0.3 }}><SearchIcon width={s(18)} height={s(18)} /></View>
                    <TextInput value={memberSearch} onChangeText={setMemberSearch} placeholder="Search Member" placeholderTextColor={`${colors.text}66`} style={styles.memberSearchField} selectionColor={colors.purple} />
                  </View>
                  {filteredMembers.length === 0 ? (
                    <Text style={styles.emptyMembers}>No members yet</Text>
                  ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                      {filteredMembers.map(member => filterRow(member.id, draft.memberIds.includes(member.id), (
                        <View style={styles.memberAvatar}>
                          <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(32)} />
                        </View>
                      ), member.name, () => setDraft({ ...draft, memberIds: toggle(draft.memberIds, member.id) })))}
                    </ScrollView>
                  )}
                </View>
              )}
              {tab === 2 && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                  {periodRow('thisWeek', 'This Week', weekRangeText(0))}
                  {periodRow('prevWeek', 'Previous Week', weekRangeText(-1))}
                  {periodRow('thisMonth', 'This Month', monthText(0))}
                  {periodRow('prevMonth', 'Previous Month', monthText(-1))}
                  <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowRange(true); }} style={styles.periodRow}>
                    <View style={styles.periodCopy}>
                      <Text style={styles.rowTitle}>Calendar</Text>
                      <Text style={styles.rowSubtitle}>{customRangeText}</Text>
                    </View>
                    <View style={{ opacity: 0.4 }}><Chevron width={s(6)} height={s(11)} /></View>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
          {/* These sheets are hand-rolled on `useSheetAnimation` rather than the
              shared `BottomSheet`, so they do not inherit its card inset — the
              footer has to clear the navigation bar itself, keeping a 10 gap. */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(s(40), insets.bottom + s(10)) }]}>
            <PressScale onPress={() => setDraft(emptyFilter)} style={styles.clearButton}><Text style={styles.clearLabel}>Clear all</Text></PressScale>
            {/* PressScale puts `style` on an INNER animated view, so `flex: 1`
                never reached this row and Save collapsed to a circle. The
                flexing has to happen on a real layout parent. */}
            <View style={styles.saveSlot}>
              <PressScale onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); const saved = draft; close(() => onSave(saved)); }} haptic="none" style={styles.saveButton}><Text style={styles.saveLabel}>Save</Text></PressScale>
            </View>
          </View>
        </View>
        <PeekHands />
      </Animated.View>
      {showRange && (
        <StatsRangePicker
          start={draft.customStart}
          end={draft.customEnd}
          onDone={(start, end) => { setDraft({ ...draft, customStart: start, customEnd: end, period: 'custom' }); setShowRange(false); }}
          onClose={() => setShowRange(false)}
        />
      )}
    </View>
  );
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CORAL = '#FF5757';

/** iOS `StatsRangePickerSheet`: start/end fields, month calendar with a purple range fill and endpoint tiles, Done. */
function StatsRangePicker({ start, end, onDone, onClose }: { start: string | null; end: string | null; onDone(start: string, end: string): void; onClose(): void }) {
  const insets = useSafeAreaInsets();
  const { progress, drag, close, pan } = useSheetAnimation(onClose);
  const [rangeStart, setRangeStart] = useState<string | null>(start);
  const [rangeEnd, setRangeEnd] = useState<string | null>(end);
  const [visibleMonth, setVisibleMonth] = useState(() => { const base = start ? new Date(`${start}T00:00:00`) : new Date(); base.setDate(1); base.setHours(0, 0, 0, 0); return base; });

  const cells = useMemo(() => {
    const first = new Date(visibleMonth);
    const leading = first.getDay();
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const result: Array<Date | null> = Array.from({ length: leading }, () => null);
    for (let offset = 0; offset < daysInMonth; offset += 1) result.push(new Date(first.getFullYear(), first.getMonth(), offset + 1));
    return result;
  }, [visibleMonth]);

  const selectDay = (date: Date) => {
    const key = dayKey(date);
    if (!rangeStart || rangeEnd) { setRangeStart(key); setRangeEnd(null); }
    else if (key < rangeStart) setRangeStart(key);
    else setRangeEnd(key);
  };
  const inRange = (key: string) => Boolean(rangeStart && rangeEnd && key >= rangeStart && key <= rangeEnd);
  const isEndpoint = (key: string) => key === rangeStart || key === rangeEnd;
  const fieldText = (value: string | null) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select');
  const monthTitle = visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const shiftMonth = (delta: number) => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVisibleMonth(previous => { const next = new Date(previous); next.setMonth(previous.getMonth() + delta); return next; }); };
  const Chevron = Images.choreChevronIcon;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      <Animated.View style={[styles.cardWrap, { transform: [{ translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_HEIGHT, 0] }), drag) }] }]}>
        <View style={[styles.peekBunny, styles.peekBunnyLeft]} pointerEvents="none"><PeekBunny /></View>
        <View style={styles.card}>
          <View {...pan.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select a Date</Text>
              <PressScale onPress={() => close()} style={styles.closeCircle}><Text style={styles.closeX}>✕</Text></PressScale>
            </View>
          </View>
          <View style={styles.datesCard}>
            {[['Start Date', rangeStart, true], ['End Date', rangeEnd, false]].map(([label, value, active]) => (
              <View key={String(label)} style={styles.dateField}>
                <Text style={styles.dateLabel}>{label as string}</Text>
                <View style={[styles.dateBox, value ? { backgroundColor: 'transparent', borderColor: active ? `${colors.text}99` : `${colors.text}1A` } : null]}>
                  <View style={{ opacity: value ? 0.7 : 0.3 }}><Images.choreCalendarIcon width={s(20)} height={s(20)} /></View>
                  <Text style={[styles.dateValue, !value && { color: `${colors.text}4D` }]}>{fieldText(value as string | null)}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.calendarCard}>
            <View style={styles.monthRow}>
              <View style={styles.monthTitleRow}>
                <Text style={styles.monthTitle}>{monthTitle}</Text>
                <Chevron width={s(5)} height={s(10)} />
              </View>
              <View style={styles.monthButtons}>
                <Pressable hitSlop={8} onPress={() => shiftMonth(-1)} style={{ transform: [{ rotate: '180deg' }] }}><Chevron width={s(6)} height={s(12)} /></Pressable>
                <Pressable hitSlop={8} onPress={() => shiftMonth(1)}><Chevron width={s(6)} height={s(12)} /></Pressable>
              </View>
            </View>
            <View style={styles.weekHeader}>
              {WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index === 0 && { color: CORAL }]}>{day}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((date, index) => {
                if (!date) return <View key={`blank${index}`} style={styles.dayCell} />;
                const key = dayKey(date);
                const endpoint = isEndpoint(key);
                const within = inRange(key) && !endpoint;
                const sunday = date.getDay() === 0;
                return (
                  <Pressable key={key} onPress={() => { void Haptics.selectionAsync(); selectDay(date); }} style={styles.dayCell}>
                    <View style={[styles.dayBox, within && styles.dayWithin, endpoint && styles.dayEndpoint]}>
                      <Text style={[styles.dayText, sunday && { color: CORAL }, endpoint && { color: colors.white }]}>{date.getDate()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.spacer} />
          <View style={{ paddingBottom: Math.max(s(55), insets.bottom + s(10)) }}>
          <PressScale onPress={() => { if (rangeStart) close(() => onDone(rangeStart, rangeEnd ?? rangeStart)); else close(); }} style={styles.doneButton}><Text style={styles.saveLabel}>Done</Text></PressScale>
          </View>
        </View>
        <PeekHands style={styles.handsLeft} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000' },
  cardWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  peekBunny: { position: 'absolute', top: -s(93), left: 0, right: 0, alignItems: 'center' },
  peekBunnyLeft: { alignItems: 'flex-start', paddingLeft: s(40), top: -s(90) },
  hands: { position: 'absolute', top: -s(10), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: s(65), transform: [{ translateX: -s(96.5) }] },
  handsLeft: { justifyContent: 'flex-start', paddingLeft: s(54), transform: [{ translateX: 0 }] },
  card: { height: SHEET_HEIGHT, borderTopLeftRadius: s(16), borderTopRightRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderBottomWidth: 0, borderColor: `${colors.text}33`, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: s(36), height: s(5), borderRadius: s(2.5), backgroundColor: `${colors.text}33`, marginTop: s(10) },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(15), paddingTop: s(18), paddingBottom: s(18) },
  sheetTitle: { ...font('medium', 20), color: colors.text },
  closeCircle: { width: s(28), height: s(28), borderRadius: s(14), borderWidth: 1, borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: s(11), color: `${colors.text}80`, fontWeight: '600' },
  headerDivider: { height: 1, backgroundColor: `${colors.text}1A` },
  body: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: s(120), paddingTop: s(6), gap: s(6) },
  railButton: { paddingLeft: s(20), paddingRight: s(10), paddingVertical: s(20), backgroundColor: `${colors.purple}1A`, borderTopRightRadius: s(16), borderBottomRightRadius: s(16), justifyContent: 'center' },
  railButtonOn: { backgroundColor: colors.purple },
  railAccent: { position: 'absolute', left: 0, width: s(3), height: s(26), borderRadius: s(1.5) },
  railLabel: { ...font('regular', 16), color: colors.text },
  content: { flex: 1, paddingLeft: s(14), paddingRight: s(15), paddingTop: s(5) },
  listContent: { paddingTop: s(4), paddingBottom: s(10), gap: s(10) },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingLeft: s(10), paddingRight: s(6), height: s(52), borderRadius: s(9.554), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(1), blurRadius: s(6), color: 'rgba(0,0,0,0.05)' }] },
  rowTitle: { ...font('regular', 14), color: colors.text },
  rowSubtitle: { ...font('regular', 10), color: `${colors.text}80` },
  spacer: { flex: 1 },
  checkboxBorder: { ...StyleSheet.absoluteFillObject, borderRadius: s(4), borderWidth: 1.5, borderColor: `${colors.text}33` },
  createdTile: { width: s(32), height: s(32), borderRadius: s(16), backgroundColor: `${colors.purple}1A`, alignItems: 'center', justifyContent: 'center' },
  createdTileIcon: { width: s(18), height: s(18), tintColor: colors.purple },
  zoneTile: { width: s(32), height: s(32), borderRadius: s(8), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoneTileIcon: { width: s(20), height: s(20), tintColor: colors.white },
  memberBlock: { flex: 1, gap: s(10) },
  memberSearch: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(12), height: s(40), borderRadius: s(20), borderWidth: 1, borderColor: `${colors.text}33` },
  memberSearchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  emptyMembers: { ...font('regular', 14), color: `${colors.text}66`, textAlign: 'center', marginTop: s(30) },
  memberAvatar: { width: s(32), height: s(32), borderRadius: s(16), backgroundColor: '#FF6E92', overflow: 'hidden' },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(10), height: s(52), borderRadius: s(10), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(1), blurRadius: s(6), color: 'rgba(0,0,0,0.05)' }] },
  periodCopy: { gap: s(2) },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: s(15), paddingHorizontal: s(25), paddingTop: s(15) },
  clearButton: { width: s(96), height: s(44), borderRadius: s(22), backgroundColor: `${colors.purple}1A`, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { ...font('medium', 15), color: colors.text },
  saveSlot: { flex: 1 },
  saveButton: { height: s(44), borderRadius: s(22), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { ...font('semibold', 15), color: colors.white },
  datesCard: { flexDirection: 'row', gap: s(15), marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  dateField: { flex: 1, gap: s(6) },
  dateLabel: { ...font('regular', 12), color: `${colors.text}99` },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(12), height: s(48), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A` },
  dateValue: { ...font('regular', 14), color: colors.text },
  calendarCard: { marginHorizontal: s(15), marginTop: s(15), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(15), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  monthTitle: { ...font('medium', 16), color: colors.text },
  monthButtons: { flexDirection: 'row', alignItems: 'center', gap: s(20) },
  weekHeader: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...font('medium', 12), color: `${colors.text}80` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(8) },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center' },
  dayBox: { width: s(38), height: s(38), alignItems: 'center', justifyContent: 'center' },
  dayWithin: { backgroundColor: `${colors.purple}26` },
  dayEndpoint: { backgroundColor: colors.purple, borderRadius: s(10) },
  dayText: { ...font('regular', 15), color: colors.text },
  doneButton: { marginHorizontal: s(25), height: s(52), borderRadius: s(26), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(10), color: 'rgba(152,113,232,0.3)' }] },
});
