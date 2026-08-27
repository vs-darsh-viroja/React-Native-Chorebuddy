import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { screen } from '@/theme';
import { AnimatedAppImage, AppImage } from '@/components/AppImage';

/**
 * iOS `MultiImageSlider` (paywall hero). The next image sits underneath at full
 * size while the current image on top is wiped away by a shrinking mask with
 * alternating direction. iOS effective timings with the paywall's parameters
 * (slideDuration 0.45 × 1.8 × 0.95, pauseDuration 0.12 × 1.6 × 0.95): slide
 * ≈770ms ease-in-out, pause ≈182ms, plus a 1.1s autoreversing 3.5% zoom pulse
 * on both layers.
 *
 * The wipe is expressed as a TRANSFORM, never as an animated `width`. A clip
 * view of fixed screen width slides out by `W * p` while the image inside it
 * counter-translates by `-W * p`, so the image stays screen-fixed while the
 * clip window's on-screen span shrinks — visually identical to the SwiftUI
 * mask, but transform-only, so it runs on the native driver. Animating the
 * clip's `width` (the previous approach) meant a JS-thread shadow-tree commit
 * and a Yoga layout pass on every frame of a permanently looping animation,
 * which is what made the hero stutter.
 */
const SLIDE_MS = 770;
const PAUSE_MS = 182;
const ZOOM_MS = 1100;

export function MultiImageSlider({ images, height }: { images: ImageSourcePropType[]; height: number }) {
  const [current, setCurrent] = useState(0);
  const [next, setNext] = useState(1);
  const [right, setRight] = useState(true);
  const wipe = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const nextRef = useRef(1);
  const rightRef = useRef(true);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(zoom, { toValue: 1.035, duration: ZOOM_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(zoom, { toValue: 1, duration: ZOOM_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [zoom]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const slide = () => {
      Animated.timing(wipe, { toValue: 1, duration: SLIDE_MS, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start(({ finished }) => {
        if (!finished || stopped) return;
        // Both source swaps happen while the layer being changed is invisible,
        // so neither can flash regardless of which frame React commits on.
        //
        // Now (wipe = 1) the top layer is fully clipped away, so promoting it
        // to the image the base layer is already showing changes nothing on
        // screen — and it leaves BOTH layers showing the same image.
        setCurrent(nextRef.current);
        setRight(!rightRef.current);
        rightRef.current = !rightRef.current;
        timer = setTimeout(() => {
          if (stopped) return;
          // Because both layers now show the same image, resetting the wipe
          // (top layer snaps back to full coverage) paints identical pixels
          // whether or not the native reset and the React commit land on the
          // same frame. Advancing the base underneath that full coverage is
          // likewise invisible.
          wipe.setValue(0);
          nextRef.current = (nextRef.current + 1) % images.length;
          setNext(nextRef.current);
          slide();
        }, PAUSE_MS);
      });
    };
    wipe.setValue(0);
    slide();
    return () => { stopped = true; if (timer) clearTimeout(timer); wipe.stopAnimation(); };
  }, [images.length, wipe]);

  /**
   * iOS: `.aspectRatio(contentMode: .fill).frame(..., alignment: .top).clipped()`
   * — top-anchored fill, cropping the bottom. RN `cover` center-crops instead,
   * which cuts the artwork's baked-in bottom fade, so the fill is computed
   * explicitly from the asset's dimensions.
   */
  const fills = useMemo(() => images.map(source => {
    const asset = Image.resolveAssetSource(source as number);
    const scale = Math.max(screen.width / asset.width, height / asset.height);
    const width = asset.width * scale;
    return { width, height: asset.height * scale, left: (screen.width - width) / 2 };
  }), [images, height]);

  const base = fills[next];
  const top = fills[current];
  // iOS `slidingRight` keeps the LEFT portion of the top layer and shrinks it;
  // the alternate direction keeps the right portion.
  const dir = right ? -1 : 1;
  const clipShift = wipe.interpolate({ inputRange: [0, 1], outputRange: [0, dir * screen.width] });
  const imageShift = wipe.interpolate({ inputRange: [0, 1], outputRange: [0, -dir * screen.width] });
  // Decoding a 1125px-wide PNG the instant it starts being revealed shows a
  // sliver of empty layer. Mounting the upcoming image a full cycle early puts
  // its bitmap in Fresco's cache before the base layer switches to it.
  const preload = fills[(next + 1) % images.length];

  return (
    <View style={[styles.root, { height }]}>
      <AppImage
        source={images[(next + 1) % images.length]}
        resizeMode="stretch"
        style={[styles.image, styles.preload, { left: preload.left, width: preload.width, height: preload.height }]}
      />
      <AnimatedAppImage
        source={images[next]}
        resizeMode="stretch"
        style={[styles.image, { left: base.left, width: base.width, height: base.height, transform: [{ scale: zoom }] }]}
      />
      <Animated.View style={[styles.clip, { height, transform: [{ translateX: clipShift }] }]}>
        <AnimatedAppImage
          source={images[current]}
          resizeMode="stretch"
          style={[styles.image, { left: top.left, width: top.width, height: top.height, transform: [{ translateX: imageShift }, { scale: zoom }] }]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  image: { position: 'absolute', top: 0 },
  preload: { opacity: 0 },
  clip: { position: 'absolute', top: 0, left: 0, width: screen.width, overflow: 'hidden' },
});
