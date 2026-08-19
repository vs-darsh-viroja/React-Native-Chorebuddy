import type { ImageSourcePropType } from 'react-native';
import { Images } from '@/constants/assets';

export type ZonePalette = { top: string; bottom: string; border: string };
export type ZoneDefinition = { name: string; iconAsset: string; palette: number };
export type ZoneSection = { title: string; items: ZoneDefinition[] };
export const zonePalettes: ZonePalette[] = [
  { top: '#C2ECFF', bottom: '#32ADE6', border: '#32ADE6' }, { top: '#DDC2FF', bottom: '#D67DFF', border: '#D67DFF' },
  { top: '#A1FFE9', bottom: '#00B792', border: '#00B792' }, { top: '#FFE2B4', bottom: '#E9950D', border: '#E9950D' },
  { top: '#FFB2B2', bottom: '#ED595B', border: '#ED595B' }, { top: '#C2D0FF', bottom: '#7D83FF', border: '#7D83FF' },
  { top: '#92EFFF', bottom: '#4DA4B3', border: '#4DA4B3' }, { top: '#E1FF8D', bottom: '#799F43', border: '#799F43' },
  { top: '#FFDDF4', bottom: '#E57EC4', border: '#E57EC4' }, { top: '#C2F0FF', bottom: '#4C8AFF', border: '#4C8AFF' },
  { top: '#D5FCD6', bottom: '#6DC76F', border: '#6DC76F' }, { top: '#E2E2E2', bottom: '#7B7B7B', border: '#7B7B7B' },
];
export const zoneIcons: ImageSourcePropType[] = [Images.zone1Icon, Images.zone2Icon, Images.zone3Icon, Images.zone4Icon, Images.zone5Icon, Images.zone6Icon, Images.zone7Icon, Images.zone8Icon, Images.zone9Icon, Images.zone10Icon, Images.zone11Icon, Images.zone12Icon, Images.zone13Icon, Images.zone14Icon, Images.zone15Icon, Images.zone16Icon, Images.zone17Icon, Images.zone18Icon, Images.zone19Icon, Images.zone20Icon, Images.zone21Icon, Images.zone22Icon, Images.zone23Icon, Images.zone24Icon, Images.zone25Icon, Images.zone26Icon, Images.zone27Icon, Images.zone28Icon, Images.zone29Icon, Images.zone30Icon, Images.zone31Icon, Images.zone32Icon, Images.zone33Icon, Images.zone34Icon, Images.zone35Icon, Images.zone36Icon, Images.zone37Icon, Images.zone38Icon, Images.zone39Icon, Images.zone40Icon, Images.zone41Icon, Images.zone42Icon];
export const zoneIcon = (asset: string) => zoneIcons[Math.max(0, Number(asset.replace(/\D/g, '')) - 1)] ?? zoneIcons[0];
export const predefinedZoneSections: ZoneSection[] = [
  { title: 'Core Home Areas', items: [
    { name: 'Living room', iconAsset: 'zone1Icon', palette: 0 }, { name: 'Bedroom', iconAsset: 'zone2Icon', palette: 1 }, { name: 'Kitchen', iconAsset: 'zone3Icon', palette: 3 }, { name: 'Bathroom', iconAsset: 'zone4Icon', palette: 2 },
    { name: 'Dining Area', iconAsset: 'zone5Icon', palette: 5 }, { name: 'Entryway', iconAsset: 'zone6Icon', palette: 10 }, { name: 'Kids Room', iconAsset: 'zone7Icon', palette: 8 }, { name: 'Guest Room', iconAsset: 'zone8Icon', palette: 2 },
  ] },
  { title: 'Utility & Functional Zones', items: [
    { name: 'Laundry Room', iconAsset: 'zone9Icon', palette: 0 }, { name: 'Garage', iconAsset: 'zone10Icon', palette: 11 }, { name: 'Basement', iconAsset: 'zone11Icon', palette: 5 }, { name: 'Closet', iconAsset: 'zone12Icon', palette: 2 },
  ] },
  { title: 'Work & Productivity Spaces', items: [
    { name: 'Workspace', iconAsset: 'zone13Icon', palette: 0 }, { name: 'Study Room', iconAsset: 'zone14Icon', palette: 1 }, { name: 'Workout Area', iconAsset: 'zone15Icon', palette: 3 }, { name: 'Gaming Zone', iconAsset: 'zone35Icon', palette: 4 },
  ] },
  { title: 'Outdoor Spaces', items: [
    { name: 'Garden', iconAsset: 'zone16Icon', palette: 10 }, { name: 'Balcony', iconAsset: 'zone17Icon', palette: 1 }, { name: 'Backyard', iconAsset: 'zone18Icon', palette: 2 },
  ] },
];
