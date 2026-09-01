import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { AppImage } from '@/components/AppImage';
import { AvatarView, MAX_CHORE_PHOTOS, pickChorePhotos } from '@/components/AvatarView';
import { AssignMemberSheet, ChangeZoneSheet, PhotosSheet, ReminderSheet, REMINDER_NOTIFY_OPTIONS, timeLabel } from '@/components/AddChoreSheets';
import {
  AlarmGlyph, ChevronGlyph, ChoreCalendarGlyph, DueOnGlyph, EditGlyph, MarkDoneGlyph,
  PhotosGlyph, ReminderGlyph, SubtasksGlyph, UndoGlyph,
} from '@/components/glyphs';
import { PressScale } from '@/components/motion';
import { predefinedZoneSections, zoneIcon, zonePalettes } from '@/models/zones';
import { dueBarGradient, dueTrackFill, liveDueState } from '@/models/dueState';
import { useKeyboardAutoScroll } from '@/hooks/useKeyboardAutoScroll';
import { loadChorePhotos, replaceChorePhotos } from '@/services/ChorePhotos';
import { useChores, type Chore } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { usePurchases } from '@/services/PurchaseManager';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

const CORAL = '#FF5757';
/** iOS `ringPalette`: the four rotating rings behind the assigned member avatars. */
const RING_PALETTE = ['#FF6E92', '#21C4FF', '#A65FFD', '#8B9AFF'];

type Field = { id: string; text: string };
let fieldSeed = 0;
const newField = (text = ''): Field => ({ id: `d${(fieldSeed += 1)}`, text });
const trimmed = (fields: Field[]) => fields.map(field => field.text.trim()).filter(Boolean);

/** iOS seeds the reminder wheel from the stored "h:mm a" string, falling back to 9:00 AM. */
const parseTime = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp])[Mm]$/);
  const date = new Date();
  if (!match) { date.setHours(9, 0, 0, 0); return date; }
  const hour = Number(match[1]) % 12 + (match[3].toLowerCase() === 'p' ? 12 : 0);
  date.setHours(hour, Number(match[2]), 0, 0);
  return date;
};

/**
 * iOS `ChoreDetailView` (AddChore/ChoreDetailView.swift). The same screen backs
 * read-only detail and edit mode — `route.params.editing` is iOS's `isEditing`,
 * set by the chore menus' "Edit Chore" row.
 */
export function ChoreDetailView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ChoreDetail'>) {
  const insets = useSafeAreaInsets();
  const store = useChores();
  const household = useHousehold();
  const { hasPro } = usePurchases();
  const isEditing = Boolean(route.params.editing);
  const chore = store.chores.find(item => item.id === route.params.choreId);

  if (!chore) {
    return (
      <View style={styles.root}>
        <Header title="Chore Details" onBack={() => navigation.goBack()} onMenu={null} />
        <Text style={styles.missing}>Chore not found</Text>
      </View>
    );
  }
  return <Detail key={chore.id} chore={chore} isEditing={isEditing} navigation={navigation} insets={insets} store={store} household={household} hasPro={hasPro} />;
}

type DetailProps = {
  chore: Chore;
  isEditing: boolean;
  navigation: NativeStackScreenProps<RootStackParamList, 'ChoreDetail'>['navigation'];
  insets: { bottom: number };
  store: ReturnType<typeof useChores>;
  household: ReturnType<typeof useHousehold>;
  hasPro: boolean;
};

function Detail({ chore, isEditing, navigation, insets, store, household, hasPro }: DetailProps) {
  const autoScroll = useKeyboardAutoScroll();
  // iOS puts this CTA 20 above the window bottom; Android lifts it clear of the
  // navigation bar, and the bottom fade grows by the same amount (see BottomFade).
  const ctaBottom = Math.max(s(20), insets.bottom + s(12));
  const [displayName, setDisplayName] = useState(chore.name);
  const [zoneName, setZoneName] = useState(chore.zoneName);
  const [assigned, setAssigned] = useState<string[]>(chore.assignedMemberIds);
  const [notes, setNotes] = useState<Field[]>(() => (chore.notes ? chore.notes.split('\n').map(line => newField(line)) : [newField()]));
  const [subtasks, setSubtasks] = useState<Field[]>(() => (chore.subtasks.length ? chore.subtasks.map(item => newField(item)) : [newField()]));
  const [subtasksOn, setSubtasksOn] = useState(chore.subtasksOn);
  const [reminderOn, setReminderOn] = useState(chore.reminderOn);
  const [reminderTime, setReminderTime] = useState(() => parseTime(chore.reminderTime));
  const [reminderNotify, setReminderNotify] = useState(chore.reminderNotify || REMINDER_NOTIFY_OPTIONS[0].title);
  const [reminderNotifyMode, setReminderNotifyMode] = useState(false);
  const [photosOn, setPhotosOn] = useState(chore.photoCount > 0);
  const [photos, setPhotos] = useState<string[]>([]);

  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<'zone' | 'member' | 'reminder' | 'photos' | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const validationToken = useRef(0);

  const dirty = useRef(false);
  const photosDirty = useRef(false);
  const suppressSave = useRef(false);
  const markDirty = () => { dirty.current = true; };

  const isDone = store.isDoneToday(chore);
  const live = liveDueState(chore.dueDate);
  const accent = live.state === 'upcoming' ? '#2DA100' : live.state === 'today' ? '#3F81FF' : CORAL;
  const cardFill = live.state === 'upcoming' ? '#EAF6E6' : live.state === 'today' ? '#DBE8FD' : '#FFE7E7';
  const isProLocked = isEditing && !hasPro;
  const assignInvalid = isEditing && assigned.length === 0;
  const assignedProfiles = assigned
    .map(id => household.members.find(member => member.id === id))
    .filter((member): member is HouseholdMember => Boolean(member));

  const zone = useMemo(() => {
    const created = store.createdZones.find(item => item.name === zoneName);
    if (created) return { iconAsset: created.iconAsset, palette: zonePalettes[created.colorIndex % zonePalettes.length] };
    const predefined = predefinedZoneSections.flatMap(section => section.items).find(item => item.name === zoneName);
    return { iconAsset: predefined?.iconAsset ?? 'zone1Icon', palette: zonePalettes[predefined?.palette ?? 0] };
  }, [store.createdZones, zoneName]);

  /** iOS `loadRemotePhotosIfNeeded`. */
  useEffect(() => {
    if (!household.household || chore.photoCount <= 0) return;
    let alive = true;
    void loadChorePhotos(household.household.id, chore.id)
      .then(list => { if (alive && list.length) setPhotos(list); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [household.household, chore.id, chore.photoCount]);

  /**
   * iOS `saveEditsIfNeeded` on `onDisappear`: edit mode persists whatever the
   * user changed when the screen goes away, not only when the CTA is tapped.
   */
  const persist = useCallback(async () => {
    await store.updateChore(chore.id, {
      notes: trimmed(notes).join('\n'),
      subtasks: trimmed(subtasks),
      subtasksOn,
      reminderOn,
      reminderTime: timeLabel(reminderTime),
      reminderNotify,
      assignedMemberIds: assigned.length ? assigned : chore.assignedMemberIds,
    });
    if (photosDirty.current && household.household) {
      await replaceChorePhotos(household.household.id, chore.id, photosOn ? photos : []).catch(() => undefined);
    }
  }, [store, chore.id, chore.assignedMemberIds, notes, subtasks, subtasksOn, reminderOn, reminderTime, reminderNotify, assigned, household.household, photos, photosOn]);

  const persistRef = useRef(persist);
  persistRef.current = persist;
  useEffect(() => () => {
    if (isEditing && dirty.current && !suppressSave.current) void persistRef.current();
  }, [isEditing]);

  const showValidation = (message: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    validationToken.current += 1;
    const token = validationToken.current;
    setValidation(message);
    setTimeout(() => { if (token === validationToken.current) setValidation(null); }, 4000);
  };
  const clearValidation = () => { validationToken.current += 1; setValidation(null); };

  const confirmDelete = () => Alert.alert('Delete Chore?', `This will permanently delete "${displayName}". This can't be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { suppressSave.current = true; void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); void store.deleteChore(chore).then(() => navigation.goBack()); } },
  ]);

  const cta = isEditing
    ? { title: 'Save Changes', color: colors.purple }
    : isDone ? { title: 'Mark as Undone', color: CORAL } : { title: 'Mark as Done', color: '#2DA100' };

  const onCta = () => {
    if (isEditing) {
      if (!assigned.length) { showValidation('Please assign this chore to a member before saving.'); return; }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      suppressSave.current = true;
      void persist().then(() => navigation.goBack());
      return;
    }
    if (isDone) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.setCompleted(chore, false); }
    else { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.setCompleted(chore, true); }
  };

  /**
   * iOS `photoPicker` is `PhotosPicker(maxSelectionCount: 10)` and its
   * `loadPhotos()` APPENDS the fresh picks, de-duplicated, under the same cap.
   */
  const addPhoto = async () => {
    const encoded = await pickChorePhotos(MAX_CHORE_PHOTOS - photos.length);
    if (!encoded.length) return;
    setPhotos(current => [...current, ...encoded].slice(0, MAX_CHORE_PHOTOS));
    photosDirty.current = true;
    markDirty();
  };
  const removePhoto = (index: number) => { setPhotos(current => current.filter((_, item) => item !== index)); photosDirty.current = true; markDirty(); };

  return (
    <View style={styles.root}>
      <Header title={isEditing ? 'Edit Chore' : 'Chore Details'} onBack={() => navigation.goBack()} onMenu={() => setMenu(value => !value)} />

      <ScrollView
        ref={autoScroll.ref}
        onScroll={autoScroll.onScroll}
        scrollEventThrottle={autoScroll.scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: s(140) + insets.bottom + autoScroll.padBottom }]}
      >
        {/* iOS dueOnCard */}
        <View style={[styles.card, { backgroundColor: cardFill, borderColor: accent }]}>
          <View style={styles.row}>
            <View style={[styles.dueIcon, { backgroundColor: accent }]}><DueOnGlyph size={s(22)} color={colors.white} /></View>
            <View style={styles.dueCopy}>
              <Text style={[styles.dueTitle, { color: accent }]}>Due On</Text>
              <Text style={styles.dueDate}>{chore.dueDate}</Text>
            </View>
            <View style={styles.spacer} />
            <View style={[styles.pill, { backgroundColor: `${accent}1A` }]}>
              <Text style={[styles.pillText, { color: accent }]}>{chore.frequency === 'One Time' ? 'One Time' : 'Repeat'}</Text>
            </View>
          </View>
        </View>

        {/* iOS nameCard */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.spacer} />
            {isEditing && (
              <Pressable hitSlop={10} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRename(displayName); }}>
                <EditGlyph size={s(20)} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        {/* iOS progressCard */}
        <View style={styles.card}>
          <View style={styles.progressBlock}>
            <Text style={styles.progressLabel}>{live.label}</Text>
            <View style={[styles.track, { backgroundColor: dueTrackFill[live.state] }]}>
              <LinearGradient colors={dueBarGradient[live.state]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.fill, { width: `${Math.max(0, Math.min(1, live.fraction)) * 100}%` }]} />
              <View style={[styles.tick, { left: '61%' }]} />
              <View style={[styles.tick, { left: '87%' }]} />
            </View>
          </View>
        </View>

        {/* iOS notesCard */}
        <View style={styles.card}>
          <View style={styles.blockGap}>
            <View style={styles.row}>
              <Text style={styles.label}>Add Notes</Text>
              <View style={styles.spacer} />
              {isEditing && <PlusButton enabled={notes.every(field => field.text.trim())} onPress={() => { setNotes([...notes, newField()]); markDirty(); }} />}
            </View>
            {notes.map(field => (
              <View key={field.id} style={styles.noteRow}>
                <TextInput
                  onFocus={autoScroll.onFocus}
                  editable={isEditing}
                  multiline
                  value={field.text}
                  onChangeText={text => { setNotes(notes.map(item => (item.id === field.id ? { ...item, text } : item))); markDirty(); }}
                  placeholder="Add notes"
                  placeholderTextColor={`${colors.text}4D`}
                  selectionColor={colors.purple}
                  style={styles.noteInput}
                />
                {isEditing && (
                  <PressScale onPress={() => { setNotes(notes.filter(item => item.id !== field.id)); markDirty(); }} style={styles.noteTrash}>
                    <Images.choreTrashIcon width={s(20)} height={s(20)} />
                  </PressScale>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* iOS zoneAssignCard */}
        <View style={styles.card}>
          <View style={styles.zoneBlock}>
            <View style={styles.row}>
              <Text style={styles.labelStrong}>Zone Name*</Text>
              <View style={styles.spacer} />
              <PressScale
                disabled={!isEditing}
                onPress={() => setSheet('zone')}
                style={styles.zoneChip}
              >
                <LinearGradient colors={[zone.palette.top, zone.palette.bottom]} style={[styles.zoneTile, { borderColor: zone.palette.border }]}>
                  <AppImage source={zoneIcon(zone.iconAsset)} resizeMode="contain" style={styles.zoneTileIcon} />
                </LinearGradient>
                <Text style={styles.zoneName} numberOfLines={1}>{zoneName}</Text>
                {isEditing && <View style={styles.chevronSlot}><ChevronGlyph width={s(5)} height={s(9)} color={`${colors.text}80`} /></View>}
              </PressScale>
            </View>

            <View style={styles.divider} />

            <PressScale disabled={!isEditing} onPress={() => { clearValidation(); setSheet('member'); }} style={styles.row}>
              <Text style={[styles.labelStrong, assignInvalid && { color: CORAL }]}>Assign Task to*</Text>
              <View style={styles.spacer} />
              {isEditing && (
                /* iOS is `HStack(spacing: 6) { Text, chevron 5x9 }` with
                   `.padding(.horizontal, 10)` — equal side paddings, 6 between.
                   Those offsets live on the CHILDREN, not on the pill: this row has
                   twice truncated its label on device (2026-08-27 painted only "Add",
                   and a container `paddingHorizontal` + `gap` painted only "member"),
                   and the shape that renders the full string is padding-on-children
                   with the chevron in its own sized box. The mechanism behind the
                   truncation is still unidentified, so do not reshape this row. */
                <View style={styles.addMemberPill}>
                  <Text style={styles.addMemberText}>Add member</Text>
                  <View style={styles.addMemberChevron}><ChevronGlyph width={s(5)} height={s(9)} color={colors.purple} /></View>
                </View>
              )}
            </PressScale>

            {assignedProfiles.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
                {assignedProfiles.map((member, index) => (
                  <View key={member.id} style={styles.avatarCell}>
                    <View style={styles.avatarStack}>
                      <View style={[styles.avatarWrap, { backgroundColor: RING_PALETTE[index % RING_PALETTE.length] }]}>
                        <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(46)} />
                      </View>
                      {isEditing && (
                        <View style={styles.avatarRemoveSlot}>
                          <PressScale onPress={() => { setAssigned(assigned.filter(id => id !== member.id)); markDirty(); }} style={styles.avatarRemove}>
                            <Text style={styles.avatarRemoveText}>✕</Text>
                          </PressScale>
                        </View>
                      )}
                    </View>
                    <Text style={styles.avatarName} numberOfLines={1}>{member.name}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {assignInvalid && (
              <View style={styles.errorRow}>
                <Text style={styles.errorMark}>!</Text>
                <Text style={styles.errorText}>Assign at least one member to save</Text>
              </View>
            )}
          </View>
        </View>

        {/* iOS reminderCard */}
        <ToggleCard Icon={ReminderGlyph} title="Reminder" value={reminderOn} editable={isEditing} locked={isProLocked} onLocked={() => navigation.push('Paywall')} onChange={next => { setReminderOn(next); markDirty(); }}>
          <View style={styles.fieldRow}>
            <ScheduleField editable={isEditing} label="Remind Me" glyph={<AlarmGlyph size={s(20)} color={`${colors.text}80`} />} value={timeLabel(reminderTime)} onPress={() => { setReminderNotifyMode(false); setSheet('reminder'); }} />
            <ScheduleField editable={isEditing} label="When To Notify" glyph={<ChoreCalendarGlyph size={s(20)} color={`${colors.text}80`} />} value={reminderNotify} onPress={() => { setReminderNotifyMode(true); setSheet('reminder'); }} />
          </View>
        </ToggleCard>

        {/* iOS subtasksCard */}
        <ToggleCard Icon={SubtasksGlyph} title="Sub-tasks" value={subtasksOn} editable={isEditing} locked={isProLocked} onLocked={() => navigation.push('Paywall')} onChange={next => { setSubtasksOn(next); markDirty(); }}>
          <View style={styles.row}>
            <Text style={styles.label}>Task Name</Text>
            <View style={styles.spacer} />
            {isEditing && <PlusButton enabled={subtasks.every(field => field.text.trim())} onPress={() => { setSubtasks([...subtasks, newField()]); markDirty(); }} />}
          </View>
          {subtasks.map(field => (
            <View key={field.id} style={styles.subtaskRow}>
              <TextInput
                onFocus={autoScroll.onFocus}
                editable={isEditing}
                value={field.text}
                onChangeText={text => { setSubtasks(subtasks.map(item => (item.id === field.id ? { ...item, text } : item))); markDirty(); }}
                placeholder="Enter sub task"
                placeholderTextColor={`${colors.text}66`}
                selectionColor={colors.purple}
                style={styles.subtaskInput}
              />
              {isEditing && (
                <PressScale onPress={() => { setSubtasks(subtasks.filter(item => item.id !== field.id)); markDirty(); }} style={styles.trashButton}>
                  <Images.choreTrashIcon width={s(20)} height={s(20)} />
                </PressScale>
              )}
            </View>
          ))}
        </ToggleCard>

        {/* iOS photosCard */}
        <ToggleCard Icon={PhotosGlyph} title="Add Photos" value={photosOn} editable={isEditing} locked={isProLocked} onLocked={() => navigation.push('Paywall')} onChange={next => { setPhotosOn(next); if (!next) photosDirty.current = true; markDirty(); }}>
          {photos.length === 0 ? (
            isEditing ? (
              <PressScale onPress={() => { void addPhoto(); }} style={styles.uploadBox}>
                <View style={styles.uploadIcon}><AppImage source={Images.plusIcon} resizeMode="contain" style={styles.uploadPlus} /></View>
                <Text style={styles.uploadLabel}>Upload Images</Text>
              </PressScale>
            ) : null
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>{String(photos.length).padStart(2, '0')} Photos</Text>
                <View style={styles.spacer} />
                <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet('photos'); }}>
                  <Text style={styles.viewAll}>View All</Text>
                </Pressable>
              </View>
              <View style={styles.thumbRow}>
                {photos.slice(0, 3).map((photo, index) => (
                  <View key={`${index}-${photo.slice(0, 12)}`} style={styles.thumb}>
                    <AppImage source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.thumbImage} />
                    {isEditing && (
                      <PressScale onPress={() => removePhoto(index)} style={styles.thumbTrash}>
                        <Images.choreTrashIcon width={s(12)} height={s(12)} />
                      </PressScale>
                    )}
                  </View>
                ))}
                {/*
                  Same deliberate deviation as AddChoreView: iOS's `addThumbLabel` is a
                  bare white `plusIcon` on `appBackground`, which is invisible, so it
                  keeps the 12% purple square from `uploadBoxLabel`.
                */}
                {isEditing && photos.length < 3 && (
                  <PressScale onPress={() => { void addPhoto(); }} style={styles.addThumb}>
                    <View style={styles.uploadIcon}><AppImage source={Images.plusIcon} resizeMode="contain" style={styles.uploadPlus} /></View>
                  </PressScale>
                )}
              </View>
            </>
          )}
        </ToggleCard>
      </ScrollView>

      {/* iOS markAsDoneBar */}
      <LinearGradient colors={[`${colors.background}00`, colors.background]} style={[styles.bottomFade, { height: s(184) + Math.max(0, ctaBottom - s(20)) }]} pointerEvents="none" />
      <View style={[styles.bottomBar, { bottom: ctaBottom }]}>
        <PressScale haptic="none" onPress={onCta} style={[styles.cta, { backgroundColor: cta.color, opacity: assignInvalid ? 0.5 : 1 }]}>
          {!isEditing && (isDone ? <UndoGlyph size={s(20)} color={colors.white} /> : <MarkDoneGlyph size={s(20)} color={colors.white} />)}
          <Text style={styles.ctaText}>{cta.title}</Text>
        </PressScale>
      </View>

      {menu && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(false)} />
          <View style={styles.menu}>
            <PressScale
              onPress={() => { setMenu(false); suppressSave.current = true; void store.skipToday(chore).then(() => navigation.goBack()); }}
              style={styles.menuRow}
            >
              <Images.skipIcon width={s(20)} height={s(20)} />
              <Text style={styles.menuText}>Skip Chore</Text>
            </PressScale>
            <View style={styles.menuDivider} />
            <PressScale onPress={() => { setMenu(false); confirmDelete(); }} style={styles.menuRow}>
              <Images.deleteIcon width={s(20)} height={s(20)} />
              <Text style={[styles.menuText, { color: '#FF6262' }]}>Delete Chore</Text>
            </PressScale>
          </View>
        </>
      )}

      {validation && (
        <Pressable onPress={clearValidation} style={[styles.toastWrap, { bottom: Math.max(s(100), insets.bottom + s(92)) }]}>
          <View style={styles.toast}>
            <Text style={styles.toastMark}>!</Text>
            <Text style={styles.toastText}>{validation}</Text>
          </View>
        </Pressable>
      )}

      {rename !== null && (
        <RenameDialog
          value={rename}
          onChange={setRename}
          onCancel={() => setRename(null)}
          onSave={() => {
            const next = rename.trim();
            if (!next) return;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setDisplayName(next);
            setRename(null);
            void store.updateChore(chore.id, { name: next });
          }}
        />
      )}

      {sheet === 'zone' && (
        <ChangeZoneSheet
          initialZoneName={zoneName}
          onSelect={next => { setZoneName(next); void store.updateChore(chore.id, { zoneName: next }); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'member' && (
        <AssignMemberSheet
          selected={assigned}
          onSave={ids => { setAssigned(ids); markDirty(); clearValidation(); }}
          onCreate={(name, avatar, photoData) => void household.addMember(name, avatar, photoData)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'reminder' && (
        <ReminderSheet
          time={reminderTime}
          notify={reminderNotify}
          notifyMode={reminderNotifyMode}
          onTime={next => { setReminderTime(next); markDirty(); }}
          onNotify={next => { setReminderNotify(next); markDirty(); }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'photos' && (
        <PhotosSheet photos={photos} allowDelete={isEditing} onDelete={removePhoto} onClose={() => setSheet(null)} />
      )}
    </View>
  );
}

/** iOS `header`: centred title with the 40pt back and 3-dot circle buttons. */
function Header({ title, onBack, onMenu }: { title: string; onBack(): void; onMenu: (() => void) | null }) {
  const MoreIcon = Images.moreVerticalIcon;
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerButtons}>
          <PressScale onPress={onBack} style={styles.circle}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </PressScale>
          {onMenu ? (
            <PressScale onPress={onMenu} style={styles.circle}>
              <MoreIcon width={s(22)} height={s(22)} />
            </PressScale>
          ) : <View style={styles.circlePlaceholder} />}
        </View>
      </View>
    </View>
  );
}

/** iOS `toggleRow` card: 24pt glyph, title, and either the toggle or the Pro lock badge. */
function ToggleCard({ Icon, title, value, editable, locked, onLocked, onChange, children }: React.PropsWithChildren<{ Icon: React.ComponentType<{ size: number; color: string }>; title: string; value: boolean; editable: boolean; locked: boolean; onLocked(): void; onChange(next: boolean): void }>) {
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    const stiffness = (2 * Math.PI / 0.3) ** 2;
    Animated.spring(progress, { toValue: value ? 1 : 0, stiffness, damping: 2 * 0.7 * Math.sqrt(stiffness), mass: 1, useNativeDriver: false }).start();
  }, [value, progress]);
  return (
    <View style={styles.card}>
      <View style={styles.toggleBlock}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleIcon}><Icon size={s(24)} color={colors.text} /></View>
          <Text style={styles.labelStrong}>{title}</Text>
          <View style={styles.spacer} />
          {locked ? (
            <PressScale onPress={onLocked}>
              <AppImage source={Images.proLockIcon} resizeMode="contain" style={styles.proLock} />
            </PressScale>
          ) : (
            <Pressable disabled={!editable} onPress={() => { void Haptics.selectionAsync(); onChange(!value); }}>
              <Animated.View style={[styles.track41, { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [`${colors.text}33`, colors.purple] }) }]}>
                <Animated.View style={[styles.knob, { transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, s(17)] }) }] }]} />
              </Animated.View>
            </Pressable>
          )}
        </View>
        {value && !locked && children}
      </View>
    </View>
  );
}

/** iOS `scheduleField` / `readonlyField`. */
function ScheduleField({ editable, label, glyph, value, onPress }: { editable: boolean; label: string; glyph: React.ReactNode; value: string; onPress(): void }) {
  return (
    <View style={styles.scheduleField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <PressScale disabled={!editable} onPress={onPress} style={styles.scheduleButton}>
        {glyph}
        <Text style={styles.scheduleValue} numberOfLines={1}>{value}</Text>
      </PressScale>
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

/**
 * iOS uses `.alert("Rename Chore")` with an inline `TextField`. Android's
 * `Alert` has no text input, so the same copy and actions are rendered as a
 * centred dialog card.
 */
function RenameDialog({ value, onChange, onCancel, onSave }: { value: string; onChange(next: string): void; onCancel(): void; onSave(): void }) {
  return (
    <View style={styles.dialogRoot}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      <View style={styles.dialogCard}>
        <Text style={styles.dialogTitle}>Rename Chore</Text>
        <Text style={styles.dialogBody}>Enter a new name for this chore.</Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          placeholder="Chore name"
          placeholderTextColor={`${colors.text}4D`}
          selectionColor={colors.purple}
          style={styles.dialogInput}
        />
        <View style={styles.dialogActions}>
          <Pressable onPress={onCancel} style={styles.dialogButton}><Text style={styles.dialogCancel}>Cancel</Text></Pressable>
          <Pressable disabled={!value.trim()} onPress={onSave} style={styles.dialogButton}>
            <Text style={[styles.dialogSave, !value.trim() && { opacity: 0.4 }]}>Save</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  spacer: { flex: 1 },
  missing: { textAlign: 'center', marginTop: s(40), ...font('semibold', 18), color: colors.text },

  headerWrap: { paddingHorizontal: s(15), paddingTop: s(59) },
  // iOS's header is a ZStack whose height is its 40pt circle buttons, so the
  // ScrollView below starts at 59 + 40. Without an explicit height this row was only
  // as tall as the 22pt title (~26), which both raised the scroll by ~14 units and
  // left the absolutely-centred 40pt buttons OVERHANGING the scroll's top edge — so
  // scrolled cards slid under them instead of stopping cleanly below the header.
  header: { height: s(40), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 22), lineHeight: s(26.2), includeFontPadding: false, color: colors.text },
  headerButtons: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circle: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(5), color: 'rgba(0,0,0,0.1)' }] },
  circlePlaceholder: { width: s(40), height: s(40) },
  headerIcon: { width: s(20), height: s(20) },

  scroll: { paddingHorizontal: s(15), paddingTop: s(20), gap: s(15) },
  card: { padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(3.75), color: 'rgba(0,0,0,0.1)' }] },
  row: { flexDirection: 'row', alignItems: 'center' },
  blockGap: { gap: s(10) },
  label: { ...font('medium', 14), lineHeight: s(16.7), includeFontPadding: false, color: `${colors.text}CC` },
  labelStrong: { ...font('medium', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text },

  dueIcon: { width: s(40), height: s(40), borderRadius: s(20), alignItems: 'center', justifyContent: 'center', marginRight: s(10) },
  dueCopy: { gap: s(4) },
  dueTitle: { ...font('semibold', 14), lineHeight: s(16.7), includeFontPadding: false },
  dueDate: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text },
  pill: { paddingHorizontal: s(10), paddingVertical: s(5), borderRadius: s(100) },
  pillText: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false },

  name: { ...font('medium', 18), lineHeight: s(21.5), includeFontPadding: false, color: colors.text, flexShrink: 1 },

  progressBlock: { gap: s(12) },
  progressLabel: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80`, textAlign: 'right' },
  track: { height: s(25), borderRadius: s(12.5), overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: s(12.5), borderWidth: 0.6, borderColor: colors.white },
  tick: { position: 'absolute', width: s(2.6), height: s(10.5), backgroundColor: colors.white },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  noteInput: { flex: 1, minHeight: s(80), paddingHorizontal: s(14), paddingVertical: s(12), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, ...font('regular', 14), color: colors.text, textAlignVertical: 'top' },
  noteTrash: { width: s(20), height: s(20), marginTop: s(12), alignItems: 'center', justifyContent: 'center' },

  zoneBlock: { gap: s(12) },
  zoneChip: { flexDirection: 'row', alignItems: 'center', gap: s(6), flexShrink: 0 },
  chevronSlot: { width: s(5), height: s(9), alignItems: 'center', justifyContent: 'center' },
  zoneTile: { width: s(27), height: s(26), borderRadius: s(9), borderWidth: 0.6, alignItems: 'center', justifyContent: 'center' },
  zoneTileIcon: { width: s(17), height: s(16), tintColor: colors.white },
  zoneName: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.text },
  divider: { height: 1, backgroundColor: `${colors.text}1A` },
  addMemberPill: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, height: s(26), borderRadius: s(13), backgroundColor: `${colors.purple}1A` },
  addMemberText: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false, color: colors.purple, flexShrink: 0, paddingLeft: s(10) },
  addMemberChevron: { height: s(26), paddingLeft: s(6), paddingRight: s(10), alignItems: 'center', justifyContent: 'center' },
  avatarRow: { gap: s(20), paddingTop: s(3) },
  avatarCell: { alignItems: 'center', gap: s(3) },
  avatarWrap: { width: s(46), height: s(46), borderRadius: s(23), borderWidth: 1.1, borderColor: colors.white, overflow: 'hidden' },
  avatarStack: { width: s(46), height: s(46) },
  avatarRemoveSlot: { position: 'absolute', top: -s(2), right: -s(6), zIndex: 2 },
  avatarRemove: { width: s(18), height: s(18), borderRadius: s(9), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },
  avatarRemoveText: { fontSize: s(8), fontWeight: '600', color: `${colors.text}99` },
  avatarName: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: colors.text, maxWidth: s(64), textAlign: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  errorMark: { ...font('bold', 13), color: CORAL, width: s(13), textAlign: 'center' },
  errorText: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: CORAL },

  toggleBlock: { gap: s(15) },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  toggleIcon: { width: s(24), height: s(24), opacity: 0.5 },
  proLock: { width: s(58), height: s(26) },
  track41: { width: s(41), height: s(24), borderRadius: s(12), padding: s(2), justifyContent: 'center' },
  knob: { width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white },

  fieldRow: { flexDirection: 'row', gap: s(15) },
  scheduleField: { flex: 1, gap: s(6) },
  fieldLabel: { ...font('regular', 12), lineHeight: s(14.3), includeFontPadding: false, color: colors.text },
  scheduleButton: { flexDirection: 'row', alignItems: 'center', gap: s(10), padding: s(14), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A` },
  scheduleValue: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text, flexShrink: 1 },

  plusButton: { width: s(24), height: s(24), borderRadius: s(7), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  plusIcon: { width: s(20), height: s(20) },
  subtaskRow: { flexDirection: 'row', alignItems: 'center', gap: s(10), height: s(48), paddingHorizontal: s(14), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A` },
  subtaskInput: { flex: 1, ...font('regular', 14), color: colors.text, padding: 0 },
  trashButton: { width: s(20), height: s(20), alignItems: 'center', justifyContent: 'center' },

  uploadBox: { width: s(90), height: s(90), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderStyle: 'dashed', borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center', gap: s(6) },
  uploadIcon: { width: s(28), height: s(28), borderRadius: s(7), backgroundColor: `${colors.purple}1F`, alignItems: 'center', justifyContent: 'center' },
  uploadPlus: { width: s(20), height: s(20) },
  uploadLabel: { ...font('regular', 11), lineHeight: s(13.1), includeFontPadding: false, color: `${colors.text}80` },
  viewAll: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false, color: colors.purple },
  thumbRow: { flexDirection: 'row', gap: s(10) },
  thumb: { width: s(90), height: s(90), borderRadius: s(12), overflow: 'hidden', borderWidth: 1, borderColor: `${colors.text}1A` },
  thumbImage: { width: '100%', height: '100%' },
  thumbTrash: { position: 'absolute', top: s(5), right: s(5), width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addThumb: { width: s(90), height: s(90), borderRadius: s(12), backgroundColor: colors.background, borderWidth: 1, borderStyle: 'dashed', borderColor: `${colors.text}33`, alignItems: 'center', justifyContent: 'center' },

  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: s(184) },
  bottomBar: { position: 'absolute', left: s(25), right: s(25) },
  cta: { height: s(52), borderRadius: s(26), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(10), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(5), color: 'rgba(0,0,0,0.3)' }] },
  ctaText: { ...font('semibold', 16), lineHeight: s(19.1), includeFontPadding: false, color: colors.white },

  menu: { position: 'absolute', top: s(110), right: s(15), width: s(161), borderRadius: s(16), backgroundColor: colors.background, overflow: 'hidden', boxShadow: [{ offsetX: -s(5), offsetY: s(5), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' }] },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(14), paddingVertical: s(12) },
  menuText: { ...font('regular', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text },
  menuDivider: { height: 1, backgroundColor: `${colors.text}1A` },

  toastWrap: { position: 'absolute', left: s(20), right: s(20) },
  toast: { flexDirection: 'row', alignItems: 'center', gap: s(10), paddingHorizontal: s(16), paddingVertical: s(14), borderRadius: s(14), backgroundColor: CORAL, boxShadow: [{ offsetX: 0, offsetY: s(6), blurRadius: s(14), color: 'rgba(255,87,87,0.35)' }] },
  toastMark: { ...font('bold', 17), color: colors.white, width: s(17), textAlign: 'center' },
  toastText: { ...font('medium', 13), lineHeight: s(15.5), includeFontPadding: false, color: colors.white, flex: 1 },

  dialogRoot: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  dialogCard: { width: s(280), borderRadius: s(16), backgroundColor: colors.white, padding: s(18), gap: s(10) },
  dialogTitle: { ...font('semibold', 17), lineHeight: s(20.3), includeFontPadding: false, color: colors.text, textAlign: 'center' },
  dialogBody: { ...font('regular', 13), lineHeight: s(15.5), includeFontPadding: false, color: `${colors.text}99`, textAlign: 'center' },
  dialogInput: { height: s(44), borderRadius: s(12), borderWidth: 1, borderColor: `${colors.text}1A`, backgroundColor: colors.background, paddingHorizontal: s(12), ...font('regular', 14), color: colors.text },
  dialogActions: { flexDirection: 'row', gap: s(10) },
  dialogButton: { flex: 1, height: s(42), alignItems: 'center', justifyContent: 'center' },
  dialogCancel: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: `${colors.text}99` },
  dialogSave: { ...font('semibold', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.purple },
});
