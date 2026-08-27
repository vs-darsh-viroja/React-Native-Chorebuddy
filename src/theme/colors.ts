export const colors = {
  background: '#FBF7FD',
  purple: '#9871E8',
  purpleEdge: '#7345AE',
  text: '#1F1F1F',
  white: '#FFFFFF',
  success: '#2DA100',
  danger: '#FF5757',
  warning: '#FB8C07',
  blue: '#3F81FF',
  pink: '#FB4786',
} as const;

/** iOS `Color("card1")`…`card10"` — the per-member accent ring/tint used by the Chart and download sheets. */
export const cardColors = ['#9871E8', '#FD9A02', '#5E9BFF', '#00B0AC', '#FF63B0', '#C547FF', '#06B6D4', '#6366F1', '#FFB20B', '#A16207'] as const;
export const cardColor = (index: number) => cardColors[((index % cardColors.length) + cardColors.length) % cardColors.length];
