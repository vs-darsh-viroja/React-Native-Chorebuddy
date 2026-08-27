import React, { forwardRef } from 'react';
import { Animated, Image, ImageBackground, type ImageBackgroundProps, type ImageProps } from 'react-native';

/**
 * Android's `Image` cross-fades every bitmap in over **300 ms** — that is React
 * Native's `fadeDuration` default, and it is Android-only. iOS has no equivalent,
 * which is exactly why icons look like they blink or pop in here but not on the
 * iOS build: every PNG mounts transparent and ramps to opaque. Inside an entrance
 * animation the two overlap and read as a jerk.
 *
 * `fadeDuration` is a per-Image prop with no global setting, and React 19 dropped
 * `defaultProps` for function components, so the only reliable way to turn it off
 * everywhere is to funnel every image through this wrapper. It is otherwise a
 * transparent pass-through: `fadeDuration` is applied before the spread, so a
 * caller that genuinely wants a fade can still pass its own value.
 *
 * SVG assets (`Images.someIcon` rendered as a component) never had this problem —
 * react-native-svg draws them synchronously.
 */
export const AppImage = forwardRef<React.ComponentRef<typeof Image>, ImageProps>(
  (props, ref) => <Image ref={ref} fadeDuration={0} {...props} />,
);
AppImage.displayName = 'AppImage';

export const AppImageBackground = forwardRef<React.ComponentRef<typeof ImageBackground>, ImageBackgroundProps>(
  (props, ref) => <ImageBackground ref={ref} fadeDuration={0} {...props} />,
);
AppImageBackground.displayName = 'AppImageBackground';

/** Drop-in for `Animated.Image`; the ref forwards to the host node so the native driver still works. */
export const AnimatedAppImage = Animated.createAnimatedComponent(AppImage);
