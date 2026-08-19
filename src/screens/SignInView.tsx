import React from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { Images } from '@/constants/assets';
import { colors, font, s } from '@/theme';

export function SignInView({ onGoogle }: { onGoogle(): void }) {
  return <ImageBackground source={Images.signInBg} resizeMode="cover" style={styles.root}><View style={styles.actions}><Pressable onPress={onGoogle} style={styles.google}><Image source={Images.googleLogo} style={styles.logo} /><Text style={styles.googleText}>Sign in with Google</Text></Pressable></View></ImageBackground>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, actions: { position: 'absolute', left: s(25), right: s(25), bottom: s(68), gap: s(12) }, google: { height: s(52), borderRadius: s(100), backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: s(5), shadowOffset: { width: 0, height: s(2) } }, logo: { position: 'absolute', left: s(13), width: s(22), height: s(22) }, googleText: { ...font('medium', 20), color: '#000' } });
