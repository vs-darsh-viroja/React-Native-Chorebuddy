import { sf } from './scaling';

export const fonts = {
  ultraLight: 'SFProRounded-Ultralight',
  thin: 'SFProRounded-Thin',
  light: 'SFProRounded-Light',
  regular: 'SFProRounded-Regular',
  medium: 'SFProRounded-Medium',
  semibold: 'SFProRounded-Semibold',
  bold: 'SFProRounded-Bold',
  heavy: 'SFProRounded-Heavy',
  black: 'SFProRounded-Black',
} as const;

export const font = (family: keyof typeof fonts, size: number) => ({
  fontFamily: fonts[family],
  fontSize: sf(size),
});
