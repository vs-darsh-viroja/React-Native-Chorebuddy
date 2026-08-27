import React, { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { ChoreCard, ChoreMenu, MarkAllCheck, nowTime, type ChoreMenuRequest, type MenuEntry } from '@/components/ChoreCardKit';
import { ChoreCalendarGlyph } from '@/components/glyphs';
import { BlinkingBunny, BottomFade, CapsuleCTA, CircleButton, PressScale, SlideInCard, SoftGlow, useFloat } from '@/components/motion';
import { GradientText } from '@/screens/onboarding/pages/parts';
import { HomeGiftBanner } from '@/components/GiftBanner';
import { ProLimitPopup, type ProLimitKind } from '@/components/ProLimitPopup';
import { useChores, type Chore } from '@/services/ChoreContext';
import { usePurchases } from '@/services/PurchaseManager';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';
import ProgressBannerBg from '../../assets/images/bannerImg.svg';

const todayDate = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** iOS `HomeView`: header, then empty / chore-free / today-list bodies, with the anchored per-chore dropdown menu overlaid on top. */
export function HomeView() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useChores();
  const { hasPro } = usePurchases();
  const [openMenu, setOpenMenu] = useState<ChoreMenuRequest | null>(null);
  const [cardsAppeared, setCardsAppeared] = useState(false);
  const [limit, setLimit] = useState<ProLimitKind | null>(null);

  const today = store.todaysChores;
  const pending = today.filter(chore => !store.isDoneToday(chore));
  const completed = today.filter(store.isDoneToday);
  const hasChores = store.chores.length > 0;
  const allDone = today.length > 0 && pending.length === 0;

  useEffect(() => {
    setCardsAppeared(false);
    const timer = setTimeout(() => setCardsAppeared(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const onAddChore = () => navigation.push('AddChore');
  /** iOS `onLockedMarkAll`: free users get the ProLimitPopup, not the paywall directly. */
  const onMarkAll = () => {
    if (!hasPro) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLimit('markAllDone'); }
    else if (allDone) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.markAllTodayUndone(); }
    else { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.markAllTodayDone(); }
  };

  const menuChore = openMenu ? today.find(chore => chore.id === openMenu.choreId) : undefined;
  const menuEntries = (chore: Chore): MenuEntry[] => store.isDoneToday(chore)
    ? [
      { key: 'undo', title: 'Undo Chore', icon: Images.undoIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.setCompleted(chore, false); } },
      { key: 'edit', title: 'Edit Chore', icon: Images.editZoneIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('ChoreDetail', { choreId: chore.id, editing: true }); } },
    ]
    : [
      { key: 'done', title: 'Mark as Done', icon: Images.markDoneIcon, action: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); void store.setCompleted(chore, true); } },
      { key: 'edit', title: 'Edit Chore', icon: Images.editZoneIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('ChoreDetail', { choreId: chore.id, editing: true }); } },
      { key: 'skip', title: 'Skip Chore', icon: Images.skipIcon, action: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void store.skipToday(chore); } },
    ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppImage source={Images.choreBuddyLogo} resizeMode="stretch" style={styles.logo} />
        <View style={styles.headerActions}>
          <CircleButton onPress={() => navigation.push('Settings')}>
            <AppImage source={Images.settingsIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          {!hasPro && (
            <CircleButton onPress={() => navigation.push('Paywall')} background={colors.purple} borderColor={colors.white}>
              <AppImage source={Images.crownIcon} resizeMode="contain" style={styles.headerIcon} />
            </CircleButton>
          )}
        </View>
      </View>

      {!hasChores ? (
        <EmptyBody onAdd={onAddChore} />
      ) : today.length === 0 ? (
        <ChoreFreeBody onAdd={onAddChore} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <ProgressCard completed={store.todaysCompletedCount} total={today.length} />
          <HomeGiftBanner />
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Today’s Chores</Text>
            <Pressable onPress={onMarkAll} style={styles.markAll}>
              <Text style={styles.markAllText}>Mark all done</Text>
              <MarkAllCheck allDone={allDone} />
            </Pressable>
          </View>
          <View style={styles.cards}>
            {pending.map((chore, index) => (
              <SlideInCard key={chore.id} index={index} appeared={cardsAppeared}>
                <ChoreCard chore={chore} done={false} onPress={() => navigation.push('ChoreDetail', { choreId: chore.id })} onMenu={setOpenMenu} />
              </SlideInCard>
            ))}
          </View>
          {completed.length > 0 && (
            <>
              <View style={styles.celebrate}>
                <GradientText value={`🎉  Great job! ${completed.length} ${completed.length === 1 ? 'chore' : 'chores'} completed today`} style={{ ...font('medium', 15) }} ramp={['#FB4786', '#FD6A96']} />
              </View>
              <View style={styles.cards}>
                {completed.map((chore, index) => (
                  <SlideInCard key={chore.id} index={pending.length + index} appeared={cardsAppeared}>
                    <ChoreCard chore={chore} done onPress={() => navigation.push('ChoreDetail', { choreId: chore.id })} onMenu={setOpenMenu} />
                  </SlideInCard>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {openMenu && menuChore && <ChoreMenu top={openMenu.top} entries={menuEntries(menuChore)} onClose={() => setOpenMenu(null)} />}
      {limit && <ProLimitPopup kind={limit} onUnlock={() => { setLimit(null); navigation.push('Paywall'); }} onClose={() => setLimit(null)} />}
    </View>
  );
}

/** iOS `progressCard`: FDF2FD panel, pink radial glow bleeding off the left edge, floating heart bunny, calendar badge, N/M figures, 151pt gradient bar. */
function ProgressCard({ completed, total }: { completed: number; total: number }) {
  const float = useFloat(8, 1.8);
  const fraction = total > 0 ? completed / total : 0;
  // The card is fluid (scroll width minus 15pt margins). On phones that equals
  // the SVG's design width s(345) exactly; on iPad the SVG stretches to fit.
  const cardWidth = useWindowDimensions().width - 2 * s(15);
  return (
    <View style={styles.progressWrap}>
      {/* Figma-exported card background (bannerImg.svg): #FDF2FD fill, gradient
          stroke, top-left blurred glow, fade-out toward the bunny, drop shadow.
          The SVG's card rect sits at (4,2) inside a 353×158 canvas, so it is
          offset by (−4, −2) from the card position to land exactly. */}
      <ProgressBannerBg width={cardWidth + s(8)} height={s(158)} preserveAspectRatio="none" style={styles.progressBanner} />
      <AnimatedAppImage source={Images.bunnyHeartImg} resizeMode="stretch" style={[styles.heartBunny, { transform: [{ translateY: float }] }]} />
      <View style={styles.progressContent}>
        <View style={styles.progressHead}>
          <View style={styles.calendarBadge}>
            <ChoreCalendarGlyph size={s(22.5)} color="#FF819E" />
          </View>
          <View style={styles.progressTitleBlock}>
            <Text style={styles.progressTitle}>Today’s Progress</Text>
            <Text style={styles.progressDate}>{todayDate()}</Text>
          </View>
        </View>
        <View style={styles.progressFigures}>
          <View style={styles.countRow}>
            <Text style={styles.countMain}>{completed}</Text>
            <Text style={styles.countTotal}>/{total}</Text>
          </View>
          <Text style={styles.countCaption}>{total > 0 ? 'Chores Completed' : 'Chores'}</Text>
          <View style={styles.track}>
            <LinearGradient colors={['#FB4786', '#FD6A96']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.fill, { width: Math.max(0, s(151) * fraction) }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** iOS `emptyBody`: blinking bunny over a soft purple glow, playful copy, 180pt Add Chore capsule, all lifted 50pt, with the bottom fade. */
function EmptyBody({ onAdd }: { onAdd(): void }) {
  return (
    <View style={styles.emptyRoot}>
      <View style={[styles.emptyStack, { transform: [{ translateY: s(-50) }] }]}>
        <View style={styles.mascot}>
          <SoftGlow color={colors.purple} opacity={0.12} style={styles.mascotGlow} />
          <BlinkingBunny />
        </View>
        <View style={styles.emptyCopy}>
          <Text style={styles.emptyTitle}>No Chores Yet!</Text>
          <Text style={styles.emptySubtitle}>Tap ‘+’ and let’s pretend to be productive</Text>
        </View>
        <CapsuleCTA label="Add Chore" showPlus width={180} height={44} fontSize={15} onPress={onAdd} />
      </View>
      <BottomFade />
    </View>
  );
}

/** iOS `choreFreeBody`: zeroed progress card on top, centered break copy lifted 40pt. */
function ChoreFreeBody({ onAdd }: { onAdd(): void }) {
  return (
    <View style={styles.freeRoot}>
      <View style={styles.freeTop}>
        <ProgressCard completed={0} total={0} />
        <HomeGiftBanner />
      </View>
      <View style={styles.freeCenter}>
        <View style={styles.emptyStack}>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Looks like today is{'\n'}chore-free.</Text>
            <Text style={styles.emptySubtitle}>Enjoy your well-deserved break{'\n'}and come back tomorrow.</Text>
          </View>
          <CapsuleCTA label="Add Chore" showPlus width={180} height={44} fontSize={15} onPress={onAdd} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(59), paddingHorizontal: s(15), paddingBottom: s(8), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: s(158.25), height: s(48), marginTop: s(4.5) },
  headerActions: { flexDirection: 'row', gap: s(10) },
  headerIcon: { width: s(22), height: s(22) },
  scroll: { paddingHorizontal: s(15), paddingBottom: s(260) },
  progressWrap: { height: s(162), marginTop: s(12) },
  progressBanner: { position: 'absolute', left: s(-4), top: s(10) },
  heartBunny: { position: 'absolute', right: s(8), bottom: s(-10), width: s(102.7), height: s(160) },
  progressContent: { position: 'absolute', left: s(20), top: s(12) + s(17), right: 0, gap: s(12) },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  calendarBadge: { width: s(36), height: s(36), borderRadius: s(11.25), backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  progressTitleBlock: { gap: s(4) },
  // Explicit line heights + includeFontPadding:false — Android pads SF Pro
  // Rounded lines far taller than SwiftUI's metrics, which pushed the caption
  // and progress bar out the bottom of the 150pt card. Values are the design's
  // real SF Pro Rounded line boxes (fontSize x 1.193), read off the Figma node.
  progressTitle: { ...font('medium', 18), lineHeight: s(21.5), includeFontPadding: false, color: colors.text },
  progressDate: { ...font('regular', 11), lineHeight: s(13.1), includeFontPadding: false, color: `${colors.text}99` },
  progressFigures: { gap: s(9) },
  countRow: { flexDirection: 'row', alignItems: 'baseline' },
  countMain: { ...font('semibold', 30), lineHeight: s(35.8), includeFontPadding: false, color: colors.text },
  countTotal: { ...font('medium', 15), lineHeight: s(17.9), includeFontPadding: false, color: `${colors.text}66` },
  countCaption: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false, color: `${colors.text}80` },
  track: { width: s(151), height: s(8), borderRadius: s(4), backgroundColor: '#FF819E33', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: s(4) },
  listHeader: { marginTop: s(22), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { ...font('semibold', 16), color: colors.text },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  markAllText: { ...font('regular', 15), color: `${colors.text}80` },
  cards: { marginTop: s(15), gap: s(10) },
  celebrate: { marginTop: s(20), alignItems: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStack: { alignItems: 'center', gap: s(28) },
  mascot: { alignItems: 'center', justifyContent: 'center' },
  mascotGlow: { position: 'absolute' },
  emptyCopy: { gap: s(10), alignItems: 'center' },
  emptyTitle: { ...font('semibold', 18), color: colors.text, textAlign: 'center' },
  emptySubtitle: { ...font('regular', 15), color: `${colors.text}99`, textAlign: 'center' },
  freeRoot: { flex: 1 },
  freeTop: { paddingHorizontal: s(15) },
  freeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: s(-40) }] },
});
