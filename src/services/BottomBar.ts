import { useSyncExternalStore } from 'react';

/**
 * iOS `AppState.hideBottomBar`, which `MainView` reads to hide `BottomTabs`
 * while a sheet is up (`ScheduleView.openMember/openFilter`,
 * `StatsView.openFilter`, and every pushed destination set it).
 *
 * Kept as a counter rather than a boolean so a sheet presented from another
 * sheet — Add Chore's member sheet opening Create Profile, Stats' filter
 * opening the range picker — cannot un-hide the bar when only the inner one
 * closes. `useSheetAnimation` drives this, so every sheet in the app is covered
 * without each call site having to remember, which is the part iOS gets wrong
 * by hand-writing it at each site.
 */
let depth = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export const bottomBar = {
  hide() { depth += 1; emit(); },
  show() { depth = Math.max(0, depth - 1); emit(); },
  isHidden: () => depth > 0,
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
};

export function useBottomBarHidden() {
  return useSyncExternalStore(bottomBar.subscribe, bottomBar.isHidden, bottomBar.isHidden);
}
