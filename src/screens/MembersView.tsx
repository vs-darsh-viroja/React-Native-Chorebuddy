import React, { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph, CopyGlyph, EditGlyph, MemberAddGlyph, ShareGlyph } from '@/components/glyphs';
import { BlinkingBunny, BottomFade, CapsuleCTA, CircleButton, PressScale, SlideInCard, SoftGlow } from '@/components/motion';
import { CreateProfileSheet, ProfileFormCards, SelectOptionSheet } from '@/components/ProfileSheets';
import { AvatarView } from '@/components/AvatarView';
import { adminOnlyAlert, ADMIN_ONLY_MEMBERS, ADMIN_ONLY_OWN_PROFILE } from '@/components/alerts';
import { useChores, type Chore } from '@/services/ChoreContext';
import { useHousehold, type HouseholdMember } from '@/services/HouseholdContext';
import { colors, font, s } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { AppImage } from '@/components/AppImage';
import { Crashlytics } from '@/services/Crashlytics';

const GREEN = '#2DA100';
const ORANGE = '#FB8C07';
const RED = '#FF5757';

/** Member mutations can be rejected by the rules (admin-only writes) or by our own guards — iOS surfaces those; never let one become a silent no-op. */
function reportMemberError(action: string) {
  return (error: unknown) => {
    Crashlytics.log(`MembersView: failed to ${action}`);
    Crashlytics.record(error);
    Alert.alert('Something went wrong', error instanceof Error ? error.message : `Could not ${action}. Please try again.`);
  };
}

export function MemberAvatar({ member, size }: { member: Pick<HouseholdMember, 'avatar' | 'photoData'>; size: number }) {
  return <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(size)} />;
}

/** iOS three-dot kebab: three 3pt dots stacked 2.5pt apart. */
function Kebab({ color = `${colors.text}80`, dim = false }: { color?: string; dim?: boolean }) {
  return (
    <View style={[styles.kebab, dim && { opacity: 0.4 }]}>
      {[0, 1, 2].map(index => <View key={index} style={[styles.kebabDot, { backgroundColor: color }]} />)}
    </View>
  );
}

/** iOS `MembersView`: purple owner card with the invite code, search, member rows with per-row menus, and the bottom Add New Member CTA. */
export function MembersView({ navigation }: NativeStackScreenProps<RootStackParamList, 'Members'>) {
  const insets = useSafeAreaInsets();
  const household = useHousehold();
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState<{ member?: HouseholdMember } | null>(null);
  const [openMenu, setOpenMenu] = useState<{ memberId: string; top: number } | null>(null);
  /** Row nodes, so the menu can be anchored in window space instead of inside the row. */
  const rowAnchors = React.useRef<Record<string, View | null>>({});
  const [toast, setToast] = useState(false);
  const toastValue = React.useRef(new Animated.Value(0)).current;

  const members = household.members;
  const me = members.find(member => member.id === household.myMemberId);
  const isAdmin = Boolean(me?.isAdmin);
  const owner = members.find(member => member.isAdmin);
  const inviteCode = household.household?.inviteCode ?? '';
  const canManage = (member: HouseholdMember) => isAdmin || member.id === household.myMemberId;

  /** iOS `otherMembers`: non-admins, with your own profile pulled to the top. */
  const others = members.filter(member => !member.isAdmin).sort((a, b) => Number(b.id === household.myMemberId) - Number(a.id === household.myMemberId));
  const query = search.trim().toLowerCase();
  const shown = query ? others.filter(member => member.name.toLowerCase().includes(query)) : others;

  const isDuplicateName = (name: string, excluding?: string) => members.some(member => member.id !== excluding && member.name.trim().toLowerCase() === name.trim().toLowerCase());

  useEffect(() => {
    if (!toast) return;
    const stiffness = (2 * Math.PI / 0.4) ** 2;
    Animated.spring(toastValue, { toValue: 1, stiffness, damping: 2 * 0.8 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(toastValue, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(false));
    }, 2000);
    return () => clearTimeout(timer);
  }, [toast, toastValue]);

  const copyCode = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void Clipboard.setStringAsync(inviteCode);
    setToast(true);
  };
  const shareCode = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Share.share({ message: `Join our home on ChoreBuddy! Invite code: ${inviteCode}` });
  };
  const openAdd = () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheet({}); };

  const requestMakeAdmin = (member: HouseholdMember) => Alert.alert('Make Admin', `Make ${member.name} an admin? They'll be able to manage members, the invite code, and zones.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Make Admin', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); household.makeAdmin(member.id).catch(reportMemberError('make this member an admin')); } },
  ]);
  const requestDelete = (member: HouseholdMember) => {
    if (member.isAdmin) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    Alert.alert('Delete Profile?', `This will permanently remove "${member.name}" from the household. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); household.deleteMember(member.id).catch(reportMemberError('delete this profile')); } },
    ]);
  };
  const denyManage = () => adminOnlyAlert(ADMIN_ONLY_MEMBERS);

  return (
    <View style={styles.root}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          {members.length > 0 && (
            <CircleButton onPress={openAdd} background={colors.purple} borderColor={colors.purple}>
              <MemberAddGlyph size={s(22)} color={colors.white} />
            </CircleButton>
          )}
        </View>
      </View>

      {members.length === 0 ? (
        <View style={styles.emptyRoot}>
          <View style={styles.emptyStack}>
            <View style={styles.emptyArt}>
              <SoftGlow color={colors.purple} opacity={0.18} style={styles.emptyGlow} />
              <AppImage source={Images.memberEmpty} resizeMode="contain" style={styles.emptyImage} />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>No Members Yet!</Text>
              <Text style={styles.emptySubtitle}>Tap + to add members and start tracking chores together.</Text>
            </View>
            <CapsuleCTA label="Create Profile" showPlus width={180} height={44} fontSize={15} onPress={openAdd} />
          </View>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.ownerCard}>
              <Pressable onPress={() => { if (owner) { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('MemberDetail', { memberId: owner.id }); } }} style={styles.ownerRow}>
                <View style={styles.ownerAvatarWrap}>
                  <View style={styles.ownerAvatar}>
                    {owner && <MemberAvatar member={owner} size={56} />}
                  </View>
                  <AppImage source={Images.crownIcon2} resizeMode="contain" style={styles.ownerCrown} />
                </View>
                <View style={styles.ownerCopy}>
                  <Text style={styles.ownerName}>{owner?.name ?? ''}</Text>
                  <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Home Owner</Text></View>
                </View>
              </Pressable>

              <View style={styles.inviteBar}>
                <View style={styles.inviteCopy}>
                  <Text style={styles.inviteLabel}>INVITE CODE</Text>
                  <Text style={styles.inviteCode}>{inviteCode}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <Pressable onPress={copyCode} style={styles.copyButton}>
                    <CopyGlyph size={s(18)} color={colors.purple} />
                    <Text style={styles.copyLabel}>Copy</Text>
                  </Pressable>
                  <Pressable onPress={shareCode} style={styles.shareButton}>
                    <ShareGlyph size={s(18)} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.searchBar}>
              <View style={styles.searchIcon}><Images.choreSearchIcon width={s(18)} height={s(18)} /></View>
              <TextInput value={search} onChangeText={setSearch} placeholder="Search Member" placeholderTextColor={`${colors.text}80`} style={styles.searchField} selectionColor={colors.purple} />
              {search.length > 0 && (
                <Pressable hitSlop={8} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSearch(''); }} style={styles.searchClear}>
                  <Text style={styles.searchClearText}>✕</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.membersSection}>
              <View style={styles.membersHeader}>
                <Text style={styles.membersTitle}>Members</Text>
                <Text style={styles.membersCount}>{members.length} Members</Text>
              </View>
              <View style={styles.memberRows}>
                {shown.map(member => (
                  <View key={member.id} ref={node => { rowAnchors.current[member.id] = node; }} style={styles.memberRow}>
                    <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('MemberDetail', { memberId: member.id }); }} style={styles.memberMain}>
                      <MemberAvatar member={member} size={42} />
                      <Text style={styles.memberName} numberOfLines={1}>{member.name}</Text>
                      {member.id === household.myMemberId ? (
                        <View style={styles.youPill}><Text style={styles.youPillText}>You</Text></View>
                      ) : member.claimedByUserId ? (
                        <View style={styles.joinedPill}><Text style={styles.joinedPillText}>Joined</Text></View>
                      ) : null}
                    </Pressable>
                    <Pressable
                      hitSlop={6}
                      onPress={() => {
                        if (!canManage(member)) return denyManage();
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        if (openMenu?.memberId === member.id) { setOpenMenu(null); return; }
                        rowAnchors.current[member.id]?.measureInWindow((_x, y) => setOpenMenu({ memberId: member.id, top: y + s(60) }));
                      }}
                    >
                      <Kebab dim={!canManage(member)} />
                    </Pressable>

                  </View>
                ))}
              </View>
            </View>
          </ScrollView>


          <BottomFade height={184} />
          <View style={[styles.bottomCta, { bottom: Math.max(s(20), insets.bottom + s(12)) }]}>
            <CapsuleCTA label="Add New Member" showPlus onPress={openAdd} />
          </View>

          {openMenu && (() => {
            const member = shown.find(item => item.id === openMenu.memberId);
            if (!member) return null;
            return (
              <View style={StyleSheet.absoluteFill}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenMenu(null)} />
                <View style={[styles.rowMenu, { top: openMenu.top }]}>
                  {isAdmin && member.id !== household.myMemberId && member.claimedByUserId && !member.isAdmin && (
                    <>
                      <Pressable onPress={() => { setOpenMenu(null); requestMakeAdmin(member); }} style={styles.menuRow}>
                        <AppImage source={Images.crownIcon2} resizeMode="contain" style={styles.menuIcon} />
                        <Text style={styles.menuLabel}>Make Admin</Text>
                      </Pressable>
                      <View style={styles.menuDivider} />
                    </>
                  )}
                  <Pressable onPress={() => { setOpenMenu(null); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('EditProfile', { memberId: member.id }); }} style={styles.menuRow}>
                    <EditGlyph size={s(20)} color={colors.text} />
                    <Text style={styles.menuLabel}>Edit Profile</Text>
                  </Pressable>
                  <View style={styles.menuDivider} />
                  <Pressable onPress={() => { setOpenMenu(null); requestDelete(member); }} style={styles.menuRow}>
                    <Images.deleteIcon width={s(20)} height={s(20)} />
                    <Text style={[styles.menuLabel, { color: '#FF6262' }]}>Delete Profile</Text>
                  </Pressable>
                </View>
              </View>
            );
          })()}
        </>
      )}

      {toast && (
        <Animated.View style={[styles.toastWrap, { bottom: Math.max(s(100), insets.bottom + s(92)) }, { opacity: toastValue, transform: [{ translateY: toastValue.interpolate({ inputRange: [0, 1], outputRange: [s(20), 0] }) }] }]} pointerEvents="none">
          <View style={styles.toast}>
            <CheckmarkGlyph width={s(13)} height={s(10)} color={colors.white} strokeWidth={2} />
            <Text style={styles.toastText}>Invite code copied</Text>
          </View>
        </Animated.View>
      )}

      {sheet && (
        <CreateProfileSheet
          title={sheet.member ? 'Edit Profile' : 'Create Profile'}
          initialName={sheet.member?.name ?? ''}
          initialAvatar={sheet.member?.avatar ?? 'member1'}
          initialPhotoData={sheet.member?.photoData}
          isDuplicateName={name => isDuplicateName(name, sheet.member?.id)}
          onSave={(name, avatar, photoData) => {
            if (sheet.member) household.updateMember(sheet.member.id, name, avatar, photoData).catch(reportMemberError('save this profile'));
            else household.addMember(name, avatar, photoData).catch(reportMemberError('create this profile'));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </View>
  );
}

type DayStreak = 'done' | 'missed' | 'skipped' | 'none';
const TABS = ['Due', 'Completed', 'Skipped', 'Missed'] as const;

/** iOS `ProfileDetailView`: avatar with an edit badge, weekly face streak, three stat cards, and the Due/Completed/Skipped/Missed chore tabs. */
export function MemberDetailView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'MemberDetail'>) {
  const household = useHousehold();
  const store = useChores();
  const [tab, setTab] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [cardsAppeared, setCardsAppeared] = useState(false);

  const member = household.members.find(item => item.id === route.params.memberId);
  const me = household.members.find(item => item.id === household.myMemberId);
  const canManage = Boolean(me?.isAdmin) || route.params.memberId === household.myMemberId;

  useEffect(() => {
    const timer = setTimeout(() => setCardsAppeared(true), 50);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { if (!member) navigation.goBack(); }, [member, navigation]);
  if (!member) return <View style={styles.root} />;

  const memberChores = store.chores.filter(chore => chore.assignedMemberIds.includes(member.id));
  const todayChores = memberChores.filter(chore => store.occurs(chore, new Date()));

  /** iOS `weekDays`: Monday-start week where done beats skipped, and an elapsed day with chores counts as missed. */
  const weekDays = (() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return labels.map((label, index) => {
      const day = new Date(monday); day.setDate(monday.getDate() + index);
      const dayChores = memberChores.filter(chore => store.occurs(chore, day));
      const state: DayStreak = dayChores.some(chore => store.isDoneOn(chore.id, day)) ? 'done'
        : dayChores.some(chore => store.hasEvent(chore.id, day, 'skipped')) ? 'skipped'
          : day < today && dayChores.length > 0 ? 'missed' : 'none';
      return { label, state };
    });
  })();

  const states = weekDays.map(day => day.state);
  const doneCount = states.filter(state => state === 'done').length;
  const bestRun = (() => { let best = 0, run = 0; states.forEach(state => { if (state === 'done') { run += 1; best = Math.max(best, run); } else run = 0; }); return best; })();
  const currentRun = (() => { let run = 0; for (const state of [...states].reverse()) { if (state === 'done') run += 1; else if (state === 'none') continue; else break; } return run; })();

  const choresForTab = tab === 0
    ? todayChores.filter(chore => !store.isDoneToday(chore) && !store.hasEvent(chore.id, new Date(), 'skipped') && !store.isOverdueNow(chore))
    : tab === 1 ? todayChores.filter(store.isDoneToday)
      : tab === 2 ? todayChores.filter(chore => store.hasEvent(chore.id, new Date(), 'skipped'))
        : todayChores.filter(chore => store.hasEvent(chore.id, new Date(), 'missed'));
  const emptyTabMessage = ['No chores due.', 'No completed chores yet.', 'No skipped chores.', 'No missed chores.'][tab];

  const requestDelete = () => {
    if (member.isAdmin) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    Alert.alert('Delete Profile?', `This will permanently remove "${member.name}" from the household. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); household.deleteMember(member.id).then(() => navigation.goBack(), reportMemberError('delete this profile')); } },
    ]);
  };

  return (
    <View style={styles.root}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          <CircleButton onPress={() => {
            if (!canManage) { adminOnlyAlert(ADMIN_ONLY_OWN_PROFILE); return; }
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowMenu(!showMenu);
          }}>
            <Kebab color={colors.purple} dim={!canManage} />
          </CircleButton>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
        <View style={styles.avatarBlock}>
          <View style={styles.bigAvatarWrap}>
            <View style={styles.bigAvatar}><MemberAvatar member={member} size={107} /></View>
            <PressScale
              onPress={() => {
                if (!canManage) { adminOnlyAlert(ADMIN_ONLY_OWN_PROFILE); return; }
                setShowOptions(true);
              }}
              style={[styles.avatarEdit, !canManage && { opacity: 0.4 }]}
            >
              <EditGlyph size={s(14)} color={colors.white} />
            </PressScale>
          </View>
          <Text style={styles.detailName}>{member.name}{member.isAdmin ? ' (Owner)' : ''}</Text>
        </View>

        <LinearGradient colors={['#FFEDF4', colors.white]} style={styles.streakCard}>
          {weekDays.map(day => (
            <View key={day.label} style={styles.streakColumn}>
              <Text style={styles.streakDayLabel}>{day.label}</Text>
              <AppImage
                source={day.state === 'done' ? Images.streakFaceHappy : day.state === 'missed' ? Images.streakFaceCry : day.state === 'skipped' ? Images.streakFaceSleep : Images.streakFaceIdle}
                resizeMode="contain"
                style={styles.streakFace}
              />
              <StatusDot state={day.state} />
            </View>
          ))}
        </LinearGradient>

        <View style={styles.statRow}>
          <StatCard value={currentRun} label="Current Streak" color="#FB4786" top="#FFEDF4" />
          <StatCard value={bestRun} label="Best Streak" color={ORANGE} top="#FFF5F0" />
          <StatCard value={doneCount} label="Average Streak" color="#4584FE" top="#F1F3FF" />
        </View>

        <View style={styles.choresSection}>
          <Text style={styles.choresTitle}>Chores to do</Text>
          {memberChores.length === 0 ? (
            <View style={styles.emptyChores}>
              <View style={styles.emptyChoresArt}>
                <SoftGlow color="#FFC7CE" opacity={0.3} diameter={97.9} style={styles.emptyGlow} />
                <BlinkingBunny width={115} height={160} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No Chores Yet!</Text>
                <Text style={[styles.emptySubtitle, { width: s(240), ...font('regular', 14) }]}>Add chores to help {member.name} stay organized and build great habits.</Text>
              </View>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                {TABS.map((label, index) => (
                  <Pressable key={label} onPress={() => { void Haptics.selectionAsync(); setTab(index); }} style={[styles.tabChip, tab === index && styles.tabChipOn]}>
                    <Text style={[styles.tabLabel, tab === index && { color: colors.white }]}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {choresForTab.length === 0 ? (
                <Text style={styles.emptyTab}>{emptyTabMessage}</Text>
              ) : (
                <View style={styles.choreList}>
                  {choresForTab.map((chore, index) => (
                    <SlideInCard key={chore.id} index={index} appeared={cardsAppeared}>
                      <PressScale onPress={() => navigation.push('ChoreDetail', { choreId: chore.id })} style={tab === 0 ? styles.dueCard : styles.statusCard}>
                        {tab === 0 ? <DueCardBody chore={chore} /> : <StatusCardBody chore={chore} tab={tab} />}
                      </PressScale>
                    </SlideInCard>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {showMenu && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMenu(false)} />
          <View style={styles.detailMenu}>
            <Pressable onPress={() => { setShowMenu(false); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.push('EditProfile', { memberId: member.id }); }} style={styles.menuRow}>
              <EditGlyph size={s(20)} color={colors.text} />
              <Text style={styles.menuLabel}>Edit Profile</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable onPress={() => { setShowMenu(false); requestDelete(); }} style={styles.menuRow}>
              <Images.deleteIcon width={s(20)} height={s(20)} />
              <Text style={[styles.menuLabel, { color: '#FF6262' }]}>Delete Profile</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showOptions && (
        <SelectOptionSheet
          onPicked={photoData => household.updateMember(member.id, member.name, member.avatar, photoData).catch(reportMemberError('save this photo'))}
          onClose={() => setShowOptions(false)}
        />
      )}
    </View>
  );
}

/** iOS `statusDot`: purple tick / red cross / orange dash, or an empty ring. */
function StatusDot({ state }: { state: DayStreak }) {
  if (state === 'none') return <View style={styles.dotEmpty} />;
  const color = state === 'done' ? colors.purple : state === 'missed' ? RED : ORANGE;
  return (
    <View style={[styles.dot, { backgroundColor: color }]}>
      {state === 'done' && <CheckmarkGlyph width={s(6)} height={s(5)} color={colors.white} strokeWidth={1.4} />}
      {state === 'missed' && (
        <View style={styles.crossWrap}>
          <View style={[styles.crossBar, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.crossBar, { position: 'absolute', transform: [{ rotate: '-45deg' }] }]} />
        </View>
      )}
      {state === 'skipped' && <View style={styles.dashBar} />}
    </View>
  );
}

function StatCard({ value, label, color, top }: { value: number; label: string; color: string; top: string }) {
  return (
    <LinearGradient colors={[top, colors.white]} style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );
}

/** iOS `dueCard`: name + orange time, zone row, avatars, then the Today badge with the segmented progress bar. */
function DueCardBody({ chore }: { chore: Chore }) {
  const household = useHousehold();
  const resolved = chore.assignedMemberIds.map(id => household.members.find(member => member.id === id)).filter((member): member is HouseholdMember => Boolean(member));
  const overflow = resolved.length - 2;
  return (
    <>
      <View style={styles.dueTop}>
        <View style={styles.dueCopy}>
          <View style={styles.dueNameRow}>
            <Text style={styles.dueName}>{chore.name}</Text>
            {!!chore.dueTime && <Text style={styles.dueTime}>{chore.dueTime}</Text>}
          </View>
          <View style={styles.zoneRow}>
            <View style={styles.zoneDot} />
            <Text style={styles.zoneName}>{chore.zoneName}</Text>
          </View>
        </View>
        <View style={styles.avatars}>
          {resolved.slice(0, 2).map(item => (
            <View key={item.id} style={styles.stackedAvatar}><MemberAvatar member={item} size={30} /></View>
          ))}
          {overflow > 0 && <View style={[styles.stackedAvatar, styles.overflowAvatar]}><Text style={styles.overflowText}>+{overflow}</Text></View>}
        </View>
      </View>
      <View style={styles.dueBottom}>
        <View style={[styles.badge, { backgroundColor: `${colors.blue}1A` }]}>
          <Images.zoneCalendarIcon width={s(14)} height={s(14)} />
          <Text style={[styles.badgeText, { color: colors.blue }]}>Today</Text>
        </View>
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>Due today</Text>
          <View style={styles.progressTrack}>
            <LinearGradient colors={[`${colors.blue}80`, colors.blue]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.progressFill, { width: s(142 * 0.52) }]} />
            <View style={[styles.tick, { left: s(91) }]} />
            <View style={[styles.tick, { left: s(115) }]} />
          </View>
        </View>
      </View>
    </>
  );
}

/** iOS `statusCard`: name + zone with the Done / Skipped / Missed pill. */
function StatusCardBody({ chore, tab }: { chore: Chore; tab: number }) {
  const config = tab === 1 ? { color: GREEN, label: 'Done' } : tab === 2 ? { color: ORANGE, label: 'Skipped' } : { color: RED, label: 'Missed' };
  return (
    <>
      <View style={styles.dueCopy}>
        <Text style={styles.dueName}>{chore.name}</Text>
        <View style={styles.zoneRow}>
          <View style={styles.zoneDot} />
          <Text style={styles.zoneName}>{chore.zoneName}</Text>
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: `${config.color}1A` }]}>
        {tab === 1 && <CheckmarkGlyph width={s(9)} height={s(7)} color={config.color} strokeWidth={1.5} />}
        {tab === 2 && <View style={[styles.dashBar, { backgroundColor: config.color, width: s(9), height: s(1.6) }]} />}
        {tab === 3 && (
          <View style={styles.crossWrap}>
            <View style={[styles.crossBar, { backgroundColor: config.color, transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.crossBar, { backgroundColor: config.color, position: 'absolute', transform: [{ rotate: '-45deg' }] }]} />
          </View>
        )}
        <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
      </View>
    </>
  );
}

/** iOS `EditProfileView`: header with delete, the live avatar block, and the profile form over a Save Changes CTA. */
export function EditProfileView({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'EditProfile'>) {
  const insets = useSafeAreaInsets();
  const household = useHousehold();
  const member = household.members.find(item => item.id === route.params.memberId);
  const [name, setName] = useState(member?.name ?? '');
  const [avatar, setAvatar] = useState(member?.avatar ?? 'member1');
  const [photoData, setPhotoData] = useState<string | undefined>(member?.photoData);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => { if (!member) navigation.goBack(); }, [member, navigation]);
  if (!member) return <View style={styles.root} />;

  const trimmed = name.trim();
  const duplicate = Boolean(trimmed) && household.members.some(item => item.id !== member.id && item.name.trim().toLowerCase() === trimmed.toLowerCase());
  const canSave = Boolean(trimmed) && !duplicate;

  const save = () => {
    if (!canSave) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    household.updateMember(member.id, trimmed, avatar, photoData).catch(reportMemberError('save this profile'));
    navigation.goBack();
  };
  const requestDelete = () => {
    if (member.isAdmin) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    Alert.alert('Delete Profile?', `This will permanently remove "${member.name}" from the household. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); household.deleteMember(member.id).then(() => navigation.goBack(), reportMemberError('delete this profile')); } },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerButtons}>
          <CircleButton onPress={() => navigation.goBack()}>
            <AppImage source={Images.backIcon} resizeMode="contain" style={styles.headerIcon} />
          </CircleButton>
          <CircleButton onPress={requestDelete}>
            <Images.deleteIcon width={s(18)} height={s(20)} />
          </CircleButton>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editContent}>
        <View style={styles.avatarBlock}>
          <View style={styles.bigAvatar}>
            <AvatarView avatar={avatar} photoData={photoData} size={s(107)} style={styles.bigAvatarImage} />
          </View>
          <Text style={styles.detailName}>{trimmed || member.name}</Text>
        </View>
        <ProfileFormCards name={name} setName={setName} avatar={avatar} setAvatar={setAvatar} photoData={photoData} setPhotoData={setPhotoData} nameError={duplicate ? 'A member with this name already exists.' : null} onAddPhoto={() => setShowOptions(true)} />
      </ScrollView>

      <BottomFade height={184} />
      <View style={[styles.bottomCta, { bottom: Math.max(s(20), insets.bottom + s(12)) }]}>
        <CapsuleCTA label="Save Changes" onPress={save} disabled={!canSave} dimWhenDisabled={0.5} />
      </View>

      {showOptions && <SelectOptionSheet onPicked={setPhotoData} onClose={() => setShowOptions(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: s(59), paddingHorizontal: s(15), height: s(99), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...font('semibold', 22), color: colors.text },
  headerButtons: { position: 'absolute', top: s(59), left: s(15), right: s(15), flexDirection: 'row', justifyContent: 'space-between' },
  headerIcon: { width: s(22), height: s(22) },
  content: { paddingHorizontal: s(15), paddingTop: s(19), paddingBottom: s(140), gap: s(23) },

  ownerCard: { borderRadius: s(22), backgroundColor: colors.purple, padding: s(15), gap: s(18) },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: s(24) },
  ownerAvatarWrap: { width: s(56), height: s(56) },
  ownerAvatar: { width: s(56), height: s(56), borderRadius: s(28), borderWidth: 2, borderColor: colors.white, overflow: 'hidden' },
  ownerCrown: { position: 'absolute', top: -s(6), right: -s(6), width: s(24), height: s(24) },
  ownerCopy: { gap: s(7), alignItems: 'flex-start' },
  ownerName: { ...font('semibold', 20), color: colors.white },
  ownerBadge: { borderRadius: s(8), backgroundColor: '#FFFFFF1F', paddingHorizontal: s(8), paddingVertical: s(6) },
  ownerBadgeText: { ...font('medium', 12), color: colors.white },
  inviteBar: { flexDirection: 'row', alignItems: 'center', padding: s(12), borderRadius: s(18), backgroundColor: '#FFFFFF1A', borderWidth: 1, borderColor: '#FFFFFF1A' },
  inviteCopy: { flex: 1, gap: s(4) },
  inviteLabel: { ...font('semibold', 10), color: '#FFFFFFBF' },
  inviteCode: { ...font('bold', 15), color: colors.white },
  inviteActions: { flexDirection: 'row', gap: s(8) },
  copyButton: { height: s(36), borderRadius: s(10), backgroundColor: colors.white, paddingHorizontal: s(10), flexDirection: 'row', alignItems: 'center', gap: s(8) },
  copyIcon: { width: s(18), height: s(18), tintColor: colors.purple },
  copyLabel: { ...font('medium', 14), color: colors.purple },
  shareButton: { width: s(36), height: s(36), borderRadius: s(10), backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' },
  shareIcon: { width: s(18), height: s(18), tintColor: colors.white },

  searchBar: { height: s(42), borderRadius: s(21), borderWidth: 1, borderColor: `${colors.text}33`, flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(10), gap: s(10) },
  searchIcon: { opacity: 0.3, width: s(22), alignItems: 'center' },
  searchField: { flex: 1, height: '100%', ...font('regular', 14), color: colors.text, padding: 0 },
  searchClear: { width: s(18), height: s(18), borderRadius: s(9), backgroundColor: `${colors.text}14`, alignItems: 'center', justifyContent: 'center' },
  searchClearText: { fontSize: s(8), color: `${colors.text}80`, fontWeight: '600' },

  membersSection: { gap: s(10) },
  membersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  membersTitle: { ...font('semibold', 16), color: colors.text },
  membersCount: { ...font('medium', 12), color: `${colors.text}80` },
  memberRows: { gap: s(8) },
  memberRow: { height: s(69), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', gap: s(15), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(15) },
  memberName: { ...font('medium', 15), color: colors.text, flexShrink: 1 },
  youPill: { borderRadius: s(11), backgroundColor: colors.purple, paddingHorizontal: s(8), paddingVertical: s(4) },
  youPillText: { ...font('semibold', 11), color: colors.white },
  joinedPill: { borderRadius: s(11), backgroundColor: `${colors.purple}1A`, paddingHorizontal: s(8), paddingVertical: s(4) },
  joinedPillText: { ...font('medium', 11), color: colors.purple },
  kebab: { width: s(24), height: s(24), alignItems: 'center', justifyContent: 'center', gap: s(2.5) },
  kebabDot: { width: s(3), height: s(3), borderRadius: s(1.5) },

  rowMenu: { position: 'absolute', right: s(25), width: s(171), zIndex: 20, borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, paddingVertical: s(4), boxShadow: [{ offsetX: -s(5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  detailMenu: { position: 'absolute', top: s(59) + s(48), right: s(15), width: s(161), borderRadius: s(16), backgroundColor: colors.background, borderWidth: 1, borderColor: `${colors.text}1A`, paddingVertical: s(4), boxShadow: [{ offsetX: -s(5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), paddingHorizontal: s(16), height: s(48) },
  menuIcon: { width: s(20), height: s(20) },
  menuLabel: { ...font('regular', 14), color: colors.text },
  menuDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginHorizontal: s(16) },

  bottomCta: { position: 'absolute', left: s(25), right: s(25), bottom: s(20) },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: s(100), alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: s(8), height: s(44), paddingHorizontal: s(18), borderRadius: s(22), backgroundColor: colors.text, boxShadow: [{ offsetX: 0, offsetY: s(3), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' }] },
  toastText: { ...font('medium', 14), color: colors.white },

  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyStack: { alignItems: 'center', gap: s(28) },
  emptyArt: { alignItems: 'center', justifyContent: 'center' },
  emptyGlow: { position: 'absolute' },
  emptyImage: { width: s(160), height: s(160) },
  emptyCopy: { gap: s(10), alignItems: 'center' },
  emptyTitle: { ...font('semibold', 18), color: colors.text, textAlign: 'center' },
  emptySubtitle: { ...font('regular', 15), color: `${colors.text}99`, textAlign: 'center', width: s(239) },

  detailContent: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(40), gap: s(15) },
  editContent: { paddingHorizontal: s(15), paddingTop: s(20), paddingBottom: s(160), gap: s(15) },
  avatarBlock: { alignItems: 'center', gap: s(10) },
  bigAvatarWrap: { width: s(107), height: s(107) },
  bigAvatar: { width: s(107), height: s(107), borderRadius: s(53.5), borderWidth: s(3.35), borderColor: colors.white, backgroundColor: '#FF6E9233', overflow: 'hidden', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(12), color: 'rgba(0,0,0,0.08)' }] },
  bigAvatarImage: { width: '100%', height: '100%' },
  avatarEdit: { position: 'absolute', right: -s(2), bottom: 0, width: s(28), height: s(28), borderRadius: s(14), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  detailName: { ...font('semibold', 20), color: colors.text },

  streakCard: { flexDirection: 'row', borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(15), paddingVertical: s(6), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(5), color: 'rgba(0,0,0,0.05)' }] },
  streakColumn: { flex: 1, alignItems: 'center', paddingTop: s(4), gap: s(5) },
  streakDayLabel: { ...font('regular', 12), color: `${colors.text}80` },
  streakFace: { width: s(45), height: s(45) },
  dot: { width: s(15), height: s(15), borderRadius: s(7.5), alignItems: 'center', justifyContent: 'center' },
  dotEmpty: { width: s(15), height: s(15), borderRadius: s(7.5), borderWidth: 1, borderColor: `${colors.text}33` },
  crossWrap: { width: s(8), height: s(8), alignItems: 'center', justifyContent: 'center' },
  crossBar: { width: s(6), height: s(1.4), borderRadius: s(1), backgroundColor: colors.white },
  dashBar: { width: s(6), height: s(1.4), borderRadius: s(1), backgroundColor: colors.white },

  statRow: { flexDirection: 'row', gap: s(15) },
  statCard: { flex: 1, height: s(68), borderRadius: s(16), borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center', gap: s(2) },
  statValue: { ...font('bold', 20) },
  statLabel: { ...font('regular', 12), color: colors.text },

  choresSection: { gap: s(15) },
  choresTitle: { ...font('semibold', 16), color: colors.text },
  emptyChores: { alignItems: 'center', gap: s(19), paddingTop: s(10) },
  emptyChoresArt: { alignItems: 'center', justifyContent: 'center' },
  tabRow: { gap: s(10) },
  tabChip: { width: s(90), height: s(38), borderRadius: s(12), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, alignItems: 'center', justifyContent: 'center' },
  tabChipOn: { backgroundColor: colors.purple },
  tabLabel: { ...font('medium', 12), color: colors.text },
  emptyTab: { ...font('regular', 14), color: `${colors.text}80`, textAlign: 'center', paddingTop: s(40) },
  choreList: { gap: s(12) },

  dueCard: { padding: s(16), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, gap: s(8), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  statusCard: { height: s(66), paddingHorizontal: s(15), borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  dueTop: { flexDirection: 'row', alignItems: 'flex-start' },
  dueCopy: { flex: 1, gap: s(2) },
  dueNameRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  dueName: { ...font('medium', 15), color: colors.text, flexShrink: 1 },
  dueTime: { ...font('medium', 12), color: '#EFA328' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  zoneDot: { width: s(4), height: s(4), borderRadius: s(2), backgroundColor: `${colors.text}4D` },
  zoneName: { ...font('regular', 12), color: `${colors.text}80` },
  avatars: { flexDirection: 'row' },
  stackedAvatar: { width: s(30), height: s(30), borderRadius: s(15), marginLeft: -s(8), borderWidth: s(0.5), borderColor: colors.white, backgroundColor: '#FF6E92', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  overflowAvatar: { backgroundColor: `${colors.text}14` },
  overflowText: { ...font('medium', 11), color: `${colors.text}99` },
  dueBottom: { flexDirection: 'row', alignItems: 'flex-end' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: s(5), borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6) },
  badgeText: { ...font('medium', 12) },
  progressBlock: { flex: 1, alignItems: 'flex-end', gap: s(4) },
  progressLabel: { ...font('regular', 10), color: `${colors.text}80` },
  progressTrack: { width: s(142), height: s(19), borderRadius: s(9.5), backgroundColor: `${colors.blue}1A`, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: s(9.5) },
  tick: { position: 'absolute', width: 1, height: s(8), backgroundColor: colors.white },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: s(5), height: s(26), paddingHorizontal: s(10), borderRadius: s(13) },
  statusPillText: { ...font('medium', 12) },
});
