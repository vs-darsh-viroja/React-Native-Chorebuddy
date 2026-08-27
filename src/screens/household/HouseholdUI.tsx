import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, s } from '@/theme';
import { AppImage } from '@/components/AppImage';

export const avatarNames = Array.from({ length: 17 }, (_, index) => `member${index + 1}`);
export const avatarImages = [Images.member1, Images.member2, Images.member3, Images.member4, Images.member5, Images.member6, Images.member7, Images.member8, Images.member9, Images.member10, Images.member11, Images.member12, Images.member13, Images.member14, Images.member15, Images.member16, Images.member17] as ImageSourcePropType[];
export function avatarSource(name: string) { return avatarImages[Math.max(0, avatarNames.indexOf(name))] ?? avatarImages[0]; }
export function Header({ title, onBack }: { title: string; onBack(): void }) { return <View style={styles.header}><Text style={styles.title}>{title}</Text><Pressable onPress={onBack} hitSlop={10} style={styles.back}><AppImage source={Images.backIcon} style={styles.backIcon} /></Pressable></View>; }
export function Card({ children }: React.PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
const styles = StyleSheet.create({ header: { height: s(40), justifyContent: 'center', alignItems: 'center' }, title: { ...font('semibold', 22), color: colors.text }, back: { position: 'absolute', left: 0, width: s(40), height: s(40), borderRadius: s(20), backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${colors.text}1A`, elevation: 3 }, backIcon: { width: s(22), height: s(22) }, card: { borderRadius: s(16), padding: s(15), backgroundColor: 'white', borderWidth: 1, borderColor: `${colors.text}1A`, elevation: 3 } });
