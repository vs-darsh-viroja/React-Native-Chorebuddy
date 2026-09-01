import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Port of iOS `TimerManager` — the 24-hour countdown behind the gift offer.
 *
 * The window starts the first time the app runs and survives relaunches, so the
 * offer really does expire once. Before this, Android restarted the countdown at
 * a hardcoded 23:15:23 on every mount and never expired, which meant the
 * "limited time" banner ran forever.
 */
const COUNTDOWN_MS = 24 * 60 * 60 * 1000;
const startKey = 'countdown_start_date';
const expiredKey = 'isCountdownExpired';

/**
 * `ready` is false until the stored start date has been read back.
 *
 * iOS's `TimerManager` reads `UserDefaults` synchronously in its initialiser, so
 * `isExpired` is correct on the first render. AsyncStorage is a promise, so without
 * this flag every consumer sees `isExpired: false` first — the "offer is live"
 * state — and only corrects itself a frame later, which is half of why the gift
 * banner appeared and then vanished.
 */
type GiftTimerValue = { hours: number; minutes: number; seconds: number; isExpired: boolean; ready: boolean };

const zero: GiftTimerValue = { hours: 0, minutes: 0, seconds: 0, isExpired: false, ready: false };
const Context = createContext<GiftTimerValue>(zero);

const split = (remainingMs: number) => {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor(total / 60) % 60, seconds: total % 60, isExpired: false, ready: true };
};

export function GiftTimerProvider({ children }: React.PropsWithChildren) {
  const [state, setState] = useState<GiftTimerValue>(zero);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const expire = () => {
      void AsyncStorage.setItem(expiredKey, 'true');
      startedAt.current = null;
      if (alive) setState({ ...zero, isExpired: true, ready: true });
    };

    const tick = () => {
      if (startedAt.current === null) return;
      const remaining = startedAt.current + COUNTDOWN_MS - Date.now();
      if (remaining <= 0) expire();
      else if (alive) setState(split(remaining));
    };

    void (async () => {
      const [expired, stored] = await Promise.all([AsyncStorage.getItem(expiredKey), AsyncStorage.getItem(startKey)]);
      if (!alive) return;
      if (expired === 'true') { setState({ ...zero, isExpired: true, ready: true }); return; }

      const parsed = Number(stored);
      if (stored && Number.isFinite(parsed)) {
        if (Date.now() - parsed >= COUNTDOWN_MS) { expire(); return; }
        startedAt.current = parsed;
      } else {
        startedAt.current = Date.now();
        await AsyncStorage.setItem(startKey, String(startedAt.current));
      }
      tick();
      timer = setInterval(tick, 1000);
    })();

    // A backgrounded interval drifts, so recompute from the stored start date
    // whenever the app comes back to the foreground.
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') tick(); });

    return () => { alive = false; if (timer) clearInterval(timer); subscription.remove(); };
  }, []);

  const value = useMemo(() => state, [state.hours, state.minutes, state.seconds, state.isExpired, state.ready]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useGiftTimer() { return useContext(Context); }
