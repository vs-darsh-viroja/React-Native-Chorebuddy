import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { BottomSheet, SheetCTA, SheetHeader, sheetFooterPad, useSheet } from '@/components/BottomSheet';
import { ChevronGlyph, DueOnGlyph } from '@/components/glyphs';
import { SnoozeUntilSheet } from '@/components/ScheduleSheets';
import { CircleButton, PressScale, useFloat } from '@/components/motion';
import { dueAccent, dueBarGradient, dueCardFill, dueTrackFill, liveDueStateOn, parseDueDate } from '@/models/dueState';
import { useChores, type Chore } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { AvatarView } from '@/components/AvatarView';
import { colors, font, isSmallPhone, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

const GREEN = '#2DA100';
const ORANGE = '#FB8C07';
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayText = (date: Date) => `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })}, ${date.getFullYear()}`;
const timeString = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

type StatusAction = 'snooze' | 'done' | 'skip' | null;

/** iOS `ChoreStatusView`: floating mascot, the themed Due On / Completed / Skipped / Snoozed card, progress bar, and the Snooze/Done/Skip action card. */
export function ChoreStatusView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChoreStatus'>) {
  const insets = useSafeAreaInsets();
  const store = useChores();
  const { members } = useHousehold();
  const float = useFloat(8, 1.8);
  const [sheet, setSheet] = useState<'done' | 'snooze' | null>(null);

  const chore = store.chores.find(item => item.id === route.params.choreId);
  /**
   * The occurrence this screen manages. Every action below writes to this day,
   * so the card must describe it too — with no `day` param the chore's own
   * anchor is the occurrence, not today.
   */
  const anchorDate = parseDueDate(chore?.dueDate ?? '');
  const occurrenceDay = route.params.day ? new Date(`${route.params.day}T00:00:00`) : (anchorDate ?? new Date());

  if (!chore) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chore Status</Text>
          <View style={styles.headerButtons}>
            <CircleButton onPress={() => navigation.goBack()}>
              <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
            </CircleButton>
          </View>
        </View>
      </View>
    );
  }

  /**
   * iOS `isOccurrenceDone`: a done event for this day, or — when this day IS the
   * chore's anchor due date — the chore document's own `completed` flag.
   */
  const isDone = store.isDoneOn(chore.id, occurrenceDay) || (anchorDate !== null && dayKey(anchorDate) === dayKey(occurrenceDay) && chore.completed);
  /** iOS `activeAction`: done wins, then skipped, then snoozed. */
  const activeAction: StatusAction = isDone ? 'done'
    : store.hasEvent(chore.id, occurrenceDay, 'skipped') ? 'skip'
      : store.isSnoozed(chore.id, occurrenceDay) ? 'snooze' : null;

  /**
   * Deliberate divergence from iOS: `ChoreStatusView.swift` themes Due On from
   * `draft.dueDate` — the chore's single stored anchor — so every occurrence of
   * a recurring chore reads the same date. Tapping "Due Tomorrow" in the chart
   * then showed "31 August, 2026" while Done/Skip wrote to 2 September. The
   * occurrence's own day is the truth here, and the Completed/Skipped branches
   * below already used it.
   */
  const live = liveDueStateOn(occurrenceDay);
  const occurrenceText = dayText(occurrenceDay);
  /** iOS `statusTheme`. */
  const theme = activeAction === 'done'
    ? { accent: GREEN, cardFill: '#EAF6E6', title: 'Completed', detail: chore.completedTime ? `at ${chore.completedTime}` : dayText(occurrenceDay), pill: 'Done', trackFill: '#EAF6E6', bar: ['#ADF079', GREEN] as [string, string], fraction: 1, progressLabel: 'Completed' }
    : activeAction === 'skip'
      ? { accent: ORANGE, cardFill: '#FFF3E3', title: 'Skipped', detail: dayText(occurrenceDay), pill: 'Skipped', trackFill: '#FFF3E3', bar: ['#FFD79B', ORANGE] as [string, string], fraction: 1, progressLabel: 'Skipped this time' }
      : activeAction === 'snooze'
        ? { accent: colors.purple, cardFill: `${colors.purple}1A`, title: 'Snoozed', detail: occurrenceText, pill: 'Snoozed', trackFill: `${colors.purple}1F`, bar: [`${colors.purple}73`, colors.purple] as [string, string], fraction: 1, progressLabel: 'Snoozed to a later date' }
        : { accent: dueAccent[live.state], cardFill: dueCardFill[live.state], title: 'Due On', detail: occurrenceText, pill: chore.frequency || 'One Time', trackFill: dueTrackFill[live.state], bar: dueBarGradient[live.state], fraction: live.fraction, progressLabel: live.label };

  const assigned = chore.assignedMemberIds.map(id => members.find(member => member.id === id)).filter((member): member is HouseholdMember => Boolean(member));
  const overflow = assigned.length - 2;

  /** iOS `resetStatus`: clears whichever outcome is currently active. */
  const reset = () => {
    if (!activeAction) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeAction === 'snooze') void store.resetSnooze(chore, occurrenceDay);
    else void store.setOccurrenceStatus(chore, occurrenceDay, null);
  };

  return (
    <View style={styles.root}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chore Status</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          <CircleButton onPress={reset}>
            <View style={{ opacity: activeAction ? 0.7 : 0.3 }}>
              <Images.statusResetIcon width={s(20)} height={s(20)} />
            </View>
          </CircleButton>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: s(40) + insets.bottom }]}>
        <AnimatedAppImage source={Images.statusMascot} resizeMode="contain" style={[styles.mascot, { transform: [{ translateY: float }] }]} />

        <View style={styles.nameRow}>
          <View style={styles.nameCopy}>
            <Text style={styles.name}>{chore.name}</Text>
            <Text style={styles.zone}>{chore.zoneName}</Text>
          </View>
          <View style={styles.avatars}>
            {assigned.slice(0, 2).map(member => (
              <View key={member.id} style={styles.avatar}>
                <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(30)} />
              </View>
            ))}
            {overflow > 0 && <View style={[styles.avatar, styles.avatarOverflow]}><Text style={styles.avatarOverflowText}>+{overflow}</Text></View>}
          </View>
        </View>

        <View style={[styles.dueCard, { backgroundColor: theme.cardFill, borderColor: theme.accent }]}>
          <View style={[styles.dueIcon, { backgroundColor: theme.accent }]}>
            <DueOnGlyph size={s(22)} color={colors.white} />
          </View>
          <View style={styles.dueCopy}>
            <Text style={[styles.dueTitle, { color: theme.accent }]}>{theme.title}</Text>
            <Text style={styles.dueDetail}>{theme.detail}</Text>
          </View>
          <View style={[styles.duePill, { backgroundColor: `${theme.accent}1A` }]}>
            <Text style={[styles.duePillText, { color: theme.accent }]}>{theme.pill}</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>{theme.progressLabel}</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.trackFill }]}>
            <LinearGradient colors={theme.bar} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, theme.fraction)) * 100}%` }]} />
            <View style={[styles.progressTick, { left: '61%' }]} />
            <View style={[styles.progressTick, { left: '87%' }]} />
          </View>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>What would you like to do?</Text>
            <Text style={styles.actionSubtitle}>Manage this chore quickly</Text>
          </View>
          <View style={styles.actionRow}>
            <ActionButton
              active={activeAction === 'snooze'}
              Icon={Images.statusSnoozeIcon}
              activeIcon={Images.statusSnoozeIcon2}
              title="Snooze"
              fill="#F0F2FE"
              border="#3C78FE80"
              textColor="#3C78FE"
              gradient={['#CEDDFD', '#7FA6FF']}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet('snooze'); }}
            />
            <ActionButton
              active={activeAction === 'done'}
              Icon={Images.statusDoneIcon}
              activeIcon={Images.statusDoneIcon2}
              title="Done"
              fill="#E9FFE9"
              border="#37BE0380"
              textColor="#37BE03"
              gradient={['#B8FBB2', '#37BE02']}
              onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet('done'); }}
            />
            <ActionButton
              active={activeAction === 'skip'}
              Icon={Images.statusSkipIcon}
              activeIcon={Images.statusSkipIcon2}
              title="Skip"
              fill="#FCF1F7"
              border="#F99BAF80"
              textColor="#F7758D"
              gradient={['#FFDBE4', '#FF9EB0']}
              onPress={() => {
                if (activeAction === 'skip') return;
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                void store.setOccurrenceStatus(chore, occurrenceDay, 'skipped');
              }}
            />
          </View>
        </View>
      </ScrollView>

      {sheet === 'done' && (
        <DoneSheet
          occurrenceDay={occurrenceDay}
          onDone={date => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void store.setOccurrenceStatus(chore, occurrenceDay, 'done', completedAtText(date));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'snooze' && (
        <SnoozeUntilSheet
          baseDate={occurrenceDay}
          onDone={target => { void store.snoozeOccurrence(chore, occurrenceDay, target); void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  );
}

/** iOS `completedAtText`: bare time for today, otherwise "d MMM, h:mm a". */
function completedAtText(picked: Date) {
  const now = timeString(new Date());
  if (dayKey(picked) === dayKey(new Date())) return now;
  return `${picked.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${now}`;
}

/**
 * iOS `actionButton`: tinted when idle, gradient-filled with the alternate icon
 * when it is the active state. The idle art ships as an SVG and the active art
 * as a PNG, so the two are rendered differently.
 */
function ActionButton({ active, Icon, activeIcon, title, fill, border, textColor, gradient, onPress }: { active: boolean; Icon: React.ComponentType<{ width: number; height: number }>; activeIcon: number; title: string; fill: string; border: string; textColor: string; gradient: [string, string]; onPress(): void }) {
  const content = (
    <>
      {active ? <AppImage source={activeIcon} resizeMode="contain" style={styles.actionIcon} /> : <Icon width={s(18)} height={s(18)} />}
      <Text style={[styles.actionLabel, { color: active ? colors.white : textColor }]}>{title}</Text>
    </>
  );
  return (
    <PressScale haptic="none" onPress={onPress} style={styles.actionButtonWrap}>
      {active ? (
        <LinearGradient colors={gradient} style={[styles.actionButton, { borderColor: textColor }]}>{content}</LinearGradient>
      ) : (
        <View style={[styles.actionButton, { backgroundColor: fill, borderColor: border }]}>
          <View style={styles.actionInnerRing} pointerEvents="none" />
          {content}
        </View>
      )}
    </PressScale>
  );
}

/** iOS `doneSheet`: the "When you did it?" month grid capped at today. */
function DoneSheet({ occurrenceDay, onDone, onClose }: { occurrenceDay: Date; onDone(date: Date): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height="auto" bunny="leading">
      <DoneSheetBody occurrenceDay={occurrenceDay} onDone={onDone} />
    </BottomSheet>
  );
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const CORAL = '#FF5757';

function DoneSheetBody({ occurrenceDay, onDone }: { occurrenceDay: Date; onDone(date: Date): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [selected, setSelected] = useState(occurrenceDay);
  const [visibleMonth, setVisibleMonth] = useState(() => { const base = new Date(occurrenceDay); base.setDate(1); base.setHours(0, 0, 0, 0); return base; });
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cells = (() => {
    const leading = visibleMonth.getDay();
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const result: Array<Date | null> = Array.from({ length: leading }, () => null);
    for (let offset = 0; offset < daysInMonth; offset += 1) result.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), offset + 1));
    return result;
  })();
  const canGoForward = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1) < new Date(today.getFullYear(), today.getMonth(), 1);
  const shiftMonth = (delta: number) => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVisibleMonth(previous => { const next = new Date(previous); next.setMonth(previous.getMonth() + delta); return next; }); };

  return (
    <>
      <SheetHeader title="When you did it?" />
      <View style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <View style={styles.monthTitleRow}>
            <Text style={styles.monthTitle}>{visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
            <ChevronGlyph width={s(5)} height={s(10)} color={colors.purple} />
          </View>
          <View style={styles.monthButtons}>
            <Pressable hitSlop={8} onPress={() => shiftMonth(-1)} style={styles.mirrored}><ChevronGlyph width={s(6)} height={s(12)} color={colors.purple} /></Pressable>
            <Pressable hitSlop={8} disabled={!canGoForward} onPress={() => shiftMonth(1)} style={!canGoForward && styles.disabledArrow}><ChevronGlyph width={s(6)} height={s(12)} color={colors.purple} /></Pressable>
          </View>
        </View>
        <View style={styles.weekHeader}>
          {WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index === 0 && { color: CORAL }]}>{day}</Text>)}
        </View>
        <View style={styles.grid}>
          {cells.map((date, index) => {
            if (!date) return <View key={`blank${index}`} style={styles.dayCell} />;
            const disabled = date > today;
            const isSelected = dayKey(date) === dayKey(selected);
            const sunday = date.getDay() === 0;
            return (
              <Pressable key={dayKey(date)} disabled={disabled} onPress={() => { void Haptics.selectionAsync(); setSelected(date); }} style={styles.dayCell}>
                <View style={[styles.dayBox, isSelected && styles.daySelected]}>
                  <Text style={[styles.dayText, sunday && { color: CORAL }, isSelected && { color: colors.purple }, disabled && { color: `${colors.text}40` }]}>{date.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={[styles.sheetFooter, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <SheetCTA label="Done" shadow onPress={() => { const picked = selected; close(() => onDone(picked)); }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(isSmallPhone ? 40 : 59), paddingHorizontal: s(15), height: s(isSmallPhone ? 80 : 99), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 24), lineHeight: s(28.6), includeFontPadding: false, color: colors.text },
  headerButtons: { position: 'absolute', top: s(isSmallPhone ? 40 : 59), left: s(15), right: s(15), flexDirection: 'row', justifyContent: 'space-between' },
  headerIcon: { width: s(20), height: s(20) },
  content: { paddingHorizontal: s(15), paddingBottom: s(40) },
  mascot: { alignSelf: 'center', marginTop: s(isSmallPhone ? 12 : 22), height: s(isSmallPhone ? 118 : 164) },
  nameRow: { marginTop: s(isSmallPhone ? 14 : 20), flexDirection: 'row', alignItems: 'center' },
  nameCopy: { flex: 1, gap: s(3) },
  name: { ...font('semibold', 30), lineHeight: s(35.8), includeFontPadding: false, color: colors.text },
  zone: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: `${colors.text}80` },
  avatars: { flexDirection: 'row' },
  avatar: { width: s(30), height: s(30), borderRadius: s(15), marginLeft: -s(8), borderWidth: s(0.5), borderColor: colors.white, backgroundColor: '#FF6E92', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarOverflow: { backgroundColor: `${colors.text}14` },
  avatarOverflowText: { ...font('medium', 11), lineHeight: s(13.1), includeFontPadding: false, color: `${colors.text}99` },
  dueCard: { marginTop: s(isSmallPhone ? 14 : 20), flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(15), borderRadius: s(16), borderWidth: 1 },
  dueIcon: { width: s(40), height: s(40), borderRadius: s(20), alignItems: 'center', justifyContent: 'center' },
  dueIconImage: { width: s(22), height: s(22), tintColor: colors.white },
  dueCopy: { flex: 1, gap: s(4) },
  dueTitle: { ...font('semibold', 14), lineHeight: s(16.7), includeFontPadding: false },
  dueDetail: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text },
  duePill: { borderRadius: s(12), paddingHorizontal: s(10), paddingVertical: s(5) },
  duePillText: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false },
  progressCard: { marginTop: s(isSmallPhone ? 12 : 15), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(12), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  progressLabel: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80`, textAlign: 'right' },
  progressTrack: { height: s(25), borderRadius: s(12.5), overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: s(12.5), borderWidth: 0.6, borderColor: colors.white },
  progressTick: { position: 'absolute', width: s(1.5), height: s(10.5), backgroundColor: colors.white },
  actionCard: { marginTop: s(isSmallPhone ? 12 : 15), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(20), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  actionCopy: { gap: s(4) },
  actionTitle: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.text },
  actionSubtitle: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80` },
  actionRow: { flexDirection: 'row', gap: s(10) },
  actionButtonWrap: { flex: 1 },
  actionButton: { height: s(62), borderRadius: s(16), borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: s(5), overflow: 'hidden' },
  actionInnerRing: { position: 'absolute', top: s(1.17), left: s(1.17), right: s(1.17), bottom: s(1.17), borderRadius: s(15), borderWidth: s(0.976), borderColor: colors.white },
  actionIcon: { width: s(18), height: s(18) },
  actionLabel: { ...font('medium', 14), lineHeight: s(16.7), includeFontPadding: false },

  calendarCard: { marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(15), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  monthTitle: { ...font('medium', 16), lineHeight: s(19.1), includeFontPadding: false, color: colors.text },
  monthButtons: { flexDirection: 'row', alignItems: 'center', gap: s(20) },
  mirrored: { transform: [{ scaleX: -1 }] },
  disabledArrow: { opacity: 0.3 },
  weekHeader: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...font('medium', 12), color: `${colors.text}80` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(8) },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center' },
  dayBox: { width: s(38), height: s(38), borderRadius: s(10), alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: `${colors.purple}59` },
  dayText: { ...font('regular', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.text },
  sheetFooter: { paddingHorizontal: s(25), paddingTop: s(30), paddingBottom: s(55) },
});
