import React, { useRef } from 'react';
import { Alert, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, s } from '@/theme';
import { usePurchases } from '@/services/PurchaseManager';

export function GiftBanner() {
  const purchases = usePurchases();
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
  const pressed = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, speed: 28, bounciness: 5 }).start();
  return <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}><Pressable disabled={purchases.isInProgress} onPressIn={() => pressed(.97)} onPressOut={() => pressed(1)} onPress={() => void buy()} style={styles.banner}><Image source={Images.iphoneGiftBg} resizeMode="cover" style={StyleSheet.absoluteFill} /><View><View style={styles.offRow}><Text style={styles.discount}>{discount}%</Text><Text style={styles.off}>OFF</Text></View><Text style={styles.subtitle}>On Yearly Plan</Text></View><View style={styles.price}><Text style={styles.old}>{yearly?.displayPrice ?? '—'}</Text><Text style={styles.new}>{purchases.isInProgress ? 'Opening…' : gift?.displayPrice ?? 'Loading…'}  ›</Text></View></Pressable></Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: s(15), marginVertical: s(8) },
  banner: { height: s(101), borderRadius: s(20), overflow: 'hidden', paddingHorizontal: s(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offRow: { flexDirection: 'row', alignItems: 'baseline', gap: s(5) }, discount: { ...font('semibold', 35), color: 'white' }, off: { ...font('semibold', 16), color: 'white' }, subtitle: { ...font('semibold', 16), color: 'white' },
  price: { minWidth: s(116), height: s(38), borderRadius: s(12), backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 5 }, old: { ...font('semibold', 10), color: `${colors.text}70`, textDecorationLine: 'line-through' }, new: { ...font('semibold', 14), color: colors.text },
});
