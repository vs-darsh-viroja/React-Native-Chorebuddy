import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { CheckmarkGlyph, MoreDotsGlyph, ZoneCalendarGlyph } from '@/components/glyphs';
import { PressScale } from '@/components/motion';
import type { Chore } from '@/services/ChoreContext';
import { useHousehold } from '@/services/HouseholdContext';
import { AvatarView } from '@/components/AvatarView';
import { colors, font, s } from '@/theme';

export const nowTime = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** iOS overlapping member avatars: first two plus a "+N" overflow bubble. */
export function Avatars({ ids }: { ids: string[] }) {
  const { members } = useHousehold();
  const resolved = ids.map(id => members.find(member => member.id === id)).filter((member): member is NonNullable<typeof member> => Boolean(member));
  const overflow = resolved.length - 2;
  return (
    <View style={styles.avatars}>
      {resolved.slice(0, 2).map(member => (
        <View key={member.id} style={styles.avatar}>
          <AvatarView avatar={member.avatar} photoData={member.photoData} size={s(28)} />
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.avatar, styles.avatarOverflow]}>
          <Text style={styles.avatarOverflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

export type ChoreMenuRequest = { choreId: string; top: number };

/**
 * iOS chore card (Home + Zone Detail): name row with optional orange time and
 * the three-dot anchor, zone row with a 4pt dot, then a 28pt bottom row —
 * Completed pill when done, calendar due badge when the screen wants one,
 * member avatars trailing.
 */
export function ChoreCard({ chore, done, overdue = false, showTimeWhenDone = false, showDueBadge = false, onPress, onMenu }: { chore: Chore; done: boolean; overdue?: boolean; showTimeWhenDone?: boolean; showDueBadge?: boolean; onPress(): void; onMenu(request: ChoreMenuRequest): void }) {
  const anchor = useRef<View>(null);
  const badgeColor = overdue ? colors.danger : colors.blue;
  const badgeText = overdue ? 'Overdue' : 'Today';
  return (
    <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={[styles.card, done && styles.cardDone]}>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, done && styles.nameDone]}>{chore.name}</Text>
            {(!done || showTimeWhenDone) && !!chore.dueTime && <Text style={styles.time}>{chore.dueTime}</Text>}
          </View>
          <View style={styles.zoneRow}>
            <View style={styles.zoneDot} />
            <Text style={styles.zoneName}>{chore.zoneName}</Text>
          </View>
        </View>
        <Pressable
          ref={anchor}
          hitSlop={6}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            anchor.current?.measureInWindow((x, y, width, height) => onMenu({ choreId: chore.id, top: y + height + s(6) }));
          }}
          style={styles.dots}
        >
          <MoreDotsGlyph size={s(20)} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.cardBottom}>
        {done ? (
          <View style={styles.completedPill}>
            <Text style={styles.completedText}>Completed at {chore.completedTime || chore.dueTime}</Text>
          </View>
        ) : showDueBadge ? (
          <View style={[styles.dueBadge, { backgroundColor: `${badgeColor}1A` }]}>
            <ZoneCalendarGlyph size={s(14)} color={badgeColor} />
            <Text style={[styles.dueText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Avatars ids={chore.assignedMemberIds} />
      </View>
    </Pressable>
  );
}

export type MenuEntry = { key: string; title: string; icon: React.ComponentType<{ width?: number; height?: number }>; titleColor?: string; dim?: boolean; action(): void };

/** iOS anchored dropdown: 161pt card at 15pt from the right edge, appBackground fill, divider-separated rows. The screen supplies a full-screen transparent backdrop. */
export function ChoreMenu({ top, entries, onClose }: { top: number; entries: MenuEntry[]; onClose(): void }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.menu, { top }]}>
        {entries.map((entry, index) => (
          <React.Fragment key={entry.key}>
            {index > 0 && <View style={styles.menuDivider} />}
            <Pressable onPress={() => { entry.action(); onClose(); }} style={[styles.menuRow, entry.dim && { opacity: 0.4 }]}>
              <entry.icon width={s(20)} height={s(20)} />
              <Text style={[styles.menuTitle, entry.titleColor ? { color: entry.titleColor } : null]}>{entry.title}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

/** iOS `listHeaderRow` checkbox: 22pt rounded square, green fill + white tick when everything is done. */
export function MarkAllCheck({ allDone }: { allDone: boolean }) {
  return (
    <View style={[styles.checkBox, allDone && styles.checkBoxDone]}>
      {allDone && <CheckmarkGlyph width={s(11)} height={s(8)} color={colors.white} strokeWidth={2} />}
    </View>
  );
}

export { PressScale };

const styles = StyleSheet.create({
  card: { borderRadius: s(16), backgroundColor: colors.white, borderWidth: 1, borderColor: `${colors.text}1A`, paddingHorizontal: s(15), paddingVertical: s(16), gap: s(8), boxShadow: [{ offsetX: 0, offsetY: s(2), blurRadius: s(7.5), color: 'rgba(0,0,0,0.1)' }] },
  cardDone: { borderColor: `${colors.success}66` },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardCopy: { flex: 1, gap: s(2) },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  name: { ...font('medium', 15), color: colors.text, flexShrink: 1 },
  nameDone: { color: `${colors.text}99`, textDecorationLine: 'line-through' },
  time: { ...font('medium', 12), color: '#EFA328' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: s(4) },
  zoneDot: { width: s(4), height: s(4), borderRadius: s(2), backgroundColor: `${colors.text}80` },
  zoneName: { ...font('regular', 12), color: `${colors.text}80` },
  dots: { width: s(24), height: s(24), alignItems: 'center', justifyContent: 'center', marginLeft: s(8) },
  cardBottom: { height: s(28), flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
  completedPill: { backgroundColor: `${colors.success}1A`, borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6) },
  completedText: { ...font('medium', 12), color: colors.success },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: s(5), borderRadius: s(14), paddingHorizontal: s(8), paddingVertical: s(6) },
  dueText: { ...font('medium', 12), lineHeight: s(14.3), includeFontPadding: false },
  avatars: { flexDirection: 'row' },
  avatar: { width: s(28), height: s(28), borderRadius: s(14), marginLeft: -s(8), backgroundColor: '#FF6E92', borderWidth: s(0.5), borderColor: colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarOverflow: { backgroundColor: `${colors.text}14` },
  avatarOverflowText: { ...font('medium', 11), color: `${colors.text}99` },
  menu: { position: 'absolute', right: s(15), width: s(161), borderRadius: s(16), backgroundColor: colors.background, padding: s(16), boxShadow: [{ offsetX: s(-5), offsetY: s(5), blurRadius: s(20), color: 'rgba(0,0,0,0.2)' }] },
  menuDivider: { height: 1, backgroundColor: `${colors.text}1A`, marginVertical: s(12) },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  menuTitle: { ...font('regular', 14), color: colors.text },
  checkBox: { width: s(22), height: s(22), borderRadius: s(4.4), borderWidth: 1.65, borderColor: `${colors.text}4D`, alignItems: 'center', justifyContent: 'center' },
  checkBoxDone: { borderColor: 'transparent', backgroundColor: colors.success },
});
