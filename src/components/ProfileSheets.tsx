import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import { Images } from '@/constants/assets';
import { BottomSheet, SheetHeader, sheetFooterPad, useSheet } from '@/components/BottomSheet';
import { CapsuleCTA, PressScale } from '@/components/motion';
import { pickAvatarPhoto } from '@/components/AvatarView';
import { avatarImages, avatarNames, avatarSource } from '@/screens/household/HouseholdUI';
import { colors, font, s, screen } from '@/theme';
import { AppImage } from '@/components/AppImage';

export const NAME_LIMIT = 20;

/** iOS `SelectOptionSheet`: Camera / Gallery cards, bunny pinned to the leading edge. */
export function SelectOptionSheet({ onPicked, onClose }: { onPicked(photoData: string): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height="auto" bunny="leading">
      <SelectOptionBody onPicked={onPicked} />
    </BottomSheet>
  );
}

function SelectOptionBody({ onPicked }: { onPicked(photoData: string): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const choose = (camera: boolean) => {
    close(() => {
      void pickAvatarPhoto(camera).then(encoded => { if (encoded) onPicked(encoded); });
    });
  };
  return (
    <>
      <SheetHeader title="Select Option" />
      <View style={[styles.optionRow, { paddingBottom: sheetFooterPad(55, insets.bottom) }]}>
        <OptionCard label="Camera" onPress={() => choose(true)} glyph={<CameraGlyph />} />
        <OptionCard label="Gallery" onPress={() => choose(false)} glyph={<GalleryGlyph />} />
      </View>
    </>
  );
}

function OptionCard({ label, glyph, onPress }: { label: string; glyph: React.ReactNode; onPress(): void }) {
  return (
    <PressScale onPress={onPress} style={styles.optionCard}>
      {glyph}
      <Text style={styles.optionLabel}>{label}</Text>
    </PressScale>
  );
}

/**
 * iOS draws these with `Image(systemName: "camera.fill" / "photo.fill")` at
 * `.font(.system(size: 30))`. SF Symbols cannot ship on Android — they are Apple
 * artwork and there is no RN equivalent — so both glyphs are drawn here, to the
 * REAL symbols' geometry: the two symbols were rendered on macOS at 120pt and
 * measured (row-by-row alpha scans), then divided by 4 to land on iOS's 30pt
 * numbers. Nothing Apple-authored is bundled; only the proportions are matched.
 *
 * At 30pt the symbols measure: `camera.fill` ink 36.0 x 28.0 inside a 43.5 x 32
 * layout box, `photo.fill` ink 34.8 x 27.0 inside 42.25 x 31. The Svg keeps the
 * ~2-unit vertical bearing so the VStack's 12 gap to the label matches iOS; the
 * previous glyphs were drawn edge-to-edge in a 30x30 box, which is why they read
 * as blockier and squarer than iOS's.
 *
 * Knockouts are filled with `colors.white` — the option card's own fill — because
 * `react-native-svg` has no "erase" and the card behind is white.
 */
function CameraGlyph() {
  return (
    <Svg width={s(36)} height={s(32)} viewBox="0 0 36 32">
      {/* Body: corner radius 3.8, top edge at 6.4, with the viewfinder hump
          flaring out of it at x 8.8..27.2 and cresting flat from 14.6 to 21.2. */}
      <Path
        d="M4 6.4h4.8c1.4 0 2.6-3.8 5.8-4.4h6.8c3.2.6 4.4 4.4 5.8 4.4H32a3.8 3.8 0 013.8 3.8v15.8A3.8 3.8 0 0132 29.8H4A3.8 3.8 0 01.2 26V10.2A3.8 3.8 0 014 6.4z"
        fill={colors.text}
      />
      {/* Lens: iOS draws a ring — measured outer r 7.9, core r 5.7, centre (17.9, 15.6). */}
      <Circle cx={17.9} cy={17.6} r={7.9} fill={colors.white} />
      <Circle cx={17.9} cy={17.6} r={5.7} fill={colors.text} />
      {/* Flash dot: centre (30.25, 9.4), r 1.75. */}
      <Circle cx={30.3} cy={11.4} r={1.75} fill={colors.white} />
    </Svg>
  );
}

function GalleryGlyph() {
  return (
    <Svg width={s(34.8)} height={s(31)} viewBox="0 0 34.8 31">
      {/* Frame: 34.8 x 27 at corner radius 4.0. */}
      <Path d="M4 2h26.8a4 4 0 014 4v19a4 4 0 01-4 4H4a4 4 0 01-4-4V6a4 4 0 014-4z" fill={colors.text} />
      {/* Sun: centre (11.1, 10) r 3.5. */}
      <Circle cx={11.1} cy={12} r={3.5} fill={colors.white} />
      {/* Landscape: small left peak, tall right peak, and the base band —
          x 2.5..32.0, bottom 24.4, bottom corners rounded r 2. */}
      <Path d="M8.8 18.2l5.1 3.3 9.6-6.7 8.5 6.8v2.8a2 2 0 01-2 2H4.5a2 2 0 01-2-2v-2.8z" fill={colors.white} />
    </Svg>
  );
}

/** iOS `ProfileFormCards`: the Member Name card (20-char cap + errors) and the 6-column avatar grid with add-photo and custom-photo cells. */
export function ProfileFormCards({ name, setName, avatar, setAvatar, photoData, setPhotoData, nameError, onAddPhoto }: { name: string; setName(value: string): void; avatar: string; setAvatar(value: string): void; photoData?: string; setPhotoData(value: string | undefined): void; nameError: string | null; onAddPhoto(): void }) {
  return (
    <View style={styles.formCards}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Member Name*</Text>
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={value => setName(value.slice(0, NAME_LIMIT))}
            placeholder="Enter person name"
            placeholderTextColor={`${colors.text}66`}
            style={styles.fieldInput}
            selectionColor={colors.purple}
          />
        </View>
        {nameError ? <Text style={styles.error}>{nameError}</Text> : name.length >= NAME_LIMIT ? <Text style={styles.error}>Maximum {NAME_LIMIT} characters</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Choose Avtar</Text>
        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddPhoto(); }} style={styles.addPhoto}>
              <AppImage source={Images.plusIcon} resizeMode="contain" style={styles.addPhotoIcon} />
            </Pressable>
          </View>
          {photoData !== undefined && (
            <View style={styles.gridCell}>
              <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAddPhoto(); }}>
                <AppImage source={{ uri: `data:image/jpeg;base64,${photoData}` }} style={[styles.avatar, styles.avatarSelected]} />
                <SelectedBadge />
              </Pressable>
            </View>
          )}
          {avatarImages.map((source, index) => {
            const selected = photoData === undefined && avatar === avatarNames[index];
            return (
              <View key={avatarNames[index]} style={styles.gridCell}>
                <Pressable onPress={() => { void Haptics.selectionAsync(); setAvatar(avatarNames[index]); setPhotoData(undefined); }}>
                  <AppImage source={source} style={[styles.avatar, selected && styles.avatarSelected]} />
                  {selected && <SelectedBadge />}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** iOS selection badge: purple check circle notched into the avatar's top-trailing corner. */
function SelectedBadge() {
  return (
    <View style={styles.badge}>
      <Svg width={s(9)} height={s(7)} viewBox="0 0 10 8">
        <Path d="M0.8 4.3 L3.8 7.2 L9.2 0.8" stroke={colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

/** iOS `CreateProfileSheet`: 80%-height sheet with the profile form and a Create/Save capsule. */
export function CreateProfileSheet({ title, initialName = '', initialAvatar = 'member1', initialPhotoData, isDuplicateName, onSave, onClose }: { title: string; initialName?: string; initialAvatar?: string; initialPhotoData?: string; isDuplicateName(name: string): boolean; onSave(name: string, avatar: string, photoData?: string): void; onClose(): void }) {
  return (
    <BottomSheet onClose={onClose} height={screen.height * 0.8} bunny="leading">
      <CreateProfileBody title={title} initialName={initialName} initialAvatar={initialAvatar} initialPhotoData={initialPhotoData} isDuplicateName={isDuplicateName} onSave={onSave} />
    </BottomSheet>
  );
}

function CreateProfileBody({ title, initialName, initialAvatar, initialPhotoData, isDuplicateName, onSave }: { title: string; initialName: string; initialAvatar: string; initialPhotoData?: string; isDuplicateName(name: string): boolean; onSave(name: string, avatar: string, photoData?: string): void }) {
  const insets = useSafeAreaInsets();
  const { close } = useSheet();
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar || 'member1');
  const [photoData, setPhotoData] = useState<string | undefined>(initialPhotoData);
  const [attempted, setAttempted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const trimmed = name.trim();
  const duplicate = Boolean(trimmed) && isDuplicateName(trimmed);
  const nameError = attempted && !trimmed ? 'Member name is required.' : duplicate ? 'A member with this name already exists.' : null;
  const canSave = Boolean(trimmed) && !duplicate;

  const save = () => {
    setAttempted(true);
    if (!canSave) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close(() => onSave(trimmed, avatar, photoData));
  };

  return (
    <>
      <SheetHeader title={title} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        <ProfileFormCards name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} photoData={photoData} setPhotoData={setPhotoData} nameError={nameError} onAddPhoto={() => setShowOptions(true)} />
      </ScrollView>
      <View style={[styles.formFooter, { paddingBottom: sheetFooterPad(30, insets.bottom) }]}>
        <CapsuleCTA label={title === 'Edit Profile' ? 'Save' : 'Create'} onPress={save} disabled={!canSave} dimWhenDisabled={0.5} />
      </View>
      {showOptions && <SelectOptionSheet onPicked={setPhotoData} onClose={() => setShowOptions(false)} />}
    </>
  );
}

export { avatarSource };

const styles = StyleSheet.create({
  optionRow: { flexDirection: 'row', gap: s(15), paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(55) },
  optionCard: { flex: 1, height: s(110), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', gap: s(12), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  optionLabel: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: colors.text },
  formCards: { gap: s(15) },
  formScroll: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(20) },
  formFooter: { paddingHorizontal: s(25), paddingTop: s(6), paddingBottom: s(30) },
  card: { padding: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(10), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  cardLabel: { ...font('medium', 14), color: `${colors.text}CC` },
  field: { height: s(48), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(14), justifyContent: 'center' },
  fieldInput: { ...font('regular', 14), color: colors.text, padding: 0 },
  error: { ...font('regular', 12), color: '#FF6262' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(9), marginTop: s(5) },
  gridCell: { width: `${100 / 6}%`, alignItems: 'center' },
  addPhoto: { width: s(45), height: s(45), borderRadius: s(22.5), backgroundColor: `${colors.purple}14`, borderWidth: 1.2, borderStyle: 'dashed', borderColor: `${colors.purple}80`, alignItems: 'center', justifyContent: 'center' },
  addPhotoIcon: { width: s(20), height: s(20) },
  avatar: { width: s(45), height: s(45), borderRadius: s(22.5) },
  avatarSelected: { borderWidth: 2, borderColor: colors.purple },
  badge: { position: 'absolute', top: -s(3), right: -s(3), width: s(18), height: s(18), borderRadius: s(9), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.background },
});
