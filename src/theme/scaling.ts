import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
export const isPad = Math.min(width, height) >= 600;
const scale = width / (375 * (isPad ? 2 : 1));
const boosted = scale * (isPad ? 1.4 : 1);

export const s = (value: number) => value * boosted;
export const sp = s;
export const sf = (value: number) => value * boosted * (isPad ? 0.7 : 1);
export const screen = { width, height };

/**
 * The window's height expressed in DESIGN units — `825` on the iOS 375x825 basis.
 *
 * `s()` is purely width-derived (`width / 375`), so a layout built from `s()`
 * tokens occupies `height / boosted` design units of vertical room, whatever the
 * device's pixel height happens to be. That number — not the raw dp height — is
 * what decides whether an iOS-derived vertical stack still fits.
 */
export const designHeight = height / boosted;

/**
 * iOS `isSmallDevice` (`screenSize.height < 812`) and `isSmalliphone`
 * (`< 810`), evaluated on the design-unit axis rather than the raw dp height.
 *
 * WHY NOT THE RAW HEIGHT. On iOS those two thresholds are interchangeable with
 * the design-unit form, because every iPhone is close to the 375:825 design
 * aspect ratio: the iPhone SE is 375x667 (667 design units, "small" both ways)
 * and the 13 mini is 375x812, while the 15 is 393x852 pt = 813 design units —
 * so both formulas agree on every device iOS ships to. Android's aspect ratios
 * are far wider spread, and there the raw dp height says nothing about fit:
 *
 *   - a 720x1280 phone is 360x640dp -> 667 design units. Tall enough by iOS's
 *     numbers? No — 640 < 810 — so this one happened to be caught.
 *   - a 1440x2880 phone is 411x823dp -> only 751 design units, yet 823 >= 810
 *     reads as a BIG phone and every vertical tightening switched off, which is
 *     precisely when the onboarding art ran under the title.
 *   - the moto g35 is 432x960dp -> 833 design units, genuinely roomy.
 *
 * Measuring in design units puts all three on the axis that governs, and is why
 * SC9 had to raise its own Android threshold (`SMALL_DEVICE_HEIGHT_DP = 900`) to
 * paper over the same mismatch. Both flags stay `!isPad`, matching iOS, where a
 * pad is never "small".
 *
 * Use these for screens whose vertical stack is anchored at BOTH ends (the
 * onboarding art vs its bottom copy/CTA overlay, Chore Status' header + cards):
 * they tighten spacing or scale the art down so nothing collides.
 */
export const isSmallDevice = !isPad && designHeight < 812;
export const isSmallPhone = !isPad && designHeight < 810;
/** iOS `isBigIpadDevice`: screenSize.height > 1300. */
export const isBigPad = isPad && height > 1300;
