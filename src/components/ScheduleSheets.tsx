import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { BottomSheet, SheetCTA, SheetCheckbox, SheetHeader, SheetRadio, sheetFooterPad, useSheet } from '@/components/BottomSheet';
import { CheckmarkGlyph, ChoreCalendarGlyph, MoreDotsGlyph, ZoneCalendarGlyph } from '@/components/glyphs';
import { PressScale } from '@/components/motion';
import { predefinedZoneSections, zoneIcon, zonePalettes } from '@/models/zones';
import { dueAccent, dueBarGradient, dueTrackFill, occurrenceBadgeText, occurrenceBarFraction, occurrenceDueState } from '@/models/dueState';
import { useChores, type Chore } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { AvatarView } from '@/components/AvatarView';
import { cardColor, colors, font, s } from '@/theme';
import { AppImage } from '@/components/AppImage';

const GREEN = '#2DA100';
export type ScheduleFilter = { zones: string[]; memberIds: string[]; dueStates: string[] };
export const emptyScheduleFilter: ScheduleFilter = { zones: [], memberIds: [], dueStates: [] };
export const scheduleFilterActive = (filter: ScheduleFilter) => filter.zones.length > 0 || filter.memberIds.length > 0 || filter.dueStates.length > 0;
export type ReportPeriod = 'thisWeek' | 'previousWeek' | 'thisMonth';

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDay = (date: Date) => `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

/** The gradient icon tile iOS shows next to each zone name. */
export function ZoneTile({ zoneName, size = 32, radius = 8, glyph = 20 }: { zoneName: string; size?: number; radius?: number; glyph?: number }) {
  const store = useChores();
  const created = store.createdZones.find(zone => zone.name === zoneName);
  const predefined = predefinedZoneSections.flatMap(section => section.items).find(item => item.name === zoneName);
  if (created) {
    return (
      <View style={{ width: s(size), height: s(size), borderRadius: s(size / 2), backgroundColor: `${colors.purple}1A`, alignItems: 'center', justifyContent: 'center' }}>
        <AppImage source={zoneIcon(created.iconAsset)} resizeMode="contain" style={{ width: s(glyph * 0.9), height: s(glyph * 0.9), tintColor: colors.purple }} />
      </View>
    );
  }
  const palette = zonePalettes[predefined?.palette ?? 0];
  return (
    <LinearGradient colors={[palette.top, palette.bottom]} style={{ width: s(size), height: s(size), borderRadius: s(radius), borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' }}>
      <AppImage source={zoneIcon(predefined?.iconAsset ?? 'zone1Icon')} resizeMode="contain" style={{ width: s(glyph), height: s(glyph), tintColor: colors.white }} />
    </LinearGradient>
  );
}

function FilterRow({ leading, title, selected, onPress }: { leading: React.ReactNode; title: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable onPress={() => { void Haptics.selectionAsync(); onPress(); }} style={styles.filterRow}>
      {leading}
      <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.spacer} />
      <SheetCheckbox on={selected} />
    </Pressable>
  );
}

const DUE_OPTIONS = [
  { label: 'All', key: null, color: colors.purple },
  { label: 'Today', key: 'today', color: '#3F81FF' },
  { label: 'Overdue', key: 'overdue', color: '#FF5757' },
  { label: 'Upcoming', key: 'upcoming', color: GREEN },
] as const;

/** iOS `ScheduleFilterSheet`: Zones / Member / Due Within rail, defaulting to Due Within. */
export function ScheduleFilterSheet({ initial, onSave, onClose }: { initial: ScheduleFilter; onSave(filter: ScheduleFilter): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose}>
      <ScheduleFilterBody initial={initial} onSave={onSave} />
    </BottomSheet>
  );
}

function ScheduleFilterBody({ initial, onSave }: { initial: ScheduleFilter; onSave(filter: ScheduleFilter): void }) {
  const { close } = useSheet();
  // Absolute sheet footers escape the card's `paddingBottom: insets.bottom`.
  const insets = useSafeAreaInsets();
  const store = useChores();
  const { members } = useHousehold();
  const [tab, setTab] = useState(2);
  const [draft, setDraft] = useState(initial);
  const [search, setSearch] = useState('');

  const predefined = predefinedZoneSections.flatMap(section => section.items);
  const query = search.trim().toLowerCase();
  const shownMembers = query ? members.filter(member => member.name.toLowerCase().includes(query)) : members;
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  return (
    <>
      <SheetHeader title="Filter By" />
      <View style={styles.headerDivider} />
      <View style={styles.body}>
        <TabRail titles={['Zones', 'Member', 'Due Within']} tab={tab} setTab={setTab} />
        <View style={styles.content}>
          {tab === 0 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
              {store.createdZones.map(zone => (
                <FilterRow key={zone.id} leading={<ZoneTile zoneName={zone.name} />} title={zone.name} selected={draft.zones.includes(zone.name)} onPress={() => setDraft({ ...draft, zones: toggle(draft.zones, zone.name) })} />
              ))}
              {predefined.map(zone => (
                <FilterRow key={zone.name} leading={<ZoneTile zoneName={zone.name} />} title={zone.name} selected={draft.zones.includes(zone.name)} onPress={() => setDraft({ ...draft, zones: toggle(draft.zones, zone.name) })} />
              ))}
            </ScrollView>
          )}
          {tab === 1 && (
            <View style={styles.memberBlock}>
              <View style={styles.searchBar}>
                <View style={styles.searchIcon}><Images.choreSearchIcon width={s(18)} height={s(18)} /></View>
                <TextInput value={search} onChangeText={setSearch} placeholder="Search Member" placeholderTextColor={`${colors.text}66`} style={styles.searchField} selectionColor={colors.purple} />
              </View>
              {shownMembers.length === 0 ? (
                <Text style={styles.emptyText}>No members yet</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                  {shownMembers.map(member => (
                    <FilterRow key={member.id} leading={<MemberDot member={member} />} title={member.name} selected={draft.memberIds.includes(member.id)} onPress={() => setDraft({ ...draft, memberIds: toggle(draft.memberIds, member.id) })} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          {tab === 2 && (
            <View style={styles.listContent}>
              {DUE_OPTIONS.map(option => (
                <FilterRow
                  key={option.label}
                  leading={(
                    <View style={[styles.dueTile, { backgroundColor: `${option.color}1A` }]}>
                      <ZoneCalendarGlyph size={s(16)} color={option.color} />
                    </View>
                  )}
                  title={option.label}
                  selected={option.key === null ? draft.dueStates.length === 0 : draft.dueStates.includes(option.key)}
                  onPress={() => setDraft({ ...draft, dueStates: option.key === null ? [] : toggle(draft.dueStates, option.key) })}
                />
              ))}
            </View>
          )}
        </View>
      </View>
      <LinearGradient colors={[`${colors.background}00`, colors.background]} style={[styles.bottomBar, { paddingBottom: Math.max(s(40), insets.bottom + s(16)) }]}>
        <PressScale onPress={() => setDraft(emptyScheduleFilter)} style={styles.clearButton}><Text style={styles.clearLabel}>Clear all</Text></PressScale>
        <PressScale haptic="none" onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); const saved = draft; close(() => onSave(saved)); }} style={styles.saveButton}><Text style={styles.saveLabel}>Save</Text></PressScale>
      </LinearGradient>
    </>
  );
}

function MemberDot({ member }: { member: HouseholdMember }) {
  return (
    <View style={styles.memberDot}>
      <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(32)} />
    </View>
  );
}

/** iOS tab rail: purple-tinted pills with a trailing-rounded shape and a leading accent bar. */
function TabRail({ titles, tab, setTab }: { titles: string[]; tab: number; setTab(index: number): void }) {
  return (
    <View style={styles.rail}>
      {titles.map((title, index) => {
        const selected = tab === index;
        return (
          <Pressable key={title} onPress={() => { void Haptics.selectionAsync(); setTab(index); }} style={[styles.railButton, selected && styles.railButtonOn]}>
            <View style={[styles.railAccent, { backgroundColor: selected ? colors.white : `${colors.text}4D` }]} />
            <Text style={[styles.railLabel, selected && { color: colors.white }]}>{title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** iOS `ChartDownloadSheet`: Time Period / Member segmented control with a Select All toggle and the Download CTA. */
export function ChartDownloadSheet({ members, onDownload, onClose }: { members: HouseholdMember[]; onDownload(period: ReportPeriod, memberIds: string[]): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose}>
      <ChartDownloadBody members={members} onDownload={onDownload} />
    </BottomSheet>
  );
}

function ChartDownloadBody({ members, onDownload }: { members: HouseholdMember[]; onDownload(period: ReportPeriod, memberIds: string[]): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState<ReportPeriod>('thisWeek');
  const [selected, setSelected] = useState(members.map(member => member.id));

  const monday = (offset: number) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + offset * 7); return date; };
  const weekLabel = (offset: number) => { const start = monday(offset); const end = new Date(start); end.setDate(start.getDate() + 6); return `${shortDay(start)} - ${shortDay(end)}`; };
  const monthLabel = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const allSelected = selected.length === members.length && members.length > 0;
  const disabled = tab === 1 && selected.length === 0;

  const periodRow = (value: ReportPeriod, title: string, subtitle: string) => (
    <Pressable key={value} onPress={() => { void Haptics.selectionAsync(); setPeriod(value); }} style={styles.periodRow}>
      <View style={styles.periodTile}><ChoreCalendarGlyph size={s(18)} color={colors.purple} /></View>
      <View style={styles.periodCopy}>
        <Text style={styles.periodTitle}>{title}</Text>
        <Text style={styles.periodSubtitle}>{subtitle}</Text>
      </View>
      <SheetRadio on={period === value} />
    </Pressable>
  );

  return (
    <>
      <SheetHeader title="Download Chores report" borderOpacity={0.5} />
      <View style={styles.segment}>
        {['Time Period', 'Member'].map((title, index) => (
          <Pressable key={title} onPress={() => { void Haptics.selectionAsync(); setTab(index); }} style={[styles.segmentButton, tab === index && styles.segmentButtonOn]}>
            <Text style={[styles.segmentLabel, tab === index && styles.segmentLabelOn]}>{title}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.downloadBody}>
        {tab === 0 ? (
          <View style={styles.downloadSection}>
            <Text style={styles.sectionTitle}>Select Time Period</Text>
            <View style={styles.periodList}>
              {periodRow('thisWeek', 'This Week', weekLabel(0))}
              {periodRow('previousWeek', 'Previous Week', weekLabel(-1))}
              {periodRow('thisMonth', 'This Month', monthLabel)}
            </View>
          </View>
        ) : (
          <View style={styles.downloadSection}>
            <View style={styles.selectAllRow}>
              <Text style={styles.sectionTitle}>Select Member</Text>
              <Pressable onPress={() => { void Haptics.selectionAsync(); setSelected(allSelected ? [] : members.map(member => member.id)); }} style={styles.selectAll}>
                <Text style={styles.selectAllLabel}>Select All</Text>
                <SheetCheckbox on={allSelected} size={21} radius={4.4} tick={10} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.memberList}>
              {members.map((member, index) => {
                const on = selected.includes(member.id);
                return (
                  <Pressable key={member.id} onPress={() => { void Haptics.selectionAsync(); setSelected(on ? selected.filter(id => id !== member.id) : [...selected, member.id]); }} style={styles.downloadMemberRow}>
                    <View style={[styles.ringAvatar, { backgroundColor: `${cardColor(index)}33` }]}>
                      <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(35)} />
                    </View>
                    <Text style={styles.rowTitle} numberOfLines={1}>{member.name}</Text>
                    <View style={styles.spacer} />
                    <SheetCheckbox on={on} size={21} radius={4.4} tick={10} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={[styles.downloadFooter, { paddingBottom: sheetFooterPad(30, insets.bottom) }]}>
        <SheetCTA
          label="Download"
          disabled={disabled}
          onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); const ids = selected; const chosen = period; close(() => onDownload(chosen, ids)); }}
        />
      </View>
    </>
  );
}

type Occurrence = { id: string; chore: Chore; day: Date };

/** iOS `ChartMemberSheet`: the member's week grouped by zone, with per-card Done / Skip / Snooze. */
export function ChartMemberSheet({ memberId, memberName, weekDays, onChoreTap, onClose }: { memberId: string; memberName: string; weekDays: Date[]; onChoreTap(chore: Chore, day: Date): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose}>
      <ChartMemberBody memberId={memberId} memberName={memberName} weekDays={weekDays} onChoreTap={onChoreTap} />
    </BottomSheet>
  );
}

function ChartMemberBody({ memberId, memberName, weekDays, onChoreTap }: { memberId: string; memberName: string; weekDays: Date[]; onChoreTap(chore: Chore, day: Date): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const store = useChores();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [snooze, setSnooze] = useState<Occurrence | null>(null);

  /** iOS `groups()`: zone order follows first appearance; occurrences sort by day. */
  const groups = (() => {
    const mine = store.chores.filter(chore => chore.assignedMemberIds.includes(memberId));
    const order: string[] = [];
    const byZone = new Map<string, Occurrence[]>();
    mine.forEach(chore => {
      const days = weekDays.filter(day => store.occurs(chore, day));
      if (!days.length) return;
      if (!byZone.has(chore.zoneName)) { order.push(chore.zoneName); byZone.set(chore.zoneName, []); }
      days.forEach(day => byZone.get(chore.zoneName)!.push({ id: `${chore.id}_${dayKey(day)}`, chore, day }));
    });
    return order.map(name => ({ name, occurrences: (byZone.get(name) ?? []).sort((a, b) => a.day.getTime() - b.day.getTime()) }));
  })();

  return (
    <>
      <SheetHeader title={`Chores for ${memberName}`} borderOpacity={0.5} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.memberSheetContent, { paddingBottom: sheetFooterPad(30, insets.bottom) }]} onScrollBeginDrag={() => setOpenMenu(null)}>
        {groups.map(group => (
          <View key={group.name} style={styles.zoneGroup}>
            <View style={styles.zoneGroupHead}>
              <ZoneTile zoneName={group.name} size={32} radius={10} glyph={20} />
              <Text style={styles.zoneGroupName} numberOfLines={1}>{group.name}</Text>
            </View>
            {group.occurrences.map(occurrence => (
              <OccurrenceCard
                key={occurrence.id}
                occurrence={occurrence}
                menuOpen={openMenu === occurrence.id}
                onToggleMenu={() => setOpenMenu(openMenu === occurrence.id ? null : occurrence.id)}
                onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setOpenMenu(null); close(() => onChoreTap(occurrence.chore, occurrence.day)); }}
                onSnooze={() => { setOpenMenu(null); setSnooze(occurrence); }}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {snooze && (
        <SnoozeUntilSheet
          baseDate={snooze.day}
          onDone={target => { void store.snoozeOccurrence(snooze.chore, snooze.day, target); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSnooze(null); }}
          onClose={() => setSnooze(null)}
        />
      )}
    </>
  );
}

function OccurrenceCard({ occurrence, menuOpen, onToggleMenu, onPress, onSnooze }: { occurrence: Occurrence; menuOpen: boolean; onToggleMenu(): void; onPress(): void; onSnooze(): void }) {
  const store = useChores();
  const { chore, day } = occurrence;
  const done = store.isDoneOn(chore.id, day);
  const state = occurrenceDueState(day);
  const accent = dueAccent[state];
  const fraction = occurrenceBarFraction(day, state);
  const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.occurrenceWrap}>
      <PressScale onPress={onPress} haptic="none" style={styles.occurrenceCard}>
        <View style={styles.occurrenceTop}>
          <Text style={[styles.occurrenceName, done && styles.occurrenceNameDone]}>{chore.name}</Text>
          {!done && !!chore.dueTime && <Text style={styles.occurrenceTime}>{chore.dueTime}</Text>}
          <View style={styles.spacer} />
          <Pressable hitSlop={8} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleMenu(); }} style={styles.occurrenceDots}>
            <MoreDotsGlyph size={s(16)} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.occurrenceBottom}>
          {done ? (
            <View style={styles.completedPill}>
              <Text style={styles.completedText}>Completed at {chore.completedTime || chore.dueTime || ''}</Text>
            </View>
          ) : (
            <>
              <View style={[styles.dueBadge, { backgroundColor: `${accent}1A` }]}>
                <ZoneCalendarGlyph size={s(14)} color={accent} />
                <Text style={[styles.dueBadgeText, { color: accent }]}>{occurrenceBadgeText(day)}</Text>
              </View>
              <View style={styles.spacer} />
              <View style={styles.progressBlock}>
                <Text style={styles.progressLabel}>{occurrenceBadgeText(day)}</Text>
                <View style={[styles.progressTrack, { backgroundColor: dueTrackFill[state] }]}>
                  <LinearGradient colors={dueBarGradient[state]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.progressFill, { width: s(142) * fraction }]} />
                  <View style={[styles.progressTick, { left: s(91) }]} />
                  <View style={[styles.progressTick, { left: s(115) }]} />
                </View>
              </View>
            </>
          )}
        </View>
      </PressScale>

      {menuOpen && (
        <View style={styles.cardMenu}>
          <Pressable onPress={() => { onToggleMenu(); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.setOccurrenceStatus(chore, day, 'done'); }} style={styles.cardMenuRow}>
            <Images.markDoneIcon width={s(20)} height={s(20)} />
            <Text style={[styles.cardMenuLabel, { color: GREEN }]}>Mark as Done</Text>
          </Pressable>
          <View style={styles.cardMenuDivider} />
          <Pressable onPress={() => { onToggleMenu(); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.setOccurrenceStatus(chore, day, 'skipped'); }} style={styles.cardMenuRow}>
            <Images.skipIcon width={s(20)} height={s(20)} />
            <Text style={styles.cardMenuLabel}>Skip Chore</Text>
          </Pressable>
          <View style={styles.cardMenuDivider} />
          <Pressable onPress={onSnooze} style={styles.cardMenuRow}>
            <View style={styles.pauseGlyph}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
            <Text style={[styles.cardMenuLabel, { color: colors.purple }]}>Snooze Chore</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const SNOOZE_PRESETS = [1, 2, 3, 4, 5, 7];

/** iOS `SnoozeUntilSheet`: six preset cards in two columns plus Done. */
export function SnoozeUntilSheet({ baseDate, onDone, onClose }: { baseDate: Date; onDone(target: Date): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height="auto">
      <SnoozeUntilBody baseDate={baseDate} onDone={onDone} />
    </BottomSheet>
  );
}

function SnoozeUntilBody({ baseDate, onDone }: { baseDate: Date; onDone(target: Date): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [selected, setSelected] = useState(0);
  const target = (days: number) => { const date = new Date(baseDate); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + days); return date; };

  return (
    <>
      <SheetHeader title="Snooze until" borderOpacity={0.5} />
      <View style={styles.snoozeGrid}>
        {SNOOZE_PRESETS.map((days, index) => {
          const on = selected === index;
          return (
            <Pressable key={days} onPress={() => { void Haptics.selectionAsync(); setSelected(index); }} style={styles.snoozeCard}>
              <View style={styles.snoozeCopy}>
                <Text style={[styles.snoozeTitle, on && { ...font('medium', 15) }]}>Until {days} Day{days === 1 ? '' : 's'}</Text>
                <Text style={styles.snoozeSubtitle}>{shortDay(target(days))}</Text>
              </View>
              <SheetRadio on={on} />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.snoozeFooter, { paddingBottom: sheetFooterPad(30, insets.bottom) }]}>
        <SheetCTA label="Done" onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); const date = target(SNOOZE_PRESETS[selected]); close(() => onDone(date)); }} />
      </View>
    </>
  );
}

export { CheckmarkGlyph };

const styles = StyleSheet.create({
  headerDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginTop: s(18) },
  body: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: s(120), paddingTop: s(6), gap: s(6) },
  railButton: { paddingLeft: s(20), paddingRight: s(10), paddingVertical: s(20), backgroundColor: `${colors.purple}1A`, borderTopRightRadius: s(16), borderBottomRightRadius: s(16), justifyContent: 'center' },
  railButtonOn: { backgroundColor: colors.purple },
  railAccent: { position: 'absolute', left: 0, width: s(3), height: s(26), borderRadius: s(1.5) },
  railLabel: { ...font('regular', 16), color: colors.text },
  content: { flex: 1, paddingLeft: s(14), paddingRight: s(15), paddingTop: s(5) },
  listContent: { paddingTop: s(4), paddingBottom: s(100), gap: s(10) },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingLeft: s(10), paddingRight: s(6), height: s(52), borderRadius: s(9.554), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(1), blurRadius: s(6), color: 'rgba(0,0,0,0.05)' }] },
  rowTitle: { ...font('regular', 14), color: colors.text, flexShrink: 1 },
  spacer: { flex: 1 },
  dueTile: { width: s(32), height: s(32), borderRadius: s(16), alignItems: 'center', justifyContent: 'center' },
  memberDot: { width: s(32), height: s(32), borderRadius: s(16), backgroundColor: '#FF6E92', overflow: 'hidden' },
  memberDotImage: { width: '100%', height: '100%' },
  memberBlock: { flex: 1, gap: s(10) },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(12), height: s(40), borderRadius: s(20), borderWidth: 1, borderColor: `${colors.text}33` },
  searchIcon: { opacity: 0.3 },
  searchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  emptyText: { ...font('regular', 14), color: `${colors.text}66`, textAlign: 'center', marginTop: s(30) },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: s(15), paddingHorizontal: s(25), paddingTop: s(35), paddingBottom: s(40) },
  clearButton: { width: s(96), height: s(44), borderRadius: s(22), backgroundColor: `${colors.purple}1A`, alignItems: 'center', justifyContent: 'center' },
  clearLabel: { ...font('medium', 15), color: colors.text },
  saveButton: { flex: 1, height: s(44), borderRadius: s(22), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  saveLabel: { ...font('semibold', 15), color: colors.white },

  segment: { marginHorizontal: s(15), marginTop: s(20), height: s(50), borderRadius: s(15), borderWidth: 1, borderColor: `${colors.text}33`, padding: s(5), flexDirection: 'row' },
  segmentButton: { flex: 1, height: s(40), borderRadius: s(12), alignItems: 'center', justifyContent: 'center' },
  segmentButtonOn: { backgroundColor: colors.purple, borderWidth: 1, borderColor: '#0B254533' },
  segmentLabel: { ...font('medium', 14), color: colors.text },
  segmentLabelOn: { ...font('semibold', 14), color: colors.white },
  downloadBody: { flex: 1 },
  downloadSection: { flex: 1, paddingHorizontal: s(15), paddingTop: s(20), gap: s(15) },
  sectionTitle: { ...font('semibold', 16), color: colors.text },
  periodList: { gap: s(8) },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(15), height: s(68), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(6), color: 'rgba(0,0,0,0.05)' }] },
  periodTile: { width: s(38), height: s(38), borderRadius: s(10.86), backgroundColor: `${colors.purple}14`, alignItems: 'center', justifyContent: 'center' },
  periodCopy: { flex: 1, gap: s(4) },
  periodTitle: { ...font('regular', 15), color: colors.text },
  periodSubtitle: { ...font('regular', 12), color: `${colors.text}80` },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  selectAllLabel: { ...font('regular', 15), color: colors.text },
  memberList: { gap: s(8), paddingBottom: s(10) },
  downloadMemberRow: { flexDirection: 'row', alignItems: 'center', gap: s(14), paddingHorizontal: s(10), height: s(62), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(6), color: 'rgba(0,0,0,0.05)' }] },
  ringAvatar: { width: s(42), height: s(42), borderRadius: s(21), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.white },
  ringAvatarImage: { width: s(35), height: s(35), borderRadius: s(17.5) },
  downloadFooter: { paddingHorizontal: s(25), paddingTop: s(10), paddingBottom: s(30) },

  memberSheetContent: { paddingHorizontal: s(15), paddingTop: s(18), paddingBottom: s(30), gap: s(20) },
  zoneGroup: { gap: s(10) },
  zoneGroupHead: { flexDirection: 'row', alignItems: 'center', gap: s(11) },
  zoneGroupName: { ...font('semibold', 16), color: colors.text, flexShrink: 1 },
  occurrenceWrap: { position: 'relative' },
  occurrenceCard: { padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(10), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  occurrenceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: s(8) },
  occurrenceName: { ...font('regular', 15), color: colors.text, flexShrink: 1 },
  occurrenceNameDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  occurrenceTime: { ...font('medium', 12), color: '#EFA228' },
  occurrenceDots: { width: s(20), alignItems: 'flex-end' },
  occurrenceBottom: { flexDirection: 'row', alignItems: 'flex-end' },
  completedPill: { backgroundColor: `${GREEN}1A`, borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6) },
  completedText: { ...font('medium', 12), color: GREEN },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: s(5), borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6) },
  dueBadgeText: { ...font('medium', 12) },
  progressBlock: { alignItems: 'flex-end', gap: s(4) },
  progressLabel: { ...font('regular', 10), color: `${colors.text}80` },
  progressTrack: { width: s(142), height: s(19), borderRadius: s(9.5), overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: s(9.5) },
  progressTick: { position: 'absolute', width: 1, height: s(8), backgroundColor: colors.white },
  cardMenu: { position: 'absolute', top: s(40), right: 0, width: s(200), zIndex: 50, borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: -s(5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  cardMenuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(14), height: s(48) },
  cardMenuLabel: { ...font('regular', 14), color: colors.text },
  cardMenuDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginHorizontal: s(14) },
  pauseGlyph: { width: s(20), height: s(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(2) },
  pauseBar: { width: s(3), height: s(11), borderRadius: s(1.5), backgroundColor: colors.purple },

  snoozeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: s(15), paddingTop: s(20), gap: s(8), columnGap: s(9) },
  snoozeCard: { width: '48%', height: s(66), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  snoozeCopy: { gap: s(4) },
  snoozeTitle: { ...font('regular', 15), color: colors.text },
  snoozeSubtitle: { ...font('regular', 12), color: `${colors.text}80` },
  snoozeFooter: { paddingHorizontal: s(15), paddingTop: s(30), paddingBottom: s(30) },
});
