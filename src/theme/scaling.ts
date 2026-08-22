import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
export const isPad = Math.min(width, height) >= 600;
/** iOS `isSmallDevice`: screenSize.height < 812. */
export const isSmallDevice = height < 812;
/** iOS `isSmalliphone`: screenSize.height < 810. */
export const isSmallPhone = !isPad && height < 810;
/** iOS `isBigIpadDevice`: screenSize.height > 1300. */
export const isBigPad = isPad && height > 1300;
const scale = width / (375 * (isPad ? 2 : 1));
const boosted = scale * (isPad ? 1.4 : 1);

export const s = (value: number) => value * boosted;
export const sp = s;
export const sf = (value: number) => value * boosted * (isPad ? 0.7 : 1);
export const screen = { width, height };
