import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { ZoneCalendarGlyph, ZonePlusGlyph } from '@/components/glyphs';
import { PressScale, SlideInCard } from '@/components/motion';
import { ProLimitPopup, type ProLimitKind } from '@/components/ProLimitPopup';
import { predefinedZoneSections, zoneIcon, zonePalettes, type ZoneDefinition, type ZoneSection } from '@/models/zones';
import { limitReached, useChores } from '@/services/ChoreContext';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { usePurchases } from '@/services/PurchaseManager';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AppImage } from '@/components/AppImage';

type ZoneStatus = { taskCount: number; overdueCount: number; badge: { text: string; color: string } | null };

/** iOS `ZoneView`: title bar with the Create Zone chip, search, then My Zones + predefined sections with live badges and slide-in cards. */
export function ZoneView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useChores();
  const [search, setSearch] = useState('');
  const [cardsAppeared, setCardsAppeared] = useState(false);
  const [limit, setLimit] = useState<ProLimitKind | null>(null);
  const config = usePaywallConfig();
  const { hasPro } = usePurchases();
  const SearchIcon = Images.choreSearchIcon;

  useEffect(() => {
    const timer = setTimeout(() => setCardsAppeared(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sections = useMemo(() => {
    const created: ZoneSection[] = store.createdZones.length
      ? [{ title: 'My Zones', items: store.createdZones.map(zone => ({ name: zone.name, iconAsset: zone.iconAsset, palette: zone.colorIndex % zonePalettes.length })) }]
      : [];
    const hidden = new Set(store.hiddenZones);
    const visibleDefaults = predefinedZoneSections
      .map(section => ({ ...section, items: section.items.filter(item => !hidden.has(item.name)) }))
      .filter(section => section.items.length);
    const query = search.trim().toLowerCase();
    return [...created, ...visibleDefaults]
      .map(section => ({ ...section, items: section.items.filter(item => !query || item.name.toLowerCase().includes(query)) }))
      .filter(section => section.items.length);
  }, [store.createdZones, store.hiddenZones, search]);

  /** iOS `merged(_:)`: no badge without chores today; Overdue beats N Today; All Done when nothing pending. */
  const statusFor = (name: string): ZoneStatus => {
    const todays = store.todaysChores.filter(chore => chore.zoneName === name);
    if (!todays.length) return { taskCount: 0, overdueCount: 0, badge: null };
    const pending = todays.filter(chore => !store.isDoneToday(chore));
    const overdueCount = pending.filter(store.isOverdueNow).length;
    const badge = pending.length === 0
      ? { text: 'All Done', color: colors.success }
      : overdueCount > 0
        ? { text: 'Overdue', color: colors.danger }
        : { text: `${pending.length} Today`, color: colors.blue };
    return { taskCount: todays.length, overdueCount, badge };
  };

  const baseIndex = (sectionIndex: number) => sections.slice(0, sectionIndex).reduce((sum, section) => sum + section.items.length, 0);

  return (
    <View style={styles.root}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Zone</Text>
        <PressScale
          onPress={() => {
            // iOS gates zone creation on the Remote Config free limit before pushing.
            if (limitReached(store.zoneCreatedCount, config.freeZoneLimit, hasPro)) setLimit('zone');
            else navigation.push('CreateZone');
          }}
          style={styles.createChip}
        >
          <View style={styles.createCircle}>
            <ZonePlusGlyph size={s(24)} color={colors.white} />
          </View>
          <Text style={styles.createText}>Create Zone</Text>
        </PressScale>
      </View>

      <View style={styles.search}>
        <View style={styles.searchIcon}><SearchIcon width={s(20)} height={s(20)} /></View>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search Area" placeholderTextColor={`${colors.text}80`} style={styles.searchField} selectionColor={colors.purple} />
        {search.length > 0 && (
          <Pressable hitSlop={8} onPress={() => setSearch('')}><Text style={styles.clear}>×</Text></Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCards}>
              {section.items.map((item, itemIndex) => (
                <SlideInCard key={item.name} index={baseIndex(sectionIndex) + itemIndex} appeared={cardsAppeared}>
                  <ZoneCard item={item} status={statusFor(item.name)} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('ZoneDetail', { zone: item.name }); }} />
                </SlideInCard>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {limit && <ProLimitPopup kind={limit} onUnlock={() => { setLimit(null); navigation.push('Paywall'); }} onClose={() => setLimit(null)} />}
    </View>
  );
}

/** iOS `ZoneCard`: 74pt row — gradient icon tile, name + task/overdue subtitle, trailing calendar badge. */
function ZoneCard({ item, status, onPress }: { item: ZoneDefinition; status: ZoneStatus; onPress(): void }) {
  const palette = zonePalettes[item.palette % zonePalettes.length];
  return (
    <PressScale onPress={onPress} haptic="none" style={styles.card}>
      <LinearGradient colors={[palette.top, palette.bottom]} style={[styles.tile, { borderColor: palette.border }]}>
        <AppImage source={zoneIcon(item.iconAsset)} resizeMode="contain" style={styles.tileIcon} />
      </LinearGradient>
      <View style={styles.cardCopy}>
        <Text style={styles.cardName}>{item.name}</Text>
        {status.taskCount === 0 ? (
          <Text style={styles.cardSub}>No Task</Text>
        ) : (
          <View style={styles.cardSubRow}>
            <Text style={styles.cardSubStrong}>{status.taskCount} Task</Text>
            {status.overdueCount > 0 && <Text style={styles.cardOverdue}>{status.overdueCount} Overdue</Text>}
          </View>
        )}
      </View>
      {status.badge && (
        <View style={[styles.badge, { backgroundColor: `${status.badge.color}1A` }]}>
          <ZoneCalendarGlyph size={s(14)} color={status.badge.color} />
          <Text style={[styles.badgeText, { color: status.badge.color }]}>{status.badge.text}</Text>
        </View>
      )}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBar: { paddingTop: s(59), paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...font('semibold', 24), color: colors.text },
  createChip: { height: s(36), borderRadius: s(18), paddingLeft: s(6), paddingRight: s(12), flexDirection: 'row', alignItems: 'center', gap: s(6), backgroundColor: `${colors.purple}1A`, borderWidth: 1, borderColor: `${colors.text}1A` },
  createCircle: { width: s(24), height: s(24), borderRadius: s(12), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  createText: { ...font('regular', 14), color: colors.text },
  search: { marginHorizontal: s(15), marginTop: s(20), height: s(42), borderRadius: s(21), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), gap: s(10) },
  searchIcon: { opacity: 0.3 },
  searchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  clear: { ...font('regular', 20), color: `${colors.text}4D` },
  content: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(140), gap: s(25) },
  section: { gap: s(8) },
  sectionTitle: { ...font('regular', 14), color: `${colors.text}80` },
  sectionCards: { gap: s(8) },
  card: { height: s(74), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', boxShadow: [{ offsetX: 0, offsetY: s(4), blurRadius: s(15), color: 'rgba(0,0,0,0.1)' }] },
  tile: { width: s(48), height: s(48), borderRadius: s(16), borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileIcon: { width: s(30), height: s(30), tintColor: colors.white },
  cardCopy: { flex: 1, marginLeft: s(15), gap: s(4) },
  cardName: { ...font('medium', 15), color: colors.text },
  cardSub: { ...font('regular', 12), color: `${colors.text}99` },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  cardSubStrong: { ...font('medium', 12), color: `${colors.text}99` },
  cardOverdue: { ...font('medium', 12), color: colors.danger },
  badge: { flexDirection: 'row', alignItems: 'center', gap: s(5), borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6), marginLeft: s(8) },
  badgeText: { ...font('medium', 12) },
});
