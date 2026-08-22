import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { Images } from '@/constants/assets';

/**
 * iOS `WelcomeScreen`: one `.resizable()` image stretched over the whole screen.
 * The art must be sized by flex — an absolutely positioned Image keeps its
 * intrinsic size on Android and spills out of the page.
 */
export function WelcomeScreen() {
  return <Image source={Images.welcomeScreenImg} resizeMode="stretch" style={styles.art} />;
}

const styles = StyleSheet.create({ art: { flex: 1, width: '100%' } });
