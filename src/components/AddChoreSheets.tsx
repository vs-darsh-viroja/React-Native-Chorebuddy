import React, { useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { BottomSheet, SheetCheckbox, SheetHeader, SheetRadio, useSheet, sheetFooterPad } from '@/components/BottomSheet';
import { AvatarView } from '@/components/AvatarView';
import { AlarmGlyph, CheckmarkGlyph, ChevronGlyph, ChoreCalendarGlyph } from '@/components/glyphs';
import { CapsuleCTA, PressScale } from '@/components/motion';
import { ProfileFormCards } from '@/components/ProfileSheets';
import { TimeWheel } from '@/components/WheelPicker';
import { useChores } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { predefinedZoneSections, zoneIcon, zonePalettes } from '@/models/zones';
import { colors, font, s, screen } from '@/theme';
import { AppImage } from '@/components/AppImage';

const CORAL = '#FF5757';
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const timeLabel = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** iOS `CalendarSheet`: month grid with days before `minimumDate` disabled, 0.78-height sheet. */
export function CalendarSheet({ date, minimumDate, onPick, onClose }: { date: Date; minimumDate?: Date; onPick(next: Date): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height={screen.height * 0.78} bunny="leading">
      <CalendarBody date={date} minimumDate={minimumDate} onPick={onPick} />
    </BottomSheet>
  );
}

function CalendarBody({ date, minimumDate, onPick }: { date: Date; minimumDate?: Date; onPick(next: Date): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [selected, setSelected] = useState(date);
  const [visibleMonth, setVisibleMonth] = useState(() => { const base = new Date(date); base.setDate(1); base.setHours(0, 0, 0, 0); return base; });
  const minimum = minimumDate ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()) : null;

  const cells = useMemo(() => {
    const leading = visibleMonth.getDay();
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const result: Array<Date | null> = Array.from({ length: leading }, () => null);
    for (let offset = 0; offset < daysInMonth; offset += 1) result.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), offset + 1));
    return result;
  }, [visibleMonth]);

  const canGoBack = !minimum || new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1) > new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const shiftMonth = (delta: number) => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setVisibleMonth(previous => { const next = new Date(previous); next.setMonth(previous.getMonth() + delta); return next; }); };

  return (
    <>
      <SheetHeader title="Select a Date" />
      <View style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <View style={styles.monthTitleRow}>
            <Text style={styles.monthTitle}>{visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
            <ChevronGlyph width={s(5)} height={s(10)} color={colors.purple} />
          </View>
          <View style={styles.monthButtons}>
            <Pressable hitSlop={8} disabled={!canGoBack} onPress={() => shiftMonth(-1)} style={[styles.mirrored, !canGoBack && styles.dim]}>
              <ChevronGlyph width={s(6)} height={s(12)} color={`${colors.text}99`} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => shiftMonth(1)}>
              <ChevronGlyph width={s(6)} height={s(12)} color={`${colors.text}99`} />
            </Pressable>
          </View>
        </View>
        <View style={styles.weekHeader}>
          {WEEKDAYS.map((day, index) => <Text key={day} style={[styles.weekday, index === 0 && { color: CORAL }]}>{day}</Text>)}
        </View>
        <View style={styles.grid}>
          {cells.map((cell, index) => {
            if (!cell) return <View key={`blank${index}`} style={styles.dayCell} />;
            const past = minimum ? cell < minimum : false;
            const isSelected = dayKey(cell) === dayKey(selected);
            const sunday = cell.getDay() === 0;
            return (
              <Pressable key={dayKey(cell)} disabled={past} onPress={() => { void Haptics.selectionAsync(); setSelected(cell); onPick(cell); }} style={styles.dayCell}>
                <View style={[styles.dayBox, isSelected && styles.daySelected]}>
                  <Text style={[styles.dayText, sunday && { color: CORAL }, past && { color: `${colors.text}40` }]}>{cell.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.spacer} />
      <View style={[styles.footer, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <CapsuleCTA label="Done" onPress={() => close()} />
      </View>
    </>
  );
}

/** iOS `TimeSheet`: "Select Time (Optional)" over the wheel, 0.68-height sheet. */
export function TimeSheet({ time, onPick, onClose }: { time: Date; onPick(next: Date): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height={screen.height * 0.68} bunny="leading">
      <TimeBody time={time} onPick={onPick} />
    </BottomSheet>
  );
}

function TimeBody({ time, onPick }: { time: Date; onPick(next: Date): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [value, setValue] = useState(time);
  return (
    <>
      <SheetHeader title="Select Time (Optional)" />
      <View style={styles.wheelCard}>
        <TimeWheel date={value} onChange={next => { setValue(next); onPick(next); }} />
      </View>
      <View style={styles.spacer} />
      <View style={[styles.footer, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <CapsuleCTA label="Done" onPress={() => close()} />
      </View>
    </>
  );
}

/** iOS `MonthDaySheet`: 1–31 in rows of seven, 38pt tiles. */
export function MonthDaySheet({ day, onPick, onClose }: { day: number; onPick(next: number): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height="auto" bunny="leading">
      <MonthDayBody day={day} onPick={onPick} />
    </BottomSheet>
  );
}

function MonthDayBody({ day, onPick }: { day: number; onPick(next: number): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [selected, setSelected] = useState(day);
  return (
    <>
      <SheetHeader title="Select a Day of month" />
      <View style={styles.dayCard}>
        {Array.from({ length: 31 }, (_, index) => index + 1).map(value => {
          const on = selected === value;
          return (
            <Pressable key={value} onPress={() => { void Haptics.selectionAsync(); setSelected(value); onPick(value); }} style={styles.monthDayCell}>
              <View style={[styles.monthDayBox, on && styles.monthDayBoxOn]}>
                <Text style={[styles.monthDayText, on && { color: colors.white }]}>{value}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.footerTall, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <CapsuleCTA label="Done" onPress={() => close()} />
      </View>
    </>
  );
}

export const REMINDER_NOTIFY_OPTIONS = [
  { title: 'On Due Day', subtitle: 'On the same day at the set time' },
  { title: '1 Day Before', subtitle: '1 day before the due date' },
  { title: '2 Days Before', subtitle: '2 days before the due date' },
  { title: '3 Days Before', subtitle: '3 days before the due date' },
  { title: '1 Week Before', subtitle: '1 week before the due date' },
] as const;

/**
 * Bottom padding for an ABSOLUTELY positioned sheet footer, so both shapes end up
 * at the app-wide `Math.max(s(30), insets.bottom + s(16))` above the WINDOW edge.
 *
 * Yoga ignores the parent's padding once an inset is defined — in
 * `AbsoluteLayout.cpp`'s `positionAbsoluteChild`, the flex-end branch subtracts
 * border and margin and never padding — so `bottom: 0` measures from the parent's
 * BORDER box. That makes the two nestings behave differently:
 *
 *   - a footer whose parent IS the sheet card sits at the window edge, so it
 *     carries the whole offset itself (`liftedByCard: false`);
 *   - a footer nested inside a flow child of the card — the assign sheet's
 *     `flex: 1` pager — has ALREADY been lifted by the card's
 *     `paddingBottom: insets.bottom`, so repeating the full offset double-counts
 *     it. That is what pushed the assign sheet's Done button to ~114dp above the
 *     window instead of ~66dp on a 48dp navigation bar.
 */
const ctaPadBottom = (bottomInset: number, liftedByCard: boolean) =>
  (liftedByCard ? Math.max(s(30) - bottomInset, s(16)) : Math.max(s(30), bottomInset + s(16)));

/** iOS `ReminderSheet`: two selectable fields switching the card below between the time wheel and the notify options. */
export function ReminderSheet({ time, notify, notifyMode, onTime, onNotify, onClose }: { time: Date; notify: string; notifyMode: boolean; onTime(next: Date): void; onNotify(next: string): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height={screen.height * 0.78} bunny="leading">
      <ReminderBody time={time} notify={notify} notifyMode={notifyMode} onTime={onTime} onNotify={onNotify} />
    </BottomSheet>
  );
}

function ReminderBody({ time, notify, notifyMode, onTime, onNotify }: { time: Date; notify: string; notifyMode: boolean; onTime(next: Date): void; onNotify(next: string): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [mode, setMode] = useState(notifyMode);
  const [value, setValue] = useState(time);
  const [choice, setChoice] = useState(notify);

  const field = (label: string, glyph: React.ReactNode, text: string, active: boolean, onPress: () => void) => (
    <View style={styles.fieldColumn}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <PressScale onPress={onPress} style={[styles.field, active && styles.fieldActive]}>
        {glyph}
        <Text style={styles.fieldValue} numberOfLines={1}>{text}</Text>
      </PressScale>
    </View>
  );

  return (
    <>
      <SheetHeader title="Reminder" />
      <View style={styles.fieldsCard}>
        {field('Remind Me', <AlarmGlyph size={s(20)} color={`${colors.text}80`} />, timeLabel(value), !mode, () => setMode(false))}
        {field('When To Notify', <ChoreCalendarGlyph size={s(20)} color={`${colors.text}80`} />, choice, mode, () => setMode(true))}
      </View>

      {mode ? (
        /*
         * iOS sizes this list naturally inside a 0.78-height card and lets the
         * `Spacer` take the slack. Android has ~48dp less room (the card's
         * `paddingBottom: insets.bottom` for the navigation bar), so the five rows
         * plus the footer can exceed the card — and because the card is
         * `overflow: hidden` and bottom-anchored to the WINDOW, the overflow pushed
         * the Done button off the bottom of the screen.
         *
         * `flexShrink: 1` on the scroller keeps iOS's natural height whenever it
         * fits and hands the list a scroll only when it does not, so the footer is
         * always reachable regardless of screen height or the user's font scale.
         */
        <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsScrollContent}>
          <View style={styles.optionsCard}>
            {REMINDER_NOTIFY_OPTIONS.map((option, index) => (
              <React.Fragment key={option.title}>
                {index > 0 && <View style={styles.optionDivider} />}
                <Pressable onPress={() => { void Haptics.selectionAsync(); setChoice(option.title); onNotify(option.title); }} style={styles.optionRow}>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                  </View>
                  <SheetRadio on={choice === option.title} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.wheelCard}>
          <TimeWheel date={value} onChange={next => { setValue(next); onTime(next); }} />
        </View>
      )}

      <View style={styles.spacer} />
      <View style={[styles.footer, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <CapsuleCTA label="Done" onPress={() => close()} />
      </View>
    </>
  );
}

/** iOS `PhotosSheet`: two-column grid of square tiles with a trash button per photo. */
export function PhotosSheet({ photos, allowDelete = true, onDelete, onClose }: { photos: string[]; allowDelete?: boolean; onDelete(index: number): void; onClose(): void }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet onClose={onClose} bunny="leading">
      <>
        <SheetHeader title="Photos" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.photoGrid, { paddingBottom: sheetFooterPad(40, insets.bottom) }]}>
          {photos.map((photo, index) => (
            <View key={`${index}-${photo.slice(0, 12)}`} style={styles.photoCell}>
              <AppImage source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photoImage} />
              {allowDelete && (
                <PressScale onPress={() => onDelete(index)} style={styles.photoTrash}>
                  <Images.choreTrashIcon width={s(18)} height={s(18)} />
                </PressScale>
              )}
            </View>
          ))}
        </ScrollView>
      </>
    </BottomSheet>
  );
}

/**
 * iOS `ChangeZoneSheet`: the searchable zone list the Chore Detail edit mode
 * uses to move a chore into another zone. Selection is local until Done.
 */
export function ChangeZoneSheet({ initialZoneName, onSelect, onClose }: { initialZoneName: string; onSelect(zoneName: string): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose}>
      <ChangeZoneBody initialZoneName={initialZoneName} onSelect={onSelect} />
    </BottomSheet>
  );
}

function ChangeZoneBody({ initialZoneName, onSelect }: { initialZoneName: string; onSelect(zoneName: string): void }) {
  const { close } = useSheet();
  // The card's `paddingBottom: insets.bottom` does NOT lift an absolutely
  // positioned footer — `bottom: 0` lands on the card's border box, i.e. behind
  // the navigation bar. Absolute sheet footers carry their own inset.
  const insets = useSafeAreaInsets();
  const store = useChores();
  const [selected, setSelected] = useState(initialZoneName);
  const [search, setSearch] = useState('');

  const sections = useMemo(() => {
    const created = store.createdZones.length
      ? [{ title: 'My Zones', items: store.createdZones.map(zone => ({ name: zone.name, iconAsset: zone.iconAsset, palette: zone.colorIndex % zonePalettes.length })) }]
      : [];
    const hidden = new Set(store.hiddenZones);
    const visible = predefinedZoneSections
      .map(section => ({ ...section, items: section.items.filter(item => !hidden.has(item.name)) }))
      .filter(section => section.items.length);
    const query = search.trim().toLowerCase();
    return [...created, ...visible]
      .map(section => ({ ...section, items: section.items.filter(item => !query || item.name.toLowerCase().includes(query)) }))
      .filter(section => section.items.length);
  }, [store.createdZones, store.hiddenZones, search]);

  return (
    <>
      <SheetHeader title="Change Zone" />
      <View style={styles.zoneSearchWrap}>
        <View style={styles.searchBar}>
          <View style={styles.searchIcon}><Images.choreSearchIcon width={s(18)} height={s(18)} /></View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search Area" placeholderTextColor={`${colors.text}66`} style={styles.searchField} selectionColor={colors.purple} />
          {Boolean(search) && <Pressable hitSlop={8} onPress={() => setSearch('')}><Text style={styles.searchClear}>✕</Text></Pressable>}
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.zoneList}>
        {sections.map(section => (
          <View key={section.title} style={styles.zoneSection}>
            <Text style={styles.zoneSectionTitle}>{section.title}</Text>
            {section.items.map(item => {
              const palette = zonePalettes[item.palette] ?? zonePalettes[0];
              const on = selected === item.name;
              return (
                <Pressable key={item.name} onPress={() => { void Haptics.selectionAsync(); setSelected(item.name); }} style={[styles.zoneRow, on && styles.zoneRowOn]}>
                  <LinearGradient colors={[palette.top, palette.bottom]} style={[styles.zoneRowTile, { borderColor: palette.border }]}>
                    <AppImage source={zoneIcon(item.iconAsset)} resizeMode="contain" style={styles.zoneRowIcon} />
                  </LinearGradient>
                  <Text style={styles.zoneRowName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.spacer} />
                  <SheetCheckbox on={on} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View style={styles.assignFooter}>
        <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.assignFade} pointerEvents="none" />
        <View style={[styles.assignCta, { paddingBottom: ctaPadBottom(insets.bottom, false) }]}>
          <CapsuleCTA label="Done" onPress={() => { const picked = selected; close(() => onSelect(picked)); }} />
        </View>
      </View>
    </>
  );
}

/**
 * iOS `AssignMemberSheet`: a two-page sheet (member list ↔ create profile) that
 * slides horizontally, at 0.72 screen height.
 */
/**
 * The tick marks are a DRAFT: nothing reaches the caller until Done is pressed, so
 * dismissing the sheet with ✕, the backdrop or a drag discards the changes. iOS
 * writes its `@Binding var selected` on every tap, which means a dismissed sheet
 * still mutates the chore being edited — a deliberate, user-requested divergence.
 *
 * `onCreate` is NOT part of the draft: creating a household member is a real
 * mutation of its own and still commits immediately, as on iOS.
 */
export function AssignMemberSheet({ selected, onSave, onCreate, onClose }: { selected: string[]; onSave(ids: string[]): void; onCreate(name: string, avatar: string, photoData?: string): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height={screen.height * 0.72} bunny="leading">
      <AssignMemberBody selected={selected} onSave={onSave} onCreate={onCreate} />
    </BottomSheet>
  );
}

function AssignMemberBody({ selected, onSave, onCreate }: { selected: string[]; onSave(ids: string[]): void; onCreate(name: string, avatar: string, photoData?: string): void }) {
  const { close } = useSheet();
  /** Seeded once from the caller; every tick edits this copy only. */
  const [draft, setDraft] = useState<string[]>(selected);
  const insets = useSafeAreaInsets();
  const { members, myMemberId } = useHousehold();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('member1');
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);
  const slide = React.useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPage(next);
    Animated.timing(slide, { toValue: next, duration: 300, useNativeDriver: true }).start();
  };

  const query = search.trim().toLowerCase();
  const shown = query ? members.filter(member => member.name.toLowerCase().includes(query)) : members;
  const canSave = Boolean(name.trim());

  const save = () => {
    if (!canSave) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onCreate(name.trim(), avatar, photoData);
    setName(''); setAvatar('member1'); setPhotoData(undefined);
    goTo(0);
  };

  return (
    <Animated.View style={[styles.pager, { width: width * 2, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) }] }]}>
      <View style={{ width }}>
        <SheetHeader title="Assign Task to*" />
        <View style={styles.assignControls}>
          <View style={styles.searchBar}>
            <View style={styles.searchIcon}><Images.choreSearchIcon width={s(18)} height={s(18)} /></View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search Member" placeholderTextColor={`${colors.text}80`} style={styles.searchField} selectionColor={colors.purple} />
          </View>
          <View style={styles.createRow}>
            <PressScale onPress={() => goTo(1)} haptic="none" style={styles.createPill}>
              <View style={styles.createPlus}><AppImage source={Images.plusIcon} resizeMode="contain" style={styles.createPlusIcon} /></View>
              <Text style={styles.createLabel}>Create Profile</Text>
            </PressScale>
          </View>
        </View>

        {members.length === 0 ? (
          <View style={styles.assignEmpty}>
            <AppImage source={Images.bunnyPencilImg} resizeMode="contain" style={styles.assignEmptyArt} />
            <Text style={styles.assignEmptyTitle}>No Members Yet!</Text>
            <Text style={styles.assignEmptyBody}>Tap + to add members and start{'\n'}tracking chores together.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.assignList}>
            {shown.map(member => (
              <MemberRow key={member.id} member={member} isYou={member.id === myMemberId} picked={draft.includes(member.id)} onPress={() => { void Haptics.selectionAsync(); setDraft(current => (current.includes(member.id) ? current.filter(item => item !== member.id) : [...current, member.id])); }} />
            ))}
          </ScrollView>
        )}

        <View style={styles.assignFooter}>
          <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.assignFade} pointerEvents="none" />
          <View style={[styles.assignCta, { paddingBottom: ctaPadBottom(insets.bottom, true) }]}>
            <CapsuleCTA label="Done" onPress={() => { const picked = draft; close(() => onSave(picked)); }} />
          </View>
        </View>
      </View>

      <View style={{ width }}>
        <View style={styles.createHeader}>
          <PressScale onPress={() => goTo(0)} style={styles.backCircle}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.backIcon} />
          </PressScale>
          <Text style={styles.createTitle}>Create Profile</Text>
          <PressScale onPress={() => close()} style={styles.backCircle}><Text style={styles.closeX}>✕</Text></PressScale>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.createScroll}>
          <ProfileFormCards name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} photoData={photoData} setPhotoData={setPhotoData} nameError={null} onAddPhoto={() => undefined} />
        </ScrollView>
        <View style={[styles.createFooter, { paddingBottom: sheetFooterPad(30, insets.bottom) }]}>
          <CapsuleCTA label="Create" onPress={save} disabled={!canSave} dimWhenDisabled={0.5} />
        </View>
      </View>
    </Animated.View>
  );
}

function MemberRow({ member, isYou, picked, onPress }: { member: HouseholdMember; isYou: boolean; picked: boolean; onPress(): void }) {
  return (
    <PressScale onPress={onPress} haptic="none" style={styles.memberRow}>
      <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(44)} />
      <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
      {isYou && <View style={styles.youPill}><Text style={styles.youPillText}>You</Text></View>}
      <View style={styles.spacer} />
      <SheetCheckbox on={picked} />
    </PressScale>
  );
}

export { CheckmarkGlyph };

const styles = StyleSheet.create({
  spacer: { flex: 1 },
  zoneSearchWrap: { paddingHorizontal: s(15), paddingTop: s(18) },
  searchClear: { fontSize: s(13), color: `${colors.text}4D` },
  zoneList: { paddingHorizontal: s(15), paddingTop: s(18), paddingBottom: s(150), gap: s(20) },
  zoneSection: { gap: s(8) },
  zoneSectionTitle: { ...font('regular', 14), color: `${colors.text}80` },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(15), paddingHorizontal: s(15), height: s(74), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  zoneRowOn: { borderWidth: 1.5, borderColor: colors.purple },
  zoneRowTile: { width: s(48), height: s(48), borderRadius: s(12), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoneRowIcon: { width: s(30), height: s(30), tintColor: colors.white },
  zoneRowName: { ...font('medium', 15), color: colors.text, flexShrink: 1 },

  footer: { paddingHorizontal: s(25), paddingBottom: s(55) },
  footerTall: { paddingHorizontal: s(25), paddingTop: s(30), paddingBottom: s(55) },
  mirrored: { transform: [{ scaleX: -1 }] },
  dim: { opacity: 0.3 },

  calendarCard: { marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(15), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  monthTitle: { ...font('medium', 16), color: colors.text },
  monthButtons: { flexDirection: 'row', alignItems: 'center', gap: s(20) },
  weekHeader: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', ...font('medium', 12), color: `${colors.text}80` },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(8) },
  dayCell: { width: `${100 / 7}%`, alignItems: 'center' },
  dayBox: { width: s(38), height: s(38), borderRadius: s(10), alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: `${colors.purple}59` },
  dayText: { ...font('regular', 15), color: colors.text },

  wheelCard: { marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },

  dayCard: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(10), marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  monthDayCell: { width: `${100 / 7}%`, alignItems: 'center' },
  monthDayBox: { width: s(38), height: s(38), borderRadius: s(12), borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center' },
  monthDayBoxOn: { backgroundColor: colors.purple, borderColor: 'transparent' },
  monthDayText: { ...font('regular', 15), color: colors.text },

  fieldsCard: { flexDirection: 'row', gap: s(15), marginHorizontal: s(15), marginTop: s(20), padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  fieldColumn: { flex: 1, gap: s(6) },
  fieldLabel: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80` },
  field: { flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(14), borderRadius: s(12), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A` },
  fieldActive: { borderWidth: 1.5, borderColor: colors.purple },
  fieldGlyph: { width: s(20), height: s(20), opacity: 0.5 },
  fieldValue: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text, flexShrink: 1 },
  optionsScroll: { flexShrink: 1 },
  optionsScrollContent: { paddingBottom: s(4) },
  optionsCard: { marginHorizontal: s(15), marginTop: s(15), paddingHorizontal: s(15), paddingVertical: s(5), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: s(12) },
  optionCopy: { gap: s(4) },
  optionTitle: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.text },
  optionSubtitle: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80` },
  optionDivider: { height: 1, backgroundColor: `${colors.text}1A` },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12), paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(40) },
  photoCell: { width: '47%', aspectRatio: 1, borderRadius: s(16), overflow: 'hidden', borderWidth: 1, borderColor: `${colors.text}1A`, backgroundColor: `${colors.text}0D` },
  photoImage: { width: '100%', height: '100%' },
  photoTrash: { position: 'absolute', top: s(10), right: s(10), width: s(38), height: s(38), borderRadius: s(19), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(8), color: 'rgba(0,0,0,0.08)' }] },
  photoTrashIcon: { width: s(18), height: s(18) },

  pager: { flex: 1, flexDirection: 'row' },
  assignControls: { paddingHorizontal: s(15), paddingTop: s(20), gap: s(14) },
  searchBar: { height: s(42), borderRadius: s(21), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), gap: s(10) },
  searchIcon: { opacity: 0.3, width: s(22), alignItems: 'center' },
  searchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  createRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  createPill: { flexDirection: 'row', alignItems: 'center', gap: s(8), height: s(36), paddingLeft: s(6), paddingRight: s(14), borderRadius: s(18), backgroundColor: `${colors.purple}1A`, borderWidth: 1, borderColor: `${colors.purple}26` },
  createPlus: { width: s(24), height: s(24), borderRadius: s(12), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  createPlusIcon: { width: s(10), height: s(10), tintColor: colors.white },
  createLabel: { ...font('medium', 14), color: colors.text },
  assignList: { paddingHorizontal: s(15), paddingTop: s(14), paddingBottom: s(120), gap: s(10) },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: s(15), paddingHorizontal: s(15), height: s(69), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  memberName: { ...font('medium', 15), color: colors.text, flexShrink: 1 },
  youPill: { borderRadius: s(10), backgroundColor: `${colors.purple}1A`, paddingHorizontal: s(8), height: s(20), justifyContent: 'center' },
  youPillText: { ...font('medium', 11), color: colors.purple },
  assignEmpty: { alignItems: 'center', paddingTop: s(20), gap: s(10) },
  assignEmptyArt: { width: s(129.4), height: s(160) },
  assignEmptyTitle: { ...font('semibold', 18), color: colors.text },
  assignEmptyBody: { ...font('regular', 15), color: `${colors.text}99`, textAlign: 'center' },
  assignFooter: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  assignFade: { height: s(60) },
  assignCta: { backgroundColor: colors.background, paddingHorizontal: s(25), paddingTop: s(6), paddingBottom: s(30) },

  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(15), paddingTop: s(18) },
  createTitle: { ...font('medium', 20), color: colors.text },
  backCircle: { width: s(28), height: s(28), borderRadius: s(14), borderWidth: 1, borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },
  backIcon: { width: s(14), height: s(14) },
  closeX: { fontSize: s(11), color: `${colors.text}CC`, fontWeight: '600' },
  createScroll: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(20) },
  createFooter: { paddingHorizontal: s(25), paddingTop: s(6), paddingBottom: s(30) },
});
