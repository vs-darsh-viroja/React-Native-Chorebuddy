import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
export const isPad = Math.min(width, height) >= 600;
export const isSmallDevice = height < 812;
const scale = width / (375 * (isPad ? 2 : 1));
const boosted = scale * (isPad ? 1.4 : 1);

export const s = (value: number) => value * boosted;
export const sp = s;
export const sf = (value: number) => value * boosted * (isPad ? 0.7 : 1);
export const screen = { width, height };
