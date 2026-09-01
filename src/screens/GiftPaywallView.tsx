import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { AppButton } from '@/components/AppButton';
import { colors, font, s } from '@/theme';
import { usePurchases } from '@/services/PurchaseManager';
import { useGiftTimer } from '@/services/GiftTimer';
import { Analytics } from '@/services/Analytics';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * `isPermanentOffer` is iOS `GiftPaywallView.isPermanentOffer`: the launcher
 * quick-action entry point shows the same screen with the countdown card hidden,
 * because that offer is not on the 24-hour timer. iOS uses `.opacity(0)` rather
 * than removing the card, so the layout below it does not move — matched here.
 */
export function GiftPaywallView({ onClose, onPurchased = onClose, isPermanentOffer = false }: { onClose(): void; onPurchased?(): void; isPermanentOffer?: boolean }) {
  const purchases = usePurchases();
  const insets = useSafeAreaInsets();
  const gift = purchases.product('gift');
  const yearly = purchases.product('yearly');
  const timer = useGiftTimer();
  const nudge = useRef(new Animated.Value(0)).current;
  useEffect(() => { Analytics.paywallView('gift'); }, []);
  useEffect(() => { Animated.loop(Animated.sequence([Animated.timing(nudge, { toValue: s(5), duration: 600, useNativeDriver: true }), Animated.timing(nudge, { toValue: 0, duration: 600, useNativeDriver: true })])).start(); }, [nudge]);
  const values = [`${timer.hours}h`, `${pad(timer.minutes)}m`, `${pad(timer.seconds)}s`];
  const discount = yearly?.price && gift?.price ? Math.max(0, Math.round((1 - gift.price / yearly.price) * 100)) : 67;
  const buy = async () => { if (!gift) return Alert.alert('Gift Unavailable', 'Open an installed Google Play test build with a licensed tester account, then try again.'); const result = await purchases.purchase(gift); if (result.hasPro) onPurchased(); else if (result.error) Alert.alert('Purchase', result.error); };
  return <View style={styles.root}><LinearGradient colors={[`${colors.purple}33`, colors.background]} style={styles.top} /><Pressable disabled={purchases.isInProgress} onPress={onClose} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable><AppImage source={Images.giftImg} resizeMode="contain" style={styles.gift} /><Text style={styles.off}>{discount}% OFF</Text><Text style={styles.yearly}>On Yearly Plan</Text><View style={[styles.card, isPermanentOffer && styles.hiddenCard]}><Text style={styles.expires}>{timer.isExpired ? 'Offer expired' : 'Expires in'}</Text><View style={styles.timer}>{values.map((value, i) => <React.Fragment key={i}><View><View style={styles.timeBox}><Text style={styles.time}>{value}</Text></View><Text style={styles.timeLabel}>{['Hours', 'Minutes', 'Seconds'][i]}</Text></View>{i < 2 && <Text style={styles.colon}>:</Text>}</React.Fragment>)}</View></View><View style={styles.price}><Text style={styles.old}>{yearly?.displayPrice ?? '—'}{`\n`}<Text style={styles.period}>Yearly</Text></Text><AnimatedAppImage source={Images.giftArrow} resizeMode="contain" style={[styles.arrow, { transform: [{ translateX: nudge }] }]} /><Text style={styles.new}>{gift?.displayPrice ?? 'Loading…'}{`\n`}<Text style={styles.period}>Yearly</Text></Text></View><View style={[styles.cta, { bottom: Math.max(s(38), insets.bottom + s(16)) }]}><AppButton title={purchases.isInProgress ? 'Connecting to Google Play…' : 'Collect Gift'} onPress={() => { if (!purchases.isInProgress) void buy(); }} /></View></View>;
}

const styles = StyleSheet.create({ hiddenCard: { opacity: 0 }, root: { flex: 1, backgroundColor: colors.background, alignItems: 'center' }, top: { ...StyleSheet.absoluteFillObject, bottom: undefined, height: s(301) }, skip: { position: 'absolute', right: s(20), top: s(55), zIndex: 2, padding: s(8) }, skipText: { ...font('medium', 15), color: colors.text }, gift: { width: s(272), height: s(275), marginTop: s(42) }, off: { ...font('bold', 60), color: colors.purple, marginTop: s(-38) }, yearly: { ...font('semibold', 26), color: colors.text }, card: { width: s(325), height: s(147), borderRadius: s(24), borderWidth: 1, borderColor: `${colors.purple}55`, marginTop: s(16), alignItems: 'center', justifyContent: 'center' }, expires: { ...font('medium', 15), color: colors.text, marginBottom: s(10) }, timer: { flexDirection: 'row', alignItems: 'center', gap: s(7) }, timeBox: { width: s(68), height: s(50), borderRadius: s(12), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' }, time: { ...font('bold', 18), color: 'white' }, timeLabel: { ...font('regular', 10), color: `${colors.text}99`, textAlign: 'center', marginTop: s(4) }, colon: { ...font('bold', 20), color: colors.purple, marginTop: s(-16) }, price: { flexDirection: 'row', alignItems: 'center', marginTop: s(18), gap: s(16) }, old: { ...font('semibold', 20), color: `${colors.text}80`, textDecorationLine: 'line-through', textAlign: 'center' }, new: { ...font('bold', 20), color: colors.purple, textAlign: 'center' }, period: { ...font('regular', 12), textDecorationLine: 'none' }, arrow: { width: s(65), height: s(28) }, cta: { position: 'absolute', left: s(25), right: s(25), bottom: s(38) } });
