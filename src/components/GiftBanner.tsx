import React, { useRef } from 'react';
import { ActivityIndicator, Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { colors, font, isPad, s } from '@/theme';
import { usePurchases } from '@/services/PurchaseManager';
import { useGiftTimer } from '@/services/GiftTimer';
import { usePaywallConfig } from '@/services/PaywallConfig';
import { AppImage } from '@/components/AppImage';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * iOS `LifeTimeGiftOfferBannerView` — a 101pt banner over the gift artwork.
 *
 * Layout is the iOS ZStack: the stretched background image, then a row with the
 * discount copy on the left and a right column holding the countdown pill
 * against the TOP edge (bottom corners rounded only, as iOS rounds
 * `[.bottomLeft, .bottomRight]`) and the white price row at the bottom.
 *
 * The banner carries NO horizontal margin of its own: every call site (Home's
 * scroll, the chore-free body, Settings' content) already pads 15, exactly like
 * iOS where the banner sits inside a container that applies `.padding(.horizontal, 15)`.
 */
export function GiftBanner() {
  const purchases = usePurchases();
  const timer = useGiftTimer();
  const config = usePaywallConfig();
  const gift = purchases.product('gift');
  const yearly = purchases.product('yearly');
  const scale = useRef(new Animated.Value(1)).current;
  if (purchases.hasPro) return null;
  const discount = yearly?.price && gift?.price ? Math.max(0, Math.round((1 - gift.price / yearly.price) * 100)) : 67;
  const buy = async () => {
    if (!gift) return Alert.alert('Gift Unavailable', 'This offer is not available from Google Play right now.');
    const result = await purchases.purchase(gift);
    if (result.error) Alert.alert('Purchase', result.error);
  };
  /** iOS `.scaleEffect(isPressed ? 0.97 : 1)`, spring(response .3, damping .7). */
  const press = (toValue: number) => {
    const stiffness = (2 * Math.PI / 0.3) ** 2;
    Animated.spring(scale, { toValue, stiffness, damping: 2 * 0.7 * Math.sqrt(stiffness), mass: 1, useNativeDriver: true }).start();
  };
  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        disabled={purchases.isInProgress}
        onPressIn={() => press(0.97)}
        onPressOut={() => press(1)}
        onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void buy(); }}
        style={styles.banner}
      >
        {/* iOS `.resizable()` with no aspect ratio = stretch to the frame, not crop.
            Explicit 100% width/height is REQUIRED: on Fabric an Image sized only
            by absolute edges falls back to its intrinsic size, and this asset is
            1035x303 with no @3x suffix — so it rendered 3x oversized and the
            banner showed a magnified crop of the artwork's own baked corner,
            which is what made the top-leading edge look bent. */}
        <AppImage source={isPad ? Images.ipadGiftBg : Images.iphoneGiftBg} resizeMode="stretch" style={styles.bg} />

        <View style={styles.left}>
          <View style={styles.offRow}>
            <Text style={styles.discount}>{discount}%</Text>
            <Text style={styles.off}>OFF</Text>
          </View>
          <Text style={styles.subtitle}>On Yearly Plan</Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.timerPill, { opacity: config.showLifeTimeBannerAtHome ? 1 : 0 }]}>
            <Text style={styles.timerText} numberOfLines={1}>{`${timer.hours} : ${pad(timer.minutes)} : ${pad(timer.seconds)}`}</Text>
          </View>
          <View style={styles.price}>
            {purchases.isInProgress ? (
              <ActivityIndicator color={colors.purple} />
            ) : (
              <View style={styles.priceRow}>
                <Text style={styles.old} numberOfLines={1}>{yearly?.displayPrice ?? '—'}</Text>
                <Text style={styles.new} numberOfLines={1}>{gift?.displayPrice ?? 'Loading…'}</Text>
                <AppImage source={Images.rightArrowIcon} resizeMode="contain" style={styles.arrow} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** iOS Home gate: `!timerManager.isExpired && !purchaseManager.hasPro && remoteConfigManager.showLifeTimeBannerAtHome`. */
export function HomeGiftBanner() {
  const purchases = usePurchases();
  const timer = useGiftTimer();
  const config = usePaywallConfig();
  if (timer.isExpired || purchases.hasPro || !config.showLifeTimeBannerAtHome) return null;
  // iOS applies `.padding(.top, 15)` at both Home call sites.
  return <View style={{ marginTop: s(15) }}><GiftBanner /></View>;
}

const styles = StyleSheet.create({
  /**
   * No margin of its own. iOS Settings drops the banner straight into a
   * `VStack(spacing: 15)`, while the two Home call sites add `.padding(.top, 15)`
   * — so that 15 lives in `HomeGiftBanner`, not here. Horizontal inset always
   * comes from the parent, which already pads 15 at every call site.
   */
  wrap: {},
  /**
   * The purple fill matters: `iphoneGiftBg` is 345x101 with its OWN rounded
   * corners baked in at radius ~17.3, and it is stretched to the banner's real
   * width (wider than 345 on most devices), which turns that baked corner into
   * an ellipse. Sitting inside our radius-20 clip, the two mismatched curves
   * overlapped and the top-leading edge looked bent. Painting the card in the
   * artwork's own base colour (#9871E8 — sampled from the asset, identical to
   * `colors.purple`) fills those transparent corners, so the corner is defined
   * solely by `borderRadius`, exactly like iOS's `.clipShape(RoundedRectangle(20))`.
   */
  bg: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  banner: { height: s(101), borderRadius: s(20), overflow: 'hidden', backgroundColor: colors.purple, flexDirection: 'row', alignItems: 'center' },
  left: { paddingLeft: s(15), gap: s(2) },
  offRow: { flexDirection: 'row', alignItems: 'baseline', gap: s(6) },
  discount: { ...font('semibold', 35), lineHeight: s(41.8), includeFontPadding: false, color: colors.white },
  off: { ...font('semibold', 16), lineHeight: s(19.1), includeFontPadding: false, color: colors.white },
  subtitle: { ...font('semibold', 16), lineHeight: s(19.1), includeFontPadding: false, color: colors.white },
  /** Pill pinned to the top edge, price row to the bottom — iOS VStack with a Spacer between. */
  right: { flex: 1, alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between' },
  /**
   * iOS sizes the label 100x12 then pads 10 vertically / 6 horizontally, so the
   * pill is 112x32 — the label's own line box must not inflate it, hence the
   * pinned lineHeight. `.offset(y: 1)` keeps it just over the banner's top edge.
   */
  timerPill: {
    width: s(isPad ? 130 : 100) + s(12),
    height: s(32),
    marginTop: s(1),
    marginRight: s(15),
    borderBottomLeftRadius: s(12),
    borderBottomRightRadius: s(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { ...font('medium', 16), lineHeight: s(19.1), includeFontPadding: false, color: colors.white },
  /**
   * iOS `.frame(width: 116, height: 35)`. Kept as a MINIMUM rather than a hard
   * width: iOS lets a long price overflow the white background, which is fine
   * for "$9.99" but spills outside the card for longer currencies (₹1,450.00).
   * Growing instead keeps the design identical where iOS fits and intact where
   * it would not.
   */
  price: {
    minWidth: s(isPad ? 156.32716 : 116),
    height: s(35),
    paddingHorizontal: s(8),
    borderRadius: s(12),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(15),
    marginBottom: s(isPad ? 20 : 15),
    boxShadow: [{ offsetX: 0, offsetY: s(6), blurRadius: s(10), color: 'rgba(0,0,0,0.3)' }],
  },
  /** iOS HStack(spacing: 6): struck-through original, discounted price, 16pt arrow. */
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  old: { ...font('semibold', 10), lineHeight: s(11.9), includeFontPadding: false, color: `${colors.text}80`, textDecorationLine: 'line-through' },
  new: { ...font('semibold', 14), lineHeight: s(16.7), includeFontPadding: false, color: colors.text },
  arrow: { width: s(16), height: s(16) },
});
