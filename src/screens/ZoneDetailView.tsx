import React, { useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { ChoreCard, ChoreMenu, type ChoreMenuRequest, type MenuEntry } from '@/components/ChoreCardKit';
import { BlinkingBunny, BottomFade, CapsuleCTA, CircleButton, PressScale, SoftGlow } from '@/components/motion';
import { ProLimitPopup, type ProLimitKind } from '@/components/ProLimitPopup';
import { adminOnlyAlert, ADMIN_ONLY_ZONES } from '@/components/alerts';
import { limitReached, useChores, type Chore } from '@/services/ChoreContext';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { useHousehold } from '@/services/HouseholdContext';
import { usePurchases } from '@/services/PurchaseManager';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AppImage } from '@/components/AppImage';

/** iOS `ZoneDetailView`: centered title bar, zone dropdown menu, search + Due/Completed segmented pager, iOS chore cards with per-chore menus, empty state with the blinking bunny. */
export function ZoneDetailView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ZoneDetail'>) {
  const zoneName = route.params.zone;
  const insets = useSafeAreaInsets();
  const store = useChores();
  const { members, myMemberId } = useHousehold();
  const { hasPro } = usePurchases();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [openMenu, setOpenMenu] = useState<ChoreMenuRequest | null>(null);
  const [limit, setLimit] = useState<ProLimitKind | null>(null);
  const config = usePaywallConfig();
  const pager = useRef<ScrollView>(null);
  const thumb = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const SearchIcon = Images.choreSearchIcon;
  const MoreIcon = Images.moreVerticalIcon;

  const isAdmin = members.find(member => member.id === myMemberId)?.isAdmin ?? false;
  const zoneChores = useMemo(() => store.todaysChores.filter(chore => chore.zoneName === zoneName), [store.todaysChores, zoneName]);
  const chores = (index: number) => {
    const byTab = zoneChores.filter(chore => (index === 0 ? !store.isDoneToday(chore) : store.isDoneToday(chore)));
    const query = search.trim().toLowerCase();
    return query ? byTab.filter(chore => chore.name.toLowerCase().includes(query)) : byTab;
  };
  const created = store.createdZones.find(zone => zone.name === zoneName);

  const toggleMenu = (open: boolean) => {
    setShowMenu(open);
    Animated.timing(menuOpacity, { toValue: open ? 1 : 0, duration: 150, useNativeDriver: true }).start();
  };
  const selectTab = (index: number) => {
    void Haptics.selectionAsync();
    setTab(index);
    setOpenMenu(null);
    const stiffness = (2 * Math.PI / 0.35) ** 2;
    Animated.spring(thumb, { toValue: index, stiffness, damping: 2 * 0.85 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
    pager.current?.scrollTo({ x: index * width, animated: true });
  };

  const requireAdmin = () => {
    if (isAdmin) return true;
    adminOnlyAlert(ADMIN_ONLY_ZONES);
    return false;
  };
  const confirmDeleteZone = () => {
    Alert.alert('Delete Zone?', `This will remove "${zoneName}" and all of its chores. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); void store.deleteZone(zoneName); navigation.goBack(); } },
    ]);
  };
  const confirmDeleteChore = (chore: Chore) => {
    Alert.alert('Delete Chore?', `This will permanently delete "${chore.name}". This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); void store.deleteChore(chore); } },
    ]);
  };

  const menuChore = openMenu ? zoneChores.find(chore => chore.id === openMenu.choreId) : undefined;
  const choreEntries = (chore: Chore): MenuEntry[] => store.isDoneToday(chore)
    ? [
      { key: 'edit', title: 'Edit Chore', icon: Images.editZoneIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('ChoreDetail', { choreId: chore.id, editing: true }); } },
      { key: 'undo', title: 'Undo Chore', icon: Images.undoIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.setCompleted(chore, false); } },
      { key: 'delete', title: 'Delete Chore', icon: Images.deleteIcon, titleColor: '#FF6262', action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); confirmDeleteChore(chore); } },
    ]
    : [
      { key: 'done', title: 'Mark as Done', icon: Images.markDoneIcon, action: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.setCompleted(chore, true); } },
      { key: 'skip', title: 'Skip Chore', icon: Images.skipIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.skipToday(chore); } },
      { key: 'edit', title: 'Edit Chore', icon: Images.editZoneIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('ChoreDetail', { choreId: chore.id, editing: true }); } },
      { key: 'delete', title: 'Delete Chore', icon: Images.deleteIcon, titleColor: '#FF6262', action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); confirmDeleteChore(chore); } },
    ];
  const zoneEntries: MenuEntry[] = [
    { key: 'editZone', title: 'Edit Zone', icon: Images.editZoneIcon, dim: !isAdmin, action: () => { if (!requireAdmin()) return; void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('CreateZone', created ? { zoneId: created.id } : { convertFrom: zoneName }); } },
    { key: 'markAll', title: 'Mark all Done', icon: Images.markDoneIcon, action: () => { if (!hasPro) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLimit('markAllDone'); } else { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.markAllDone(zoneName); } } },
    { key: 'deleteZone', title: 'Delete Zone', icon: Images.deleteIcon, titleColor: '#FF6262', dim: !isAdmin, action: () => { if (!requireAdmin()) return; void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); confirmDeleteZone(); } },
  ];

  /** iOS gates Add Chore on the Remote Config chore limit before pushing. */
  const addChore = () => {
    if (limitReached(store.choreCreatedCount, config.freeChoreLimit, hasPro)) setLimit('chore');
    else navigation.push('AddChore', { zone: zoneName });
  };

  const listPage = (index: number) => (
    <ScrollView key={index} showsVerticalScrollIndicator={false} style={{ width }} contentContainerStyle={styles.list}>
      {chores(index).map(chore => (
        <ChoreCard
          key={chore.id}
          chore={chore}
          done={index === 1}
          overdue={store.isOverdueNow(chore)}
          showTimeWhenDone
          showDueBadge
          onPress={() => navigation.push('ChoreDetail', { choreId: chore.id })}
          onMenu={setOpenMenu}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.root}>

      {zoneChores.length === 0 ? (
        <>
          <View style={styles.emptyRoot}>
            <View style={styles.emptyStack}>
              <View style={styles.mascot}>
                <SoftGlow color="#FFC7CE" opacity={0.3} diameter={134.8} style={styles.mascotGlow} />
                <BlinkingBunny />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={[styles.emptyTitle, { width: s(293) }]}>Wow… a perfect {zoneName.toLowerCase()}? Impossible.</Text>
                <Text style={[styles.emptySubtitle, { width: s(254) }]}>Add a chore to keep this space clean, organized, and stress-free.</Text>
              </View>
              <CapsuleCTA label="Add Chore" showPlus width={254} height={44} fontSize={15} onPress={addChore} />
            </View>
          </View>
          <BottomFade />
        </>
      ) : (
        <View style={styles.populated}>
          <View style={{ height: s(107) }} />
          <View style={styles.search}>
            <View style={styles.searchIcon}><SearchIcon width={s(20)} height={s(20)} /></View>
            <TextInput value={search} onChangeText={setSearch} placeholder="Search Chore" placeholderTextColor={`${colors.text}80`} style={styles.searchField} selectionColor={colors.purple} />
            {search.length > 0 && <Pressable hitSlop={8} onPress={() => setSearch('')}><Text style={styles.clear}>×</Text></Pressable>}
          </View>
          <View style={styles.segment}>
            <Animated.View style={[styles.thumb, { width: (width - s(30) - s(10)) / 2, transform: [{ translateX: thumb.interpolate({ inputRange: [0, 1], outputRange: [0, (width - s(30) - s(10)) / 2] }) }] }]} />
            {['Due', 'Completed'].map((label, index) => (
              <Pressable key={label} onPress={() => selectTab(index)} style={styles.segmentButton}>
                <Text style={[styles.segmentLabel, tab === index && styles.segmentLabelOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={event => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              if (index !== tab) selectTab(index);
            }}
            style={styles.pager}
          >
            {listPage(0)}
            {listPage(1)}
          </ScrollView>
          <View style={styles.bottomBar} pointerEvents="box-none">
            <LinearGradient colors={[`${colors.background}00`, colors.background]} style={styles.bottomFade} pointerEvents="none" />
            <View style={[styles.bottomCta, { paddingBottom: Math.max(s(40), insets.bottom + s(16)) }]}>
              <CapsuleCTA label="Add New Chore" showPlus onPress={addChore} />
            </View>
          </View>
        </View>
      )}

      <View style={styles.titleBar}>
        <Text style={styles.title}>{zoneName}</Text>
        <View style={styles.titleButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.titleIcon} />
          </CircleButton>
          <CircleButton onPress={() => toggleMenu(!showMenu)}>
            <MoreIcon width={s(22)} height={s(22)} />
          </CircleButton>
        </View>
      </View>

      {showMenu && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable onPress={() => toggleMenu(false)} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.zoneMenu, { opacity: menuOpacity }]}>
            {zoneEntries.map((entry, index) => (
              <React.Fragment key={entry.key}>
                {index > 0 && <View style={styles.menuDivider} />}
                <Pressable onPress={() => { toggleMenu(false); entry.action(); }} style={[styles.menuRow, entry.dim && { opacity: 0.4 }]}>
                  <entry.icon width={s(20)} height={s(20)} />
                  <Text style={[styles.menuTitle, entry.titleColor ? { color: entry.titleColor } : null]}>{entry.title}</Text>
                </Pressable>
              </React.Fragment>
            ))}
          </Animated.View>
        </View>
      )}

      {openMenu && menuChore && <ChoreMenu top={openMenu.top} entries={choreEntries(menuChore)} onClose={() => setOpenMenu(null)} />}
      {limit && <ProLimitPopup kind={limit} onUnlock={() => { setLimit(null); navigation.push('Paywall'); }} onClose={() => setLimit(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  titleBar: { position: 'absolute', top: s(59), left: s(15), right: s(15), alignItems: 'center', justifyContent: 'center' },
  title: { ...font('semibold', 22), color: colors.text },
  titleButtons: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleIcon: { width: s(20), height: s(20) },
  populated: { flex: 1 },
  search: { marginHorizontal: s(15), height: s(42), borderRadius: s(21), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), gap: s(10) },
  searchIcon: { opacity: 0.3 },
  searchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  clear: { ...font('regular', 20), color: `${colors.text}4D` },
  segment: { marginHorizontal: s(15), marginTop: s(15), height: s(50), borderRadius: s(25), borderWidth: 1, borderColor: `${colors.text}1A`, padding: s(5), flexDirection: 'row' },
  thumb: { position: 'absolute', left: s(5), top: s(5), bottom: s(5), borderRadius: s(20), backgroundColor: colors.purple },
  segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { ...font('medium', 14), color: `${colors.text}80` },
  segmentLabelOn: { ...font('semibold', 14), color: colors.white },
  pager: { flex: 1 },
  list: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(150), gap: s(10) },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomFade: { height: s(60) },
  bottomCta: { backgroundColor: colors.background, paddingHorizontal: s(25), paddingBottom: s(40) },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStack: { alignItems: 'center', gap: s(28) },
  mascot: { alignItems: 'center', justifyContent: 'center' },
  mascotGlow: { position: 'absolute' },
  emptyCopy: { gap: s(10), alignItems: 'center' },
  emptyTitle: { ...font('semibold', 18), color: colors.text, textAlign: 'center' },
  emptySubtitle: { ...font('regular', 15), color: `${colors.text}99`, textAlign: 'center' },
  zoneMenu: { position: 'absolute', top: s(117.79), right: s(15), width: s(161), borderRadius: s(16), backgroundColor: colors.background, padding: s(16), boxShadow: [{ offsetX: s(-5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  menuDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginVertical: s(12) },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  menuTitle: { ...font('regular', 14), color: colors.text },
});
