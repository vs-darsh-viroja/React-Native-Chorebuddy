import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph } from '@/components/glyphs';
import { BottomFade, CapsuleCTA, CircleButton } from '@/components/motion';
import { predefinedZoneSections, zoneIcon, zoneIcons, zonePalettes } from '@/models/zones';
import { useChores } from '@/services/ChoreContext';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AppImage } from '@/components/AppImage';

/** iOS `CreateZoneView`: name + live icon preview card, 6-column color and icon grids with drawn checkmarks, purple-edge save capsule over a bottom fade. */
export function CreateZoneView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'CreateZone'>) {
  const insets = useSafeAreaInsets();
  const ctaBottom = Math.max(s(40), insets.bottom + s(16));
  const store = useChores();
  const editing = store.createdZones.find(zone => zone.id === route.params?.zoneId);
  /**
   * Editing one of the built-in catalog zones: there is no zone document to
   * update, so saving converts it into a real zone and hides the catalog entry.
   */
  const convertFrom = route.params?.convertFrom;
  const initialIcon = editing ? Math.max(0, Number(editing.iconAsset.replace(/\D/g, '')) - 1) : 0;
  const [name, setName] = useState(editing?.name ?? convertFrom ?? '');
  const [colorIndex, setColor] = useState(editing?.colorIndex ?? 0);
  const [iconIndex, setIcon] = useState(initialIcon);

  /** iOS `existingZoneNames`: every predefined + created name, minus the original being edited. */
  const originalName = (editing?.name ?? convertFrom ?? '').trim().toLowerCase();
  const existing = useMemo(() => {
    const names = new Set([
      ...predefinedZoneSections.flatMap(section => section.items.map(item => item.name.toLowerCase())),
      ...store.createdZones.filter(zone => zone.id !== editing?.id).map(zone => zone.name.toLowerCase()),
    ]);
    names.delete(originalName);
    return names;
  }, [store.createdZones, editing?.id, originalName]);
  const duplicate = Boolean(name.trim()) && existing.has(name.trim().toLowerCase());
  const canSave = Boolean(name.trim()) && !duplicate;
  const palette = zonePalettes[colorIndex];

  const save = async () => {
    if (!canSave) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = name.trim();
    const icon = `zone${iconIndex + 1}Icon`;
    if (editing) await store.updateZone(editing, next, icon, colorIndex);
    else if (convertFrom) await store.convertPredefinedZone(convertFrom, next, icon, colorIndex);
    else await store.saveZone(next, icon, colorIndex);
    // A rename moves the zone's chores to the new name, so send the detail screen
    // that was left behind to the renamed zone instead of an empty stale one.
    const previous = editing?.name ?? convertFrom;
    if (previous && previous !== next) navigation.navigate('ZoneDetail', { zone: next });
    else navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{editing || convertFrom ? 'Edit Zone' : 'Create Zone'}</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.backIcon} />
          </CircleButton>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <View style={styles.nameColumn}>
              <Text style={styles.label}>Zone Name*</Text>
              <View style={styles.field}>
                <TextInput value={name} onChangeText={setName} placeholder="Enter zone name" placeholderTextColor={`${colors.text}66`} style={styles.fieldInput} selectionColor={colors.purple} />
              </View>
              {duplicate && <Text style={styles.error}>A zone with this name already exists</Text>}
            </View>
            <View style={styles.previewColumn}>
              <Text style={styles.label}>Icon Preview</Text>
              <LinearGradient colors={[palette.top, palette.bottom]} style={[styles.preview, { borderColor: palette.border }]}>
                <AppImage source={zoneIcon(`zone${iconIndex + 1}Icon`)} resizeMode="contain" style={styles.previewIcon} />
              </LinearGradient>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Select Color</Text>
          <View style={styles.grid}>
            {zonePalettes.map((option, index) => (
              <Pressable key={index} onPress={() => { void Haptics.selectionAsync(); setColor(index); }} style={styles.cell}>
                <LinearGradient colors={[option.top, option.bottom]} style={[styles.swatch, { borderColor: option.border }]}>
                  {index === colorIndex && (
                    <View style={styles.swatchCheck}>
                      <CheckmarkGlyph width={s(9)} height={s(7)} color={colors.text} strokeWidth={1.5} />
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Select Icon</Text>
          <View style={styles.grid}>
            {zoneIcons.map((source, index) => (
              <Pressable key={index} onPress={() => { void Haptics.selectionAsync(); setIcon(index); }} style={styles.cell}>
                <View style={[styles.iconTile, index === iconIndex && styles.iconTileOn]}>
                  <AppImage source={source} resizeMode="contain" style={styles.tileIcon} />
                </View>
                {index === iconIndex && (
                  <View style={styles.iconCheck}>
                    <CheckmarkGlyph width={s(9)} height={s(7)} color={colors.background} strokeWidth={1.5} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* iOS: 183.5 fade to the window bottom with the button 40 above it, i.e. the
          fade reaches 143.5 past the button. The Android button is lifted clear of
          the navigation bar, so the fade grows by the same amount. */}
      <BottomFade height={183.5} extra={ctaBottom - s(40)} />
      <View style={[styles.footer, { bottom: ctaBottom }]}>
        <CapsuleCTA label={editing || convertFrom ? 'Save Changes' : 'Create Zone'} onPress={() => { void save(); }} disabled={!canSave} dimWhenDisabled={0.8} />
      </View>
    </View>
  );
}

const CELL = `${100 / 6}%`;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(59), paddingHorizontal: s(15), height: s(99), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 22), color: colors.text },
  headerButtons: { position: 'absolute', top: s(59), left: s(15), right: s(15), flexDirection: 'row' },
  backIcon: { width: s(20), height: s(20) },
  content: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(150), gap: s(15) },
  card: { borderRadius: s(16), padding: s(15), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(14), boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(15), color: 'rgba(0,0,0,0.1)' }] },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10) },
  nameColumn: { flex: 1, gap: s(10) },
  previewColumn: { alignItems: 'center', gap: s(10) },
  label: { ...font('medium', 14), color: colors.text },
  field: { height: s(48), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(14), justifyContent: 'center' },
  fieldInput: { ...font('regular', 14), color: colors.text, padding: 0 },
  error: { ...font('regular', 12), color: '#FF6262' },
  preview: { width: s(48), height: s(48), borderRadius: s(16), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewIcon: { width: s(30), height: s(30), tintColor: colors.white },
  /**
   * iOS is `LazyVGrid(columns: 6 x GridItem(.flexible(), spacing: 9), spacing: 9)`
   * with each item `.aspectRatio(1, contentMode: .fit)` — 6 SQUARES of
   * (315 - 5x9)/6 = 45, with the 9 gutters only BETWEEN columns.
   *
   * The previous port put `aspectRatio: 1` on the CELL and then padded it
   * horizontally by 4.5 each side, so the item inside came out 9 units TALLER
   * than wide (a portrait rounded rect). The aspect ratio has to sit on the item
   * itself; the negative grid margin cancels the outer half-gutters so the item
   * measures exactly iOS's 45 rather than 43.5.
   */
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: s(9), marginHorizontal: -s(4.5) },
  cell: { width: CELL as `${number}%`, paddingHorizontal: s(4.5) },
  swatch: { aspectRatio: 1, borderRadius: s(16), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swatchCheck: { width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  iconTile: { aspectRatio: 1, borderRadius: s(14), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center' },
  iconTileOn: { borderWidth: 1.5, borderColor: colors.purple },
  tileIcon: { width: s(26), height: s(26) },
  iconCheck: { position: 'absolute', top: s(-6), right: s(-1.5), width: s(20), height: s(20), borderRadius: s(10), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: s(24.5), right: s(24.5), bottom: s(40) },
});
