import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { AssignMemberSheet, CalendarSheet, MonthDaySheet, PhotosSheet, REMINDER_NOTIFY_OPTIONS, ReminderSheet, TimeSheet, timeLabel } from '@/components/AddChoreSheets';
import { AvatarView, MAX_CHORE_PHOTOS, pickChorePhotos } from '@/components/AvatarView';
import { AlarmGlyph, ArrowGlyph, CheckmarkGlyph, ChevronGlyph, ChoreCalendarGlyph, PhotosGlyph, ReminderGlyph, SchedCustomGlyph, SchedDailyGlyph, SchedOneTimeGlyph, SubtasksGlyph } from '@/components/glyphs';
import { CapsuleCTA, PressScale } from '@/components/motion';
import { SheetRadio } from '@/components/BottomSheet';
import { InlineWheel } from '@/components/WheelPicker';
import { dueAccent, dueBarGradient, dueTrackFill, liveDueState } from '@/models/dueState';
import { predefinedZoneSections, zoneIcon, zonePalettes } from '@/models/zones';
import { useKeyboardAutoScroll } from '@/hooks/useKeyboardAutoScroll';
import { useChores } from '@/services/ChoreContext';
import { useHousehold } from '@/services/HouseholdContext';
import { replaceChorePhotos } from '@/services/ChorePhotos';
import { usePurchases } from '@/services/PurchaseManager';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';
import { Spinner } from '@/components/Spinner';

const CORAL = '#FF5757';
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** iOS `PresetChoreData`. */
const PRESETS = [
  { name: 'Clean Windows', frequency: 'Weekly' },
  { name: 'Clean Ceiling Fans', frequency: 'Weekly' },
  { name: 'Mop Floor', frequency: 'Everyday' },
  { name: 'Wash Curtains', frequency: 'Weekly' },
  { name: 'Deep Clean Furniture', frequency: 'Monthly' },
  { name: 'Organize Storage', frequency: 'Weekly' },
  { name: 'Take out the Trash', frequency: 'Weekly' },
  { name: 'Replace Towels', frequency: 'Everyday' },
  { name: 'Wash Towels', frequency: 'Everyday' },
  { name: 'Clean Coffee Maker', frequency: 'Everyday' },
  { name: 'Clean Dishwasher', frequency: 'Everyday' },
  { name: 'Wash the Dishes', frequency: 'Everyday' },
  { name: 'Vacuum Carpets', frequency: 'Weekly' },
  { name: 'Dust Shelves', frequency: 'Weekly' },
] as const;
const presetNext = (frequency: string) => (frequency === 'Everyday' ? 'Tomorrow' : frequency === 'Monthly' ? 'In 1 Month' : 'In 1 Week');
const presetFrequencyLabel = (frequency: string) => (frequency === 'Everyday' ? 'Every Day' : frequency === 'Monthly' ? 'Every Month' : 'Every Week');

/** iOS `ScheduleFrequencyData`. */
const FREQUENCIES = [
  { title: 'One Time', subtitle: 'Occurs once on a specific date', Icon: SchedOneTimeGlyph },
  { title: 'Daily', subtitle: 'Repeat every day', Icon: SchedDailyGlyph },
  { title: 'Specific Days', subtitle: 'Repeats on selected days of the week', Icon: ChoreCalendarGlyph },
  { title: 'Monthly', subtitle: 'Repeats every month on specific day', Icon: ChoreCalendarGlyph },
  { title: 'Custom', subtitle: 'Repeats at a custom interval', Icon: SchedCustomGlyph },
] as const;

const dateLabel = (date: Date) => `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })}, ${date.getFullYear()}`;
const shortDateLabel = (date: Date) => `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
const ordinal = (value: number) => {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;
  return `${value}${['th', 'st', 'nd', 'rd'][value % 10] ?? 'th'}`;
};

type Field = { id: string; text: string };
let fieldSeed = 0;
const newField = (): Field => ({ id: `f${(fieldSeed += 1)}`, text: '' });

/** iOS `AddChoreView`: the four-step New Chore wizard (Zone → Chore → Schedule → More). */
export function AddChoreView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'AddChore'>) {
  // iOS wraps only the More step in a `ScrollViewReader` (AddChoreView.swift:1799),
  // so the custom-name field on step 2 deliberately does not auto-scroll.
  const autoScroll = useKeyboardAutoScroll();
  const insets = useSafeAreaInsets();
  // iOS puts this CTA 20 above the window bottom; Android lifts it clear of the
  // navigation bar, and the bottom fade grows by the same amount (see BottomFade).
  const ctaBottom = Math.max(s(20), insets.bottom + s(12));
  const store = useChores();
  const household = useHousehold();
  const { hasPro } = usePurchases();
  const { width } = useWindowDimensions();

  const lockedZone = route.params?.zone;
  const minStep = lockedZone ? 1 : 0;
  const [step, setStep] = useState(minStep);
  const slide = useRef(new Animated.Value(minStep)).current;

  const [zoneSearch, setZoneSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState<string | null>(lockedZone ?? null);
  const [mode, setMode] = useState<'options' | 'presets' | 'custom'>('options');
  const [presetSearch, setPresetSearch] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');

  const [frequency, setFrequency] = useState(0);
  const [scheduleDate, setScheduleDate] = useState(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; });
  const [scheduleTime, setScheduleTime] = useState(() => { const date = new Date(); date.setHours(9, 0, 0, 0); return date; });
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 2, 4]);
  const [monthDay, setMonthDay] = useState(new Date().getDate());
  const [customInterval, setCustomInterval] = useState(6);
  const [customUnit, setCustomUnit] = useState<'Days' | 'Weeks' | 'Months'>('Days');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [attemptedAssign, setAttemptedAssign] = useState(false);

  const [reminderOn, setReminderOn] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => { const date = new Date(); date.setHours(9, 0, 0, 0); return date; });
  const [reminderNotify, setReminderNotify] = useState<string>(REMINDER_NOTIFY_OPTIONS[0].title);
  const [reminderNotifyMode, setReminderNotifyMode] = useState(false);
  const [subtasksOn, setSubtasksOn] = useState(false);
  const [subtasks, setSubtasks] = useState<Field[]>([newField()]);
  const [photosOn, setPhotosOn] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState<Field[]>([newField()]);

  const [sheet, setSheet] = useState<'date' | 'time' | 'monthDay' | 'reminder' | 'member' | 'photos' | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const validationToken = useRef(0);
  const [saving, setSaving] = useState(false);

  const steps = lockedZone ? [{ label: 'Chore', index: 1 }, { label: 'Schedule', index: 2 }, { label: 'More', index: 3 }] : [{ label: 'Zone', index: 0 }, { label: 'Chore', index: 1 }, { label: 'Schedule', index: 2 }, { label: 'More', index: 3 }];

  useEffect(() => {
    Animated.timing(slide, { toValue: step, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
  }, [step, slide]);

  const showValidation = (message: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    validationToken.current += 1;
    const token = validationToken.current;
    setValidation(message);
    if (step === 2) setAttemptedAssign(true);
    setTimeout(() => { if (token === validationToken.current) setValidation(null); }, 4000);
  };
  const clearValidation = () => { validationToken.current += 1; setValidation(null); };

  /** iOS zone catalog for Add Chore. Android intentionally reuses the Zone tab's catalog — see the note in CLAUDE.md. */
  const zoneSections = useMemo(() => {
    const created = store.createdZones.length ? [{ title: 'My Zones', items: store.createdZones.map(zone => ({ name: zone.name, iconAsset: zone.iconAsset, palette: zone.colorIndex % zonePalettes.length })) }] : [];
    const hidden = new Set(store.hiddenZones);
    const visible = predefinedZoneSections.map(section => ({ ...section, items: section.items.filter(item => !hidden.has(item.name)) })).filter(section => section.items.length);
    const query = zoneSearch.trim().toLowerCase();
    return [...created, ...visible]
      .map(section => ({ ...section, items: section.items.filter(item => !query || item.name.toLowerCase().includes(query)) }))
      .filter(section => section.items.length);
  }, [store.createdZones, store.hiddenZones, zoneSearch]);

  const allZones = useMemo(() => [
    ...store.createdZones.map(zone => ({ name: zone.name, iconAsset: zone.iconAsset, palette: zone.colorIndex % zonePalettes.length })),
    ...predefinedZoneSections.flatMap(section => section.items),
  ], [store.createdZones]);
  const heroZone = allZones.find(zone => zone.name === selectedZone) ?? allZones[0] ?? { name: 'Living room', iconAsset: 'zone1Icon', palette: 0 };

  const choreName = customName.trim() || selectedPreset || 'New Chore';
  const filteredPresets = presetSearch.trim() ? PRESETS.filter(preset => preset.name.toLowerCase().includes(presetSearch.trim().toLowerCase())) : PRESETS;

  /** iOS `effectiveDueDate`. */
  const effectiveDueDate = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (frequency === 0) { const date = new Date(scheduleDate); date.setHours(0, 0, 0, 0); return date; }
    if (frequency === 2) {
      if (!selectedDays.length) return today;
      const targets = new Set(selectedDays.map(day => (day === 6 ? 0 : day + 1)));
      for (let offset = 0; offset < 7; offset += 1) {
        const candidate = new Date(today); candidate.setDate(today.getDate() + offset);
        if (targets.has(candidate.getDay())) return candidate;
      }
      return today;
    }
    if (frequency === 3) {
      const inMonth = (base: Date) => { const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(); return new Date(base.getFullYear(), base.getMonth(), Math.min(monthDay, lastDay)); };
      const thisMonth = inMonth(today);
      if (thisMonth >= today) return thisMonth;
      const next = new Date(today); next.setMonth(today.getMonth() + 1);
      return inMonth(next);
    }
    return today;
  };

  /** iOS `applyPresetSchedule`: a preset seeds the frequency (and a weekday for Weekly). */
  const applyPresetSchedule = () => {
    const preset = PRESETS.find(item => item.name === selectedPreset);
    if (!preset) return;
    if (preset.frequency === 'Everyday') setFrequency(1);
    else if (preset.frequency === 'Monthly') setFrequency(3);
    else {
      setFrequency(2);
      if (!selectedDays.length) setSelectedDays([(new Date().getDay() + 6) % 7]);
    }
  };

  const goBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1 && mode !== 'options') setMode('options');
    else if (step > minStep) setStep(step - 1);
    else navigation.goBack();
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const due = effectiveDueDate();
    const live = liveDueState(dateLabel(due));
    const frequencyValue = frequency === 4 ? `Every ${customInterval} ${customUnit}` : FREQUENCIES[frequency].title;
    const choreId = await store.saveChore({
      name: choreName,
      zoneName: selectedZone ?? heroZone.name,
      dueDate: dateLabel(due),
      dueShort: shortDateLabel(due),
      dueLabel: live.label,
      dueTime: timeLabel(scheduleTime),
      frequency: frequencyValue,
      selectedDays: frequency === 2 ? [...selectedDays].sort((a, b) => a - b) : [],
      assignedMemberIds: assigned,
      reminderOn,
      reminderTime: timeLabel(reminderTime),
      reminderNotify,
      subtasksOn,
      subtasks: subtasks.map(field => field.text.trim()).filter(Boolean),
      notes: notes.map(field => field.text.trim()).filter(Boolean).join('\n'),
      photoCount: photosOn ? photos.length : 0,
    });
    if (!choreId) {
      setSaving(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Couldn't Save Chore", 'Something went wrong while saving. Check your connection and try again.');
      return;
    }
    if (photosOn && photos.length && household.household) await replaceChorePhotos(household.household.id, choreId, photos).catch(() => undefined);
    navigation.goBack();
  };

  /**
   * iOS opens `PhotosPicker(maxSelectionCount: 10)`, so one trip through the
   * picker can add up to ten photos at once.
   *
   * Deliberate divergence: iOS's `loadPhotos()` here REPLACES the list
   * (`photoImages = images`), which is only safe because SwiftUI's PhotosPicker
   * keeps its `selection` binding — reopening it shows the previous picks still
   * ticked. Android's system picker starts empty every time, so replacing would
   * silently drop everything added in an earlier trip. Appending under the same
   * 10 cap is what iOS's Edit screen does too.
   */
  const pickPhotos = async () => {
    const encoded = await pickChorePhotos(MAX_CHORE_PHOTOS - photos.length);
    if (encoded.length) setPhotos(current => [...current, ...encoded].slice(0, MAX_CHORE_PHOTOS));
  };

  const continueBar = () => {
    if (step === 0) return { enabled: Boolean(selectedZone), message: 'Please select an area for this chore before continuing.', action: () => setStep(1) };
    if (step === 1 && mode === 'presets') return { enabled: Boolean(selectedPreset), message: 'Please select at least one chore before continuing.', action: () => { applyPresetSchedule(); setMode('options'); setStep(2); } };
    if (step === 1 && mode === 'custom') return { enabled: Boolean(customName.trim()), message: 'Please enter a chore name before continuing.', action: () => { setMode('options'); setStep(2); } };
    if (step === 2) return { enabled: assigned.length > 0, message: 'Please assign this chore to a member before continuing.', action: () => setStep(3) };
    return null;
  };
  const bar = continueBar();
  const assignInvalid = attemptedAssign && assigned.length === 0;
  const live = liveDueState(dateLabel(effectiveDueDate()));

  return (
    <View style={styles.root}>

      <View style={styles.headerWrap}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Chore</Text>
          <View style={styles.headerButtons}>
            <PressScale onPress={goBack} style={styles.backCircle}>
              <ArrowGlyph size={s(15)} color={colors.text} />
            </PressScale>
            <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stepper}>
          <View style={styles.stepRow}>
            <LinearGradient colors={[`${colors.purple}CC`, `${colors.purple}33`, `${colors.purple}33`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.connector} />
            {steps.map((item, position) => (
              <React.Fragment key={item.label}>
                <View style={styles.stepCircleWrap}>
                  <AppImage source={step >= item.index ? Images.circleBg2 : Images.circleBg1} resizeMode="stretch" style={styles.stepCircle} />
                  <Text style={[styles.stepNumber, step >= item.index && { color: colors.white }]}>{position + 1}</Text>
                </View>
                {position < steps.length - 1 && <View style={styles.spacer} />}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.stepLabels}>
            {steps.map((item, position) => (
              <React.Fragment key={item.label}>
                <Text style={[styles.stepLabel, step >= item.index ? styles.stepLabelOn : null]}>{item.label}</Text>
                {position < steps.length - 1 && <View style={styles.spacer} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>

      <Animated.View style={[styles.pager, { width: width * 4, transform: [{ translateX: slide.interpolate({ inputRange: [0, 3], outputRange: [0, -width * 3] }) }] }]}>
        {/* Step 1 — Zone */}
        <View style={[styles.page, { width }]}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>Where does this chore live?</Text>
            <Text style={styles.pageSubtitle}>Pick a zone to get started</Text>
          </View>
          <SearchField placeholder="Search Area" value={zoneSearch} onChange={setZoneSearch} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageScroll}>
            {zoneSections.length === 0 ? (
              <View style={styles.searchEmpty}>
                <View style={styles.searchEmptyIcon}><Images.choreSearchIcon width={s(40)} height={s(40)} /></View>
                <Text style={styles.searchEmptyTitle}>No zones found</Text>
                <Text style={styles.searchEmptyBody}>Try a different search term.</Text>
              </View>
            ) : zoneSections.map(section => (
              <View key={section.title} style={styles.zoneSection}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.zoneRows}>
                  {section.items.map(item => {
                    const on = selectedZone === item.name;
                    const palette = zonePalettes[item.palette % zonePalettes.length];
                    return (
                      <Pressable key={item.name} onPress={() => { void Haptics.selectionAsync(); setSelectedZone(on ? null : item.name); clearValidation(); }} style={styles.zoneRow}>
                        <LinearGradient colors={[palette.top, palette.bottom]} style={[styles.zoneTile, { borderColor: palette.border }]}>
                          <AppImage source={zoneIcon(item.iconAsset)} resizeMode="contain" style={styles.zoneTileIcon} />
                        </LinearGradient>
                        <Text style={styles.zoneName}>{item.name}</Text>
                        <View style={styles.spacer} />
                        <ChoreCheckbox on={on} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Step 2 — Chore */}
        <View style={[styles.page, { width }]}>
          {mode === 'options' && (
            <>
              <View style={styles.hero}>
                <LinearGradient colors={[zonePalettes[heroZone.palette % zonePalettes.length].top, zonePalettes[heroZone.palette % zonePalettes.length].bottom]} style={[styles.heroTile, { borderColor: zonePalettes[heroZone.palette % zonePalettes.length].border }]}>
                  <AppImage source={zoneIcon(heroZone.iconAsset)} resizeMode="contain" style={styles.heroTileIcon} />
                </LinearGradient>
                <Text style={styles.pageTitle}>Add to {selectedZone ?? heroZone.name}</Text>
                <Text style={styles.pageSubtitle}>How would you like to add this chore?</Text>
              </View>
              <View style={styles.optionCards}>
                <OptionCard title="Add Preset Chore" subtitle="Pick from ready-made chores" icon={Images.addPresetIcon} onPress={() => { setCustomName(''); setMode('presets'); }} />
                <OptionCard title="Create Custom Chore" subtitle="Build your own from scratch" icon={Images.customChoreIcon} onPress={() => { setSelectedPreset(null); setMode('custom'); }} />
              </View>
            </>
          )}

          {mode === 'presets' && (
            <>
              <View style={styles.titleBlock}>
                <Text style={styles.pageTitle}>Preset chores</Text>
                <Text style={styles.pageSubtitle}>Tap a chore to add it to {heroZone.name}.</Text>
              </View>
              <SearchField placeholder="Search Chore" value={presetSearch} onChange={setPresetSearch} />
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
                {filteredPresets.map(preset => {
                  const on = selectedPreset === preset.name;
                  return (
                    <Pressable key={preset.name} onPress={() => { void Haptics.selectionAsync(); setSelectedPreset(on ? null : preset.name); clearValidation(); }} style={styles.presetCard}>
                      <View style={styles.presetTop}>
                        <View style={styles.presetCopy}>
                          <Text style={[styles.presetName, on && styles.presetNameOn]}>{preset.name}</Text>
                          {!on && <Text style={styles.presetFrequency}>{preset.frequency}</Text>}
                        </View>
                        <ChoreCheckbox on={on} />
                      </View>
                      {on && (
                        <View style={styles.presetDetail}>
                          <PresetRow title="Next Cleaning" value={presetNext(preset.frequency)} />
                          <View style={styles.presetDivider} />
                          <PresetRow title="Frequency" value={presetFrequencyLabel(preset.frequency)} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          {mode === 'custom' && (
            <>
              <View style={styles.titleBlock}>
                <Text style={styles.pageTitle}>Create a chore</Text>
                <Text style={styles.pageSubtitle}>Give it a name.</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Chore Name*</Text>
                <View style={styles.fieldBox}>
                  <TextInput
                    autoFocus
                    value={customName}
                    onChangeText={value => { setCustomName(value); clearValidation(); }}
                    placeholder="Enter chore name"
                    placeholderTextColor={`${colors.text}66`}
                    style={styles.fieldInput}
                    selectionColor={colors.purple}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Step 3 — Schedule */}
        <View style={[styles.page, { width }]}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{choreName}</Text>
            <Text style={styles.pageSubtitle}>{heroZone.name}</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageScroll}>
            <View style={styles.card}>
              <View style={styles.whenBlock}>
                <Text style={styles.cardLabel}>When To Do*</Text>
                <Text style={styles.cardHint}>When should this chore happen</Text>
                <View style={styles.freqCard}>
                  {FREQUENCIES.map((option, index) => (
                    <React.Fragment key={option.title}>
                      {index > 0 && <View style={styles.freqDivider} />}
                      <Pressable onPress={() => { void Haptics.selectionAsync(); setFrequency(index); }} style={[styles.freqRow, frequency === index && styles.freqRowOn]}>
                        <View style={styles.freqIcon}>
                          <option.Icon size={s(19)} color={colors.purple} />
                        </View>
                        <View style={styles.freqCopy}>
                          <Text style={styles.freqTitle}>{option.title}</Text>
                          <Text style={styles.freqSubtitle}>{option.subtitle}</Text>
                        </View>
                        <SheetRadio on={frequency === index} />
                      </Pressable>
                    </React.Fragment>
                  ))}
                </View>
              </View>

              <View style={styles.occursBlock}>
                <Text style={styles.cardLabel}>{frequency <= 1 ? 'Occurs On' : 'Repeat'}</Text>
                {frequency === 0 && (
                  <View style={styles.fieldRow}>
                    <ScheduleField label="Select Date" glyph={<ChoreCalendarGlyph size={s(20)} color={colors.purple} />} value={dateLabel(scheduleDate)} onPress={() => setSheet('date')} />
                    <ScheduleField label="Select Time (Optional)" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(scheduleTime)} onPress={() => setSheet('time')} />
                  </View>
                )}
                {frequency === 1 && (
                  <ScheduleField label="Select Time (Optional)" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(scheduleTime)} onPress={() => setSheet('time')} />
                )}
                {frequency === 2 && (
                  <View style={styles.daysBlock}>
                    <Text style={styles.cardHint}>Choose Days</Text>
                    <View style={styles.chipsCard}>
                      {WEEKDAY_SHORT.map((label, index) => {
                        const on = selectedDays.includes(index);
                        return (
                          <View key={label} style={styles.chipColumn}>
                            <Text style={[styles.chipLabel, on && { color: colors.purple }]}>{label}</Text>
                            <Pressable onPress={() => { void Haptics.selectionAsync(); setSelectedDays(on ? selectedDays.filter(day => day !== index) : [...selectedDays, index]); }} style={[styles.chipCircle, on && styles.chipCircleOn]}>
                              {on && <CheckmarkGlyph width={s(10)} height={s(7)} color={colors.white} strokeWidth={1.8} />}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                    {selectedDays.length > 0 && (
                      <Text style={styles.daysCaption}>Selected: {[...selectedDays].sort((a, b) => a - b).map(day => WEEKDAY_SHORT[day]).join(', ')}</Text>
                    )}
                    <ScheduleField label="Select Time (Optional)" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(scheduleTime)} onPress={() => setSheet('time')} />
                  </View>
                )}
                {frequency === 3 && (
                  <View style={styles.fieldRow}>
                    <ScheduleField label="Day of month" glyph={<ChoreCalendarGlyph size={s(20)} color={colors.purple} />} value={ordinal(monthDay)} onPress={() => setSheet('monthDay')} />
                    <ScheduleField label="Select Time (Optional)" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(scheduleTime)} onPress={() => setSheet('time')} />
                  </View>
                )}
                {frequency === 4 && (
                  <View style={styles.daysBlock}>
                    <Text style={styles.cardHint}>Every</Text>
                    <View style={styles.customRow}>
                      <View style={styles.customWheel}>
                        <InlineWheel values={Array.from({ length: 30 }, (_, index) => String(index + 1))} index={customInterval - 1} onChange={next => setCustomInterval(next + 1)} width={s(120)} />
                      </View>
                      <View style={styles.customWheel}>
                        <InlineWheel values={['Days', 'Weeks', 'Months']} index={['Days', 'Weeks', 'Months'].indexOf(customUnit)} onChange={next => setCustomUnit((['Days', 'Weeks', 'Months'] as const)[next])} width={s(120)} />
                      </View>
                    </View>
                    <ScheduleField label="Select Time (Optional)" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(scheduleTime)} onPress={() => setSheet('time')} />
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.card, assignInvalid && styles.cardInvalid]}>
              <PressScale onPress={() => setSheet('member')} style={styles.assignHeader}>
                <Text style={[styles.cardLabel, assignInvalid && { color: CORAL }]}>Assign Task to*</Text>
                <View style={styles.spacer} />
                <View style={styles.addMemberPill}>
                  <Text style={styles.addMemberLabel}>Add member</Text>
                  <View style={styles.addMemberDivider} />
                  <View style={styles.addMemberChevron}><ChevronGlyph width={s(4.5)} height={s(9)} color={colors.text} /></View>
                </View>
              </PressScale>
              {assigned.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assignedRow}>
                  {assigned.map(id => {
                    const member = household.members.find(item => item.id === id);
                    if (!member) return null;
                    return (
                      <View key={id} style={styles.assignedCell}>
                        <View style={styles.assignedAvatar}>
                          <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(46)} />
                          <View style={styles.assignedRemoveSlot}>
                            <PressScale onPress={() => setAssigned(assigned.filter(item => item !== id))} style={styles.assignedRemove}>
                              <Text style={styles.assignedRemoveText}>✕</Text>
                            </PressScale>
                          </View>
                        </View>
                        <Text style={styles.assignedName} numberOfLines={1}>{member.name}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
              {assignInvalid && <Text style={styles.assignError}>Assign at least one member to continue</Text>}
            </View>
          </ScrollView>
        </View>

        {/* Step 4 — More */}
        <View style={[styles.page, { width }]}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{choreName}</Text>
            <Text style={styles.pageSubtitle}>{heroZone.name}</Text>
          </View>
          <ScrollView
            ref={autoScroll.ref}
            onScroll={autoScroll.onScroll}
            scrollEventThrottle={autoScroll.scrollEventThrottle}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.pageScroll, { paddingBottom: s(140) + autoScroll.padBottom }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <View style={styles.stateRow}>
                <Text style={styles.cardLabel}>Current State</Text>
                <View style={styles.spacer} />
                <View style={styles.stateBlock}>
                  <Text style={styles.stateLabel}>{live.label}</Text>
                  <View style={[styles.stateTrack, { backgroundColor: dueTrackFill[live.state] }]}>
                    <LinearGradient colors={dueBarGradient[live.state]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.stateFill, { width: s(142) * live.fraction }]} />
                    <View style={[styles.stateTick, { left: s(91) }]} />
                    <View style={[styles.stateTick, { left: s(114) }]} />
                  </View>
                </View>
              </View>
            </View>

            <ToggleCard Icon={ReminderGlyph} title="Reminder" value={reminderOn} onChange={setReminderOn} locked={!hasPro} onLocked={() => navigation.push('Paywall')}>
              <View style={styles.fieldRow}>
                <ScheduleField label="Remind Me" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(reminderTime)} onPress={() => { setReminderNotifyMode(false); setSheet('reminder'); }} />
                <ScheduleField label="When To Notify" glyph={<ChoreCalendarGlyph size={s(20)} color={`${colors.text}80`} />} value={reminderNotify} onPress={() => { setReminderNotifyMode(true); setSheet('reminder'); }} />
              </View>
            </ToggleCard>

            <ToggleCard Icon={SubtasksGlyph} title="Sub-tasks" value={subtasksOn} onChange={setSubtasksOn} locked={!hasPro} onLocked={() => navigation.push('Paywall')}>
              <View style={styles.listHeader}>
                <Text style={styles.cardLabel}>Task Name</Text>
                <View style={styles.spacer} />
                <PlusButton enabled={subtasks.every(field => field.text.trim())} onPress={() => setSubtasks([...subtasks, newField()])} />
              </View>
              {subtasks.map(field => (
                <View key={field.id} style={styles.subtaskRow}>
                  <TextInput
                    onFocus={autoScroll.onFocus}
                    value={field.text}
                    onChangeText={text => setSubtasks(subtasks.map(item => (item.id === field.id ? { ...item, text } : item)))}
                    placeholder="Enter sub task"
                    placeholderTextColor={`${colors.text}66`}
                    style={styles.subtaskInput}
                    selectionColor={colors.purple}
                  />
                  <PressScale onPress={() => setSubtasks(subtasks.filter(item => item.id !== field.id))} style={styles.trashButton}>
                    <Images.choreTrashIcon width={s(20)} height={s(20)} />
                  </PressScale>
                </View>
              ))}
            </ToggleCard>

            <ToggleCard Icon={PhotosGlyph} title="Add Photos" value={photosOn} onChange={setPhotosOn} locked={!hasPro} onLocked={() => navigation.push('Paywall')}>
              {photos.length === 0 ? (
                <PressScale onPress={() => { void pickPhotos(); }} style={styles.uploadBox}>
                  <View style={styles.uploadIcon}><AppImage source={Images.plusIcon} resizeMode="contain" style={styles.uploadPlus} /></View>
                  <Text style={styles.uploadLabel}>Upload Images</Text>
                </PressScale>
              ) : (
                <>
                  <View style={styles.listHeader}>
                    <Text style={styles.cardLabel}>{String(photos.length).padStart(2, '0')} Photos</Text>
                    <View style={styles.spacer} />
                    <Pressable onPress={() => setSheet('photos')}><Text style={styles.viewAll}>View All</Text></Pressable>
                  </View>
                  <View style={styles.thumbRow}>
                    {photos.slice(0, 3).map((photo, index) => (
                      <View key={`${index}-${photo.slice(0, 10)}`} style={styles.thumb}>
                        <AppImage source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.thumbImage} />
                        <PressScale onPress={() => setPhotos(photos.filter((_, item) => item !== index))} style={styles.thumbTrash}>
                          <Images.choreTrashIcon width={s(12)} height={s(12)} />
                        </PressScale>
                      </View>
                    ))}
                    {/*
                      iOS `addThumbLabel` puts the bare `plusIcon` on `appBackground`
                      — but that asset is pure WHITE (it is drawn for purple buttons),
                      and white on #FBF7FD differs by (4,8,2)/255, i.e. the tile reads
                      as an empty dashed box. Deliberate deviation, user-requested:
                      the plus sits on the same 12% purple square iOS uses in
                      `uploadBoxLabel`, so the affordance is actually visible.
                    */}
                    {photos.length < 3 && (
                      <PressScale onPress={() => { void pickPhotos(); }} style={styles.addThumb}>
                        <View style={styles.uploadIcon}><AppImage source={Images.plusIcon} resizeMode="contain" style={styles.uploadPlus} /></View>
                      </PressScale>
                    )}
                  </View>
                </>
              )}
            </ToggleCard>

            <View style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={styles.cardLabel}>Add Notes</Text>
                <View style={styles.spacer} />
                <PlusButton enabled={notes.every(field => field.text.trim())} onPress={() => setNotes([...notes, newField()])} />
              </View>
              {notes.map(field => (
                <View key={field.id} style={styles.noteRow}>
                  <TextInput
                    onFocus={autoScroll.onFocus}
                    value={field.text}
                    onChangeText={text => setNotes(notes.map(item => (item.id === field.id ? { ...item, text } : item)))}
                    placeholder="Add notes"
                    placeholderTextColor={`${colors.text}4D`}
                    style={styles.noteInput}
                    selectionColor={colors.purple}
                    multiline
                  />
                  <PressScale onPress={() => setNotes(notes.filter(item => item.id !== field.id))} style={styles.noteTrash}>
                    <Images.choreTrashIcon width={s(20)} height={s(20)} />
                  </PressScale>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Animated.View>

      <LinearGradient colors={[`${colors.background}00`, colors.background]} style={[styles.bottomFade, { height: s(184) + Math.max(0, ctaBottom - s(20)) }]} pointerEvents="none" />
      <View style={[styles.bottomBar, { bottom: ctaBottom }]}>
        {step === 3 ? (
          <PressScale haptic="none" disabled={saving} onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void save(); }} style={[styles.saveCta, saving && { opacity: 0.7 }]}>
            <View style={styles.saveInner}>
              {saving ? <Spinner size={s(20)} color={colors.white} /> : (
                <>
                  <CheckmarkGlyph width={s(16)} height={s(12)} color={colors.white} strokeWidth={2.4} />
                  <Text style={styles.saveLabel}>Save Chore</Text>
                </>
              )}
            </View>
          </PressScale>
        ) : bar ? (
          <PressScale
            haptic="none"
            onPress={() => {
              if (!bar.enabled) { showValidation(bar.message); return; }
              clearValidation();
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              bar.action();
            }}
            style={styles.continueCta}
          >
            <View style={styles.continueInner}>
              <Text style={styles.continueLabel}>Continue</Text>
              <View style={styles.continueArrow}><ArrowGlyph size={s(16)} color={colors.white} /></View>
            </View>
          </PressScale>
        ) : null}
      </View>

      {validation && (
        <Pressable onPress={clearValidation} style={[styles.toastWrap, { bottom: Math.max(s(100), insets.bottom + s(92)) }]}>
          <View style={styles.toast}>
            <Text style={styles.toastMark}>!</Text>
            <Text style={styles.toastText}>{validation}</Text>
          </View>
        </Pressable>
      )}

      {sheet === 'date' && <CalendarSheet date={scheduleDate} minimumDate={new Date()} onPick={setScheduleDate} onClose={() => setSheet(null)} />}
      {sheet === 'time' && <TimeSheet time={scheduleTime} onPick={setScheduleTime} onClose={() => setSheet(null)} />}
      {sheet === 'monthDay' && <MonthDaySheet day={monthDay} onPick={setMonthDay} onClose={() => setSheet(null)} />}
      {sheet === 'reminder' && <ReminderSheet time={reminderTime} notify={reminderNotify} notifyMode={reminderNotifyMode} onTime={setReminderTime} onNotify={setReminderNotify} onClose={() => setSheet(null)} />}
      {sheet === 'photos' && <PhotosSheet photos={photos} onDelete={index => setPhotos(photos.filter((_, item) => item !== index))} onClose={() => setSheet(null)} />}
      {sheet === 'member' && (
        <AssignMemberSheet
          selected={assigned}
          onSave={ids => { setAssigned(ids); setAttemptedAssign(false); clearValidation(); }}
          onCreate={(name, avatar, photoData) => void household.addMember(name, avatar, photoData)}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  );
}

/** iOS `checkbox`: bordered box that swaps to the choreCheckbox art with a tick.
 *  Deliberately NOT animated: the user asked for instant feedback when tapping
 *  zone/chore rows, so this diverges from iOS's 0.35s selection spring. */
function ChoreCheckbox({ on }: { on: boolean }) {
  return (
    <View style={styles.checkbox}>
      {on ? (
        <>
          {/* Explicit dimensions are REQUIRED: on Fabric an Image sized only by
              absolute edges falls back to its intrinsic size (this PNG is 66x66),
              which blew the 22pt checkbox out past the card edge. */}
          <AppImage source={Images.choreCheckbox} resizeMode="stretch" style={styles.checkboxArt} />
          <CheckmarkGlyph width={s(11)} height={s(8)} color={colors.white} strokeWidth={2.2} />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.checkboxBorder]} />
      )}
    </View>
  );
}

function SearchField({ placeholder, value, onChange }: { placeholder: string; value: string; onChange(next: string): void }) {
  return (
    <View style={styles.search}>
      <View style={styles.searchIcon}><Images.choreSearchIcon width={s(18)} height={s(18)} /></View>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={`${colors.text}80`} style={styles.searchInput} selectionColor={colors.purple} />
      {value.length > 0 && (
        <Pressable hitSlop={8} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(''); }} style={styles.searchClear}>
          <Text style={styles.searchClearText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

function OptionCard({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: number; onPress(): void }) {
  return (
    <PressScale onPress={onPress} style={styles.optionCard}>
      <View style={styles.optionIcon}><AppImage source={icon} resizeMode="contain" style={styles.optionIconImage} /></View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.spacer} />
      <ChevronGlyph width={s(6.25)} height={s(12.5)} color={colors.text} />
    </PressScale>
  );
}

function PresetRow({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.presetRow}>
      <Text style={styles.presetRowTitle}>{title}</Text>
      <View style={styles.spacer} />
      <View style={styles.presetPill}><Text style={styles.presetPillText}>{value}</Text></View>
    </View>
  );
}

function ScheduleField({ label, glyph, value, onPress }: { label: string; glyph: React.ReactNode; value: string; onPress(): void }) {
  return (
    <View style={styles.scheduleField}>
      <Text style={styles.cardHint}>{label}</Text>
      <PressScale onPress={onPress} style={styles.scheduleButton}>
        {glyph}
        <Text style={styles.scheduleValue} numberOfLines={1}>{value}</Text>
      </PressScale>
    </View>
  );
}

/** iOS `toggleRow` card: the 24pt glyph, title, and either the toggle or the Pro lock badge. */
function ToggleCard({ Icon, title, value, onChange, locked, onLocked, children }: React.PropsWithChildren<{ Icon: React.ComponentType<{ size: number; color: string }>; title: string; value: boolean; onChange(next: boolean): void; locked: boolean; onLocked(): void }>) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.3) ** 2;
    Animated.spring(progress, { toValue: value ? 1 : 0, stiffness, damping: 2 * 0.7 * Math.sqrt(stiffness), mass: 1, useNativeDriver: false }).start();
  }, [value, progress]);
  return (
    <View style={styles.card}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleIcon}><Icon size={s(24)} color={colors.text} /></View>
        <Text style={styles.cardLabel}>{title}</Text>
        <View style={styles.spacer} />
        {locked ? (
          <PressScale onPress={onLocked}>
            <AppImage source={Images.proLockIcon} resizeMode="contain" style={styles.proLock} />
          </PressScale>
        ) : (
          <Pressable onPress={() => { void Haptics.selectionAsync(); onChange(!value); }}>
            <Animated.View style={[styles.track, { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [`${colors.text}33`, colors.purple] }) }]}>
              <Animated.View style={[styles.knob, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, s(17)] }) }] }]} />
            </Animated.View>
          </Pressable>
        )}
      </View>
      {value && !locked && children}
    </View>
  );
}

function PlusButton({ enabled, onPress }: { enabled: boolean; onPress(): void }) {
  return (
    <PressScale disabled={!enabled} onPress={onPress} style={[styles.plusButton, !enabled && { opacity: 0.4 }]}>
      <AppImage source={Images.plusIcon} resizeMode="contain" style={styles.plusIcon} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerWrap: { paddingHorizontal: s(15), paddingTop: s(59) },
  // iOS header height is its 40pt circle buttons; see ChoreDetailView's note.
  header: { height: s(40), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 22), color: colors.text },
  headerButtons: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backCircle: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(5), color: 'rgba(0,0,0,0.1)' }] },
  backIcon: { width: s(15), height: s(15) },
  cancel: { ...font('semibold', 14), color: colors.purple },
  stepper: { marginTop: s(20), gap: s(4) },
  stepRow: { height: s(20), flexDirection: 'row', alignItems: 'center' },
  connector: { position: 'absolute', left: s(21.5), right: s(21.5), height: s(3), borderRadius: s(1.5) },
  stepCircleWrap: { width: s(55), alignItems: 'center', justifyContent: 'center' },
  stepCircle: { position: 'absolute', width: s(20), height: s(20) },
  stepNumber: { ...font('semibold', 13), lineHeight: s(20), includeFontPadding: false, textAlign: 'center', color: `${colors.purple}80` },
  stepLabels: { flexDirection: 'row', alignItems: 'center' },
  stepLabel: { width: s(55), textAlign: 'center', ...font('semibold', 13), color: `${colors.purple}80` },
  stepLabelOn: { color: colors.purple },
  spacer: { flex: 1 },

  pager: { flex: 1, flexDirection: 'row' },
  page: { paddingTop: s(35), paddingHorizontal: s(15), gap: s(20) },
  titleBlock: { gap: s(5) },
  pageTitle: { ...font('semibold', 22), color: colors.text },
  pageSubtitle: { ...font('regular', 14), color: `${colors.text}80` },
  pageScroll: { paddingBottom: s(140), gap: s(15) },

  search: { height: s(42), borderRadius: s(21), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), gap: s(10) },
  searchIcon: { opacity: 0.3, width: s(22), alignItems: 'center' },
  searchInput: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  searchClear: { width: s(18), height: s(18), borderRadius: s(9), backgroundColor: `${colors.text}14`, alignItems: 'center', justifyContent: 'center' },
  searchClearText: { fontSize: s(8), color: `${colors.text}80`, fontWeight: '600' },
  searchEmpty: { alignItems: 'center', paddingTop: s(80), gap: s(10) },
  searchEmptyIcon: { opacity: 0.25, marginBottom: s(6) },
  searchEmptyTitle: { ...font('semibold', 16), color: colors.text },
  searchEmptyBody: { ...font('regular', 14), color: `${colors.text}80` },

  zoneSection: { gap: s(8) },
  sectionTitle: { ...font('regular', 14), color: `${colors.text}80` },
  zoneRows: { gap: s(8) },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(15), paddingHorizontal: s(15), paddingVertical: s(16), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  zoneTile: { width: s(37), height: s(37), borderRadius: s(12), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoneTileIcon: { width: s(23.125), height: s(23.125), tintColor: colors.white },
  zoneName: { ...font('regular', 15), color: colors.text, flexShrink: 1 },
  checkbox: { width: s(22), height: s(22), alignItems: 'center', justifyContent: 'center' },
  checkboxArt: { position: 'absolute', left: 0, top: 0, width: s(22), height: s(22) },
  checkboxBorder: { borderRadius: s(4), borderWidth: 1.5, borderColor: `${colors.text}33` },

  hero: { alignItems: 'center', gap: s(15) },
  heroTile: { width: s(55), height: s(55), borderRadius: s(17.838), borderWidth: 1.486, alignItems: 'center', justifyContent: 'center' },
  heroTileIcon: { width: s(34.375), height: s(34.375), tintColor: colors.white },
  optionCards: { marginTop: s(29), gap: s(10) },
  optionCard: { height: s(80), flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(10), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A` },
  optionIcon: { width: s(50), height: s(50), borderRadius: s(14.286), backgroundColor: `${colors.purple}14`, alignItems: 'center', justifyContent: 'center' },
  optionIconImage: { width: s(28.571), height: s(28.571) },
  optionCopy: { gap: s(4) },
  optionTitle: { ...font('medium', 15), color: colors.text },
  optionSubtitle: { ...font('regular', 14), color: `${colors.text}80` },

  presetScroll: { paddingTop: s(4), paddingBottom: s(140), gap: s(8) },
  presetCard: { paddingHorizontal: s(15), paddingVertical: s(16), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(14), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  presetTop: { flexDirection: 'row', alignItems: 'center' },
  presetCopy: { flex: 1, gap: s(3) },
  presetName: { ...font('regular', 15), color: colors.text },
  presetNameOn: { ...font('medium', 15), color: colors.text },
  presetFrequency: { ...font('regular', 13), color: `${colors.text}80` },
  presetDetail: { padding: s(12), borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(8) },
  presetDivider: { height: 1, backgroundColor: `${colors.text}1A` },
  presetRow: { flexDirection: 'row', alignItems: 'center' },
  presetRowTitle: { ...font('regular', 14), color: `${colors.text}80` },
  presetPill: { borderRadius: s(12), backgroundColor: `${colors.purple}1F`, paddingHorizontal: s(12), paddingVertical: s(5) },
  presetPillText: { ...font('medium', 12), color: colors.purple },

  card: { padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(20), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  cardInvalid: { borderWidth: 1.5, borderColor: CORAL },
  cardLabel: { ...font('medium', 14), color: `${colors.text}CC` },
  cardHint: { ...font('regular', 12), color: `${colors.text}80` },
  fieldBox: { height: s(48), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(14), justifyContent: 'center' },
  fieldInput: { ...font('regular', 14), color: colors.text, padding: 0 },

  whenBlock: { gap: s(10) },
  freqCard: { padding: s(8), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A` },
  freqRow: { height: s(56), flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(10), borderRadius: s(9) },
  freqRowOn: { backgroundColor: colors.background },
  freqDivider: { height: 1, backgroundColor: `${colors.text}1A` },
  freqIcon: { width: s(35), height: s(35), borderRadius: s(10), backgroundColor: `${colors.purple}14`, alignItems: 'center', justifyContent: 'center' },
  freqIconImage: { width: s(19), height: s(19), tintColor: colors.purple },
  freqCopy: { flex: 1, gap: s(4) },
  freqTitle: { ...font('regular', 14), color: colors.text },
  freqSubtitle: { ...font('regular', 12), color: `${colors.text}80` },

  occursBlock: { gap: s(6) },
  fieldRow: { flexDirection: 'row', gap: s(15) },
  scheduleField: { flex: 1, gap: s(6) },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(14), borderRadius: s(12), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A` },
  scheduleValue: { ...font('regular', 14), color: colors.text, flexShrink: 1 },
  daysBlock: { gap: s(10) },
  chipsCard: { flexDirection: 'row', padding: s(10), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A` },
  chipColumn: { flex: 1, alignItems: 'center', gap: s(6) },
  chipLabel: { ...font('regular', 14), color: `${colors.text}80` },
  chipCircle: { width: s(24), height: s(24), borderRadius: s(12), borderWidth: 1, borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },
  chipCircleOn: { backgroundColor: colors.purple, borderColor: 'transparent' },
  daysCaption: { ...font('medium', 12), color: colors.purple, textAlign: 'center' },
  customRow: { flexDirection: 'row', gap: s(10) },
  customWheel: { flex: 1, borderRadius: s(12), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, overflow: 'hidden' },

  assignHeader: { flexDirection: 'row', alignItems: 'center' },
  addMemberPill: { flexDirection: 'row', alignItems: 'center', height: s(26), borderRadius: s(13), backgroundColor: `${colors.purple}1F`, overflow: 'hidden' },
  addMemberLabel: { ...font('medium', 12), color: colors.purple, paddingHorizontal: s(10) },
  addMemberDivider: { width: 1, height: s(26), backgroundColor: `${colors.text}1A` },
  addMemberChevron: { width: s(25), height: s(26), backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  assignedRow: { gap: s(20), paddingTop: s(5) },
  assignedCell: { alignItems: 'center', gap: s(3) },
  assignedAvatar: { width: s(46), height: s(46) },
  assignedRemoveSlot: { position: 'absolute', top: -s(4), right: -s(4), zIndex: 2 },
  assignedRemove: { width: s(18), height: s(18), borderRadius: s(9), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center' },
  assignedRemoveText: { fontSize: s(8), color: `${colors.text}99`, fontWeight: '600' },
  assignedName: { ...font('regular', 12), color: colors.text, maxWidth: s(60), textAlign: 'center' },
  assignError: { ...font('regular', 12), color: CORAL },

  stateRow: { flexDirection: 'row', alignItems: 'center' },
  stateBlock: { alignItems: 'flex-end', gap: s(4) },
  stateLabel: { ...font('regular', 10), color: `${colors.text}80` },
  stateTrack: { width: s(142), height: s(19), borderRadius: s(9.5), overflow: 'hidden', justifyContent: 'center' },
  stateFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: s(9.5) },
  stateTick: { position: 'absolute', width: 1, height: s(8), backgroundColor: colors.white },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  toggleIcon: { width: s(24), height: s(24), opacity: 0.5 },
  proLock: { width: s(58), height: s(26) },
  track: { width: s(41), height: s(24), borderRadius: s(12), padding: s(2), justifyContent: 'center' },
  knob: { width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white },
  listHeader: { flexDirection: 'row', alignItems: 'center' },
  plusButton: { width: s(24), height: s(24), borderRadius: s(7), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  plusIcon: { width: s(20), height: s(20) },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), height: s(48), paddingHorizontal: s(14), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A` },
  subtaskInput: { flex: 1, ...font('regular', 14), color: colors.text, padding: 0 },
  trashButton: { width: s(20), height: s(20), alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  noteInput: { flex: 1, minHeight: s(80), paddingHorizontal: s(14), paddingVertical: s(12), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, ...font('regular', 14), color: colors.text, textAlignVertical: 'top' },
  noteTrash: { width: s(20), height: s(20), marginTop: s(12), alignItems: 'center', justifyContent: 'center' },

  uploadBox: { width: s(90), height: s(90), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderStyle: 'dashed', borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center', gap: s(6) },
  uploadIcon: { width: s(28), height: s(28), borderRadius: s(7), backgroundColor: `${colors.purple}1F`, alignItems: 'center', justifyContent: 'center' },
  uploadPlus: { width: s(20), height: s(20) },
  uploadLabel: { ...font('regular', 11), lineHeight: s(13.1), includeFontPadding: false, color: `${colors.text}80` },
  viewAll: { ...font('medium', 12), color: colors.purple },
  thumbRow: { flexDirection: 'row', gap: s(10) },
  thumb: { width: s(90), height: s(90), borderRadius: s(12), overflow: 'hidden', borderWidth: 1, borderColor: `${colors.text}1A` },
  thumbImage: { width: '100%', height: '100%' },
  thumbTrash: { position: 'absolute', top: s(5), right: s(5), width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addThumb: { width: s(90), height: s(90), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderStyle: 'dashed', borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },

  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: s(184) },
  bottomBar: { position: 'absolute', left: s(25), right: s(25), bottom: s(20) },
  continueCta: { height: s(52), borderRadius: s(26), backgroundColor: colors.purpleEdge, overflow: 'hidden', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' }] },
  continueInner: { flex: 1, marginBottom: s(1.5), borderRadius: s(26), backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(10) },
  continueLabel: { ...font('semibold', 16), color: colors.white },
  continueArrow: { width: s(16), height: s(16), tintColor: colors.white, transform: [{ rotate: '180deg' }] },
  saveCta: { height: s(52), borderRadius: s(26), backgroundColor: colors.purpleEdge, overflow: 'hidden', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' }] },
  saveInner: { flex: 1, marginBottom: s(1.5), borderRadius: s(26), backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(10) },
  saveLabel: { ...font('semibold', 16), color: colors.white },

  toastWrap: { position: 'absolute', left: s(20), right: s(20), bottom: s(100) },
  toast: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(16), paddingVertical: s(14), borderRadius: s(14), backgroundColor: CORAL, boxShadow: [{ offsetX: 0, offsetY: s(6), blurRadius: s(14), color: 'rgba(255,87,87,0.35)' }] },
  toastMark: { ...font('bold', 17), color: colors.white, width: s(17), textAlign: 'center' },
  toastText: { ...font('medium', 13), color: colors.white, flex: 1 },
});
