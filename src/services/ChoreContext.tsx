import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useHousehold } from './HouseholdContext';
import { Analytics } from './Analytics';
import { Crashlytics } from './Crashlytics';
import { RatingManager } from './RatingManager';

export type Chore = { id: string; name: string; zoneName: string; dueDate: string; dueShort: string; dueLabel: string; dueTime: string; frequency: string; selectedDays: number[]; assignedMemberIds: string[]; reminderOn: boolean; reminderTime: string; reminderNotify: string; subtasksOn: boolean; subtasks: string[]; notes: string; photoCount: number; completed: boolean; completedTime: string };
export type CreatedZone = { id: string; name: string; iconAsset: string; colorIndex: number };
export type ChoreEvent = { id: string; choreId: string; choreName: string; zoneName: string; day: string; outcome: string };
export type ChoreOverride = { id: string; choreId: string; fromDay: string; toDay: string };
export type ChoreDraft = Omit<Chore, 'id' | 'completed' | 'completedTime' | 'photoCount'> & { photoCount?: number };
export type StatsRange = { start: string; end: string } | null;
/** iOS `choreLimitReached`/`zoneLimitReached`: free users are capped by the Remote Config limit. */
export const limitReached = (created: number, freeLimit: number, isPro: boolean) => !isPro && created >= freeLimit;
type Value = { ready: boolean; chores: Chore[]; createdZones: CreatedZone[]; hiddenZones: string[]; choreCreatedCount: number; zoneCreatedCount: number; events: ChoreEvent[]; overrides: ChoreOverride[]; todaysChores: Chore[]; todaysCompletedCount: number; isDoneToday(chore: Chore): boolean; isOverdueNow(chore: Chore): boolean; occurs(chore: Chore, day: Date): boolean; hasEvent(choreId: string, day: Date, outcome: string): boolean; isDoneOn(choreId: string, day: Date): boolean; isSnoozed(choreId: string, fromDay: Date): boolean; markAllTodayUndone(): Promise<void>; markAllDone(zoneName: string): Promise<void>; deleteZone(zoneName: string): Promise<void>; statsEvents(memberIds: string[], zones: string[], range: StatsRange): ChoreEvent[]; overviewChores(memberIds: string[], zones: string[]): Chore[]; currentStreak(memberIds: string[]): number; bestStreak(memberIds: string[]): number; averageStreak(memberIds: string[]): number; weekStatuses(events: ChoreEvent[], memberIds: string[]): Array<{ name: string; outcome: string }>; deleteChoreEvents(choreId: string): Promise<void>; eventFor(choreId: string, day: Date): ChoreEvent | undefined; setOccurrenceStatus(chore: Chore, day: Date, outcome: 'done' | 'skipped' | null, time?: string): Promise<void>; snoozeOccurrence(chore: Chore, fromDay: Date, toDay: Date): Promise<void>; resetSnooze(chore: Chore, fromDay: Date): Promise<void>; saveChore(draft: ChoreDraft): Promise<string | null>; updateChore(choreId: string, changes: Partial<Omit<Chore, 'id'>>): Promise<boolean>; skipToday(chore: Chore, day?: Date): Promise<void>; setCompleted(chore: Chore, done: boolean): Promise<void>; deleteChore(chore: Chore): Promise<void>; markAllTodayDone(): Promise<void>; saveZone(name: string, iconAsset: string, colorIndex: number): Promise<void>; updateZone(zone: CreatedZone, name: string, iconAsset: string, colorIndex: number): Promise<void>; unskipOccurrence(chore: Chore, day: Date): Promise<void>; convertPredefinedZone(oldName: string, newName: string, iconAsset: string, colorIndex: number): Promise<void> };
const Context = createContext<Value | null>(null); const db = firestore();
const text = (data: FirebaseFirestoreTypes.DocumentData, key: string, fallback = '') => String(data[key] ?? fallback);
/**
 * Firestore's `orderBy` DROPS any document that lacks the ordered field, and a
 * `serverTimestamp()` write leaves `createdAt` unresolved on the local snapshot
 * until the server acknowledges it. A chore that was just created could
 * therefore be absent from an `orderBy('createdAt')` query — saved in Firestore
 * but never delivered to the UI. Read the collections unordered and sort here
 * instead; unresolved writes sort last (newest), which is where a brand-new
 * chore belongs anyway.
 */
const byCreatedAt = (docs: FirebaseFirestoreTypes.QueryDocumentSnapshot[]) =>
  [...docs].sort((a, b) => {
    const at = a.data()?.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    const bt = b.data()?.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

/**
 * Every listener previously passed only a success callback, so a rules
 * rejection or a failed query was swallowed and the screen just stayed empty
 * with no clue why. Surface it instead.
 */
const listenerError = (label: string) => (error: Error) => {
  console.warn(`[ChoreContext] ${label} listener failed: ${error.message}`);
  Crashlytics.record(error);
};

const parseChore = (doc: FirebaseFirestoreTypes.DocumentSnapshot): Chore | null => { const data = doc.data(); if (!data) return null; return { id: doc.id, name: text(data, 'name'), zoneName: text(data, 'zoneName'), dueDate: text(data, 'dueDate'), dueShort: text(data, 'dueShort'), dueLabel: text(data, 'dueLabel'), dueTime: text(data, 'dueTime'), frequency: text(data, 'frequency', 'One Time'), selectedDays: Array.isArray(data.selectedDays) ? data.selectedDays.map(Number) : [], assignedMemberIds: Array.isArray(data.assignedMemberIds) ? data.assignedMemberIds.map(String) : [], reminderOn: Boolean(data.reminderOn), reminderTime: text(data, 'reminderTime'), reminderNotify: text(data, 'reminderNotify'), subtasksOn: Boolean(data.subtasksOn), subtasks: Array.isArray(data.subtasks) ? data.subtasks.map(String) : [], notes: text(data, 'notes'), photoCount: Number(data.photoCount ?? 0), completed: Boolean(data.completed), completedTime: text(data, 'completedTime') }; };
/**
 * Chores store their due date as "d MMMM, yyyy". This used to hand
 * `new Date("August 27, 2026 00:00:00")` to the engine, which iOS's
 * JavaScriptCore parses but **Hermes does not** — that format is
 * implementation-defined, and Hermes only handles ISO 8601, returning
 * `Invalid Date`. Every chore then failed `choreOccurs` (`if (!anchor) return
 * false`), so Home and Chart showed nothing on Android while the same account
 * displayed the chores correctly on iOS. Build the date from its components.
 */
const parseDate = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}) ([A-Za-z]+),? (\d{4})$/);
  if (!match) return null;
  const month = monthNames.findIndex(name => name.toLowerCase() === match[2].toLowerCase());
  if (month < 0) return null;
  const result = new Date(Number(match[3]), month, Number(match[1]));
  return Number.isNaN(result.getTime()) ? null : result;
};
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * iOS `ChoreStore.dueFields(for:)` — the six fields that move together whenever a
 * chore's due date changes, so the stored label and state never drift from the date.
 */
function dueFields(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(date); target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  const month = monthNames[date.getMonth()];
  const state = days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming';
  const label = days < 0
    ? `Overdue by ${-days} day${-days === 1 ? '' : 's'}`
    : days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`;
  return {
    dueDate: `${date.getDate()} ${month}, ${date.getFullYear()}`,
    dueShort: `${date.getDate()} ${month.slice(0, 3)}`,
    dueLabel: label,
    dueState: state,
    completed: false,
    completedTime: '',
  };
}

/** iOS `skipOnce` step: how far the next occurrence sits after the skipped one. */
function advanceForFrequency(frequency: string, from: Date) {
  const next = new Date(from);
  if (frequency === 'Monthly') next.setMonth(next.getMonth() + 1);
  else if (frequency === 'Weekly' || frequency === 'Specific Days') next.setDate(next.getDate() + 7);
  else next.setDate(next.getDate() + 1);
  return next;
}
export function choreOccurs(chore: Chore, day: Date, overrides: ChoreOverride[] = []) {
  const key = dayKey(day); if (overrides.some(item => item.choreId === chore.id && item.toDay === key)) return true; if (overrides.some(item => item.choreId === chore.id && item.fromDay === key)) return false;
  const anchor = parseDate(chore.dueDate); if (!anchor) return false; if (sameDay(anchor, day)) return true; if (day < anchor) return false;
  const frequency = chore.frequency; if (frequency === 'Daily') return true; if (frequency === 'Weekly') return anchor.getDay() === day.getDay(); if (frequency === 'Specific Days') return chore.selectedDays.length ? chore.selectedDays.includes(day.getDay() === 0 ? 6 : day.getDay() - 1) : anchor.getDay() === day.getDay(); if (frequency === 'Monthly') return day.getDate() === Math.min(anchor.getDate(), new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate());
  const custom = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/); if (custom) { const amount=Number(custom[1]); const unit=custom[2]; if(unit==='Months') { const months=(day.getFullYear()-anchor.getFullYear())*12+day.getMonth()-anchor.getMonth(); return months>=0&&months%amount===0&&day.getDate()===Math.min(anchor.getDate(),new Date(day.getFullYear(),day.getMonth()+1,0).getDate()); } const span=Math.floor((new Date(day.getFullYear(),day.getMonth(),day.getDate()).getTime()-new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate()).getTime())/86400000); return span%(amount*(unit==='Weeks'?7:1))===0; }
  return false;
}
const occurs = choreOccurs;
export function ChoreProvider({ children }: React.PropsWithChildren) { const { household } = useHousehold(); const [chores, setChores] = useState<Chore[]>([]); const [createdZones, setZones] = useState<CreatedZone[]>([]); const [hiddenZones, setHiddenZones] = useState<string[]>([]); const [events, setEvents] = useState<ChoreEvent[]>([]); const [overrides, setOverrides] = useState<ChoreOverride[]>([]); const [counters, setCounters] = useState({ chores: 0, zones: 0 }); /** False until the chores listener has delivered its first snapshot — see the gate note in App.tsx. */ const [ready, setReady] = useState(false); const unsubs = useRef<Array<() => void>>([]); useEffect(() => { unsubs.current.forEach(fn => fn()); unsubs.current = []; setChores([]); setZones([]); setHiddenZones([]); setEvents([]); setOverrides([]); setCounters({ chores: 0, zones: 0 }); // Nothing to wait for when there is no household to read from.
    setReady(!household); if (!household) return; /*
     * Safety cap on the splash hold. Firestore persistence is on by default, so
     * after the first successful load the cached snapshot arrives in milliseconds
     * — but a first-ever launch with no cache needs the network, and an
     * unbounded wait would turn a slow connection into a stuck splash. Proceed
     * regardless after this, exactly as the app behaved before the gate existed.
     */
    const readyCap = setTimeout(() => setReady(true), 4000); const base = db.collection('households').doc(household.id); unsubs.current = [base.onSnapshot(snapshot => { const data = snapshot.data(); setCounters({ chores: Number(data?.choreCreatedCount ?? 0), zones: Number(data?.zoneCreatedCount ?? 0) }); }, listenerError('household')),base.collection('chores').onSnapshot(snapshot => { setChores(byCreatedAt(snapshot.docs).map(parseChore).filter((item): item is Chore => Boolean(item))); clearTimeout(readyCap); setReady(true); }, error => { clearTimeout(readyCap); setReady(true); listenerError('chores')(error); }), base.collection('hiddenZones').onSnapshot(snapshot => setHiddenZones(snapshot.docs.map(doc => text(doc.data(), 'name')).filter(Boolean)), listenerError('hiddenZones')), base.collection('zones').onSnapshot(snapshot => setZones(byCreatedAt(snapshot.docs).map(doc => { const data = doc.data(); return { id: doc.id, name: text(data, 'name'), iconAsset: text(data, 'iconAsset', 'zone1Icon'), colorIndex: Number(data.colorIndex ?? 0) }; })), listenerError('zones')), base.collection('choreEvents').onSnapshot(snapshot => setEvents(snapshot.docs.map(doc => { const data = doc.data(); return { id: doc.id, choreId: text(data, 'choreId'), choreName: text(data, 'choreName'), zoneName: text(data, 'zoneName'), day: text(data, 'day'), outcome: text(data, 'outcome') }; })), listenerError('choreEvents')), base.collection('choreOverrides').onSnapshot(snapshot => setOverrides(snapshot.docs.map(doc => { const data = doc.data(); return { id: doc.id, choreId: text(data, 'choreId'), fromDay: text(data, 'fromDay'), toDay: text(data, 'toDay') }; })), listenerError('choreOverrides'))]; return () => { clearTimeout(readyCap); unsubs.current.forEach(fn => fn()); }; }, [household?.id]); const today = new Date(); const todaysChores = useMemo(() => chores.filter(chore => occurs(chore, today, overrides)), [chores, overrides, dayKey(today)]); const eventFor = useCallback((choreId: string, day: Date) => events.find(event => event.choreId === choreId && event.day === dayKey(day)), [events]); const isDoneToday = useCallback((chore: Chore) => eventFor(chore.id, today)?.outcome === 'done' || (sameDay(parseDate(chore.dueDate) ?? new Date(0), today) && chore.completed), [eventFor, dayKey(today)]); const saveChore = async (draft: ChoreDraft) => { if (!household) return null; try { const base = db.collection('households').doc(household.id); const ref = base.collection('chores').doc(); await ref.set({ ...draft, photoCount: draft.photoCount ?? 0, completed: false, completedTime: '', createdAt: firestore.FieldValue.serverTimestamp() }); await base.update({ choreCreatedCount: firestore.FieldValue.increment(1) }); Analytics.choreAdded(draft.zoneName, draft.frequency); return ref.id; } catch (error) { console.warn('[ChoreContext] saveChore failed', error); Crashlytics.record(error); return null; } }; const updateChore = async (choreId: string, changes: Partial<Omit<Chore, 'id'>>) => { if (!household) return false; try { await db.collection('households').doc(household.id).collection('chores').doc(choreId).update(changes); return true; } catch { return false; } }; const setOccurrenceStatus = async (chore: Chore, day: Date, outcome: 'done' | 'skipped' | null, time?: string) => { if (!household) return; const base = db.collection('households').doc(household.id); const ref = base.collection('choreEvents').doc(`${chore.id}_${dayKey(day)}`); if (!outcome) await ref.delete(); else await ref.set({ choreId: chore.id, choreName: chore.name, zoneName: chore.zoneName, day: dayKey(day), outcome, timestamp: firestore.FieldValue.serverTimestamp() }); if (sameDay(parseDate(chore.dueDate) ?? new Date(0), day)) await base.collection('chores').doc(chore.id).update({ completed: outcome === 'done', completedTime: outcome === 'done' ? (time ?? new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })) : '' }); if (outcome === 'done') { Analytics.choreCompleted(chore.zoneName); void RatingManager.requestReviewIfNeeded(); } }; const snoozeOccurrence = async (chore: Chore, fromDay: Date, toDay: Date) => { if (!household || sameDay(fromDay, toDay)) return; const base = db.collection('households').doc(household.id); await setOccurrenceStatus(chore, fromDay, null); await base.collection('choreEvents').doc(`${chore.id}_${dayKey(fromDay)}`).set({ choreId: chore.id, choreName: chore.name, zoneName: chore.zoneName, day: dayKey(fromDay), outcome: 'paused', timestamp: firestore.FieldValue.serverTimestamp() }); await base.collection('choreOverrides').doc(`${chore.id}_${dayKey(fromDay)}`).set({ choreId: chore.id, fromDay: dayKey(fromDay), toDay: dayKey(toDay), timestamp: firestore.FieldValue.serverTimestamp() }); Analytics.choreSnoozed(chore.zoneName); }; const resetSnooze = async (chore: Chore, fromDay: Date) => { if (!household) return; const base = db.collection('households').doc(household.id); await Promise.all([base.collection('choreEvents').doc(`${chore.id}_${dayKey(fromDay)}`).delete(), base.collection('choreOverrides').doc(`${chore.id}_${dayKey(fromDay)}`).delete()]); }; const setCompleted = async (chore: Chore, done: boolean) => { await setOccurrenceStatus(chore, today, done ? 'done' : null); }; /**
   * iOS `skipOnce` — records the skip AND rolls the chore's stored due date to the
   * next occurrence. Without the roll the chore stayed pinned to the skipped date
   * and kept reporting itself overdue.
   */
  const skipToday = async (chore: Chore, day: Date = today) => {
    if (!household) return;
    const anchor = parseDate(chore.dueDate) ?? today;
    const occurrence = new Date(day); occurrence.setHours(0, 0, 0, 0);
    const anchorDay = new Date(anchor); anchorDay.setHours(0, 0, 0, 0);
    const base = anchorDay > occurrence ? anchorDay : occurrence;
    await setOccurrenceStatus(chore, base, 'skipped');
    Analytics.choreSkipped(chore.zoneName, false);
    await db.collection('households').doc(household.id).collection('chores').doc(chore.id)
      .update(dueFields(advanceForFrequency(chore.frequency, base)));
  };

  /** iOS `unskipOccurrence` — undoing a skip also pulls the due date back when the skip had pushed it forward. */
  const unskipOccurrence = async (chore: Chore, day: Date) => {
    if (!household || !events.some(event => event.choreId === chore.id && event.day === dayKey(day) && event.outcome === 'skipped')) return;
    const occurrence = new Date(day); occurrence.setHours(0, 0, 0, 0);
    await setOccurrenceStatus(chore, occurrence, null);
    const due = parseDate(chore.dueDate);
    if (!due) return;
    const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
    if (dueDay <= occurrence) return;
    await db.collection('households').doc(household.id).collection('chores').doc(chore.id).update(dueFields(occurrence));
  };

  /** iOS `skip(_:)` — the permanent delete, which also clears the chore's photo and override documents. */
  const deleteChore = async (chore: Chore) => {
    if (!household) return;
    const base = db.collection('households').doc(household.id);
    const photos = await base.collection('chores').doc(chore.id).collection('photos').get().catch(() => null);
    if (photos) await Promise.all(photos.docs.map(doc => doc.ref.delete()));
    await Promise.all(overrides.filter(item => item.choreId === chore.id).map(item => base.collection('choreOverrides').doc(item.id).delete()));
    await base.collection('chores').doc(chore.id).delete();
    Analytics.choreSkipped(chore.zoneName, true);
  }; const markAllTodayDone = async () => { const pending = todaysChores.filter(chore => !isDoneToday(chore)); await Promise.all(pending.map(chore => setCompleted(chore, true))); Analytics.markAllDone(pending.length); }; const markAllTodayUndone = async () => { await Promise.all(todaysChores.filter(isDoneToday).map(chore => setCompleted(chore, false))); }; const markAllDone = async (zoneName: string) => { const pending = todaysChores.filter(chore => chore.zoneName === zoneName && !isDoneToday(chore)); await Promise.all(pending.map(chore => setCompleted(chore, true))); Analytics.markAllDone(pending.length); };
  /** iOS `isOverdueNow`: due today, still pending, and its "h:mm a" time has passed. */
  const isOverdueNow = useCallback((chore: Chore) => { if (isDoneToday(chore) || !occurs(chore, today, overrides) || !chore.dueTime) return false; const match = chore.dueTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i); if (!match) return false; let hour = Number(match[1]) % 12; if (match[3].toUpperCase() === 'PM') hour += 12; const scheduled = new Date(); scheduled.setHours(hour, Number(match[2]), 0, 0); return new Date() > scheduled; }, [isDoneToday, overrides, dayKey(today)]);
  /** iOS `occurs`/`hasEvent`/`isDone(_:on:)`/`isSnoozed`: per-occurrence lookups for any day, not just today. */
  const occursOn = useCallback((chore: Chore, day: Date) => occurs(chore, day, overrides), [overrides]);
  const hasEvent = useCallback((choreId: string, day: Date, outcome: string) => events.some(event => event.choreId === choreId && event.day === dayKey(day) && event.outcome === outcome), [events]);
  const isDoneOn = useCallback((choreId: string, day: Date) => hasEvent(choreId, day, 'done'), [hasEvent]);
  const isSnoozed = useCallback((choreId: string, fromDay: Date) => overrides.some(override => override.choreId === choreId && override.fromDay === dayKey(fromDay)), [overrides]);
  /** iOS `statsEvents`: events whose chore overlaps the member filter, matches the zone filter, and falls inside the yyyy-MM-dd range. */
  const statsEvents = (memberIds: string[], zones: string[], range: StatsRange) => events.filter(event => {
    const assigned = chores.find(chore => chore.id === event.choreId)?.assignedMemberIds ?? [];
    const memberOK = !memberIds.length || assigned.some(id => memberIds.includes(id));
    const zoneOK = !zones.length || zones.includes(event.zoneName);
    const rangeOK = !range || (event.day >= range.start && event.day <= range.end);
    return memberOK && zoneOK && rangeOK;
  });
  const overviewChores = (memberIds: string[], zones: string[]) => chores.filter(chore => (!memberIds.length || chore.assignedMemberIds.some(id => memberIds.includes(id))) && (!zones.length || zones.includes(chore.zoneName)));
  /** iOS `isTodayPerfect`: the member-scoped set of today's chores is non-empty and fully done. */
  const isTodayPerfect = (memberIds: string[]) => { const scoped = memberIds.length ? todaysChores.filter(chore => chore.assignedMemberIds.some(id => memberIds.includes(id))) : todaysChores; return scoped.length > 0 && scoped.every(isDoneToday); };
  /** iOS `perfectStreakDays`: past days with a done event and no missed event, plus today when perfect. */
  const perfectStreakDays = (memberIds: string[]) => {
    const todayKey = dayKey(today);
    const scoped = memberIds.length ? statsEvents(memberIds, [], null) : events;
    const byDay = new Map<string, { done: boolean; missed: boolean }>();
    scoped.filter(event => event.day !== todayKey).forEach(event => { const entry = byDay.get(event.day) ?? { done: false, missed: false }; if (event.outcome === 'done') entry.done = true; if (event.outcome === 'missed') entry.missed = true; byDay.set(event.day, entry); });
    const days = new Set<string>();
    byDay.forEach((entry, day) => { if (entry.done && !entry.missed) days.add(day); });
    if (isTodayPerfect(memberIds)) days.add(todayKey);
    return days;
  };
  const shiftKey = (key: string, deltaDays: number) => { const date = new Date(`${key}T00:00:00`); date.setDate(date.getDate() + deltaDays); return dayKey(date); };
  const streakRuns = (days: Set<string>) => { const sorted = [...days].sort(); const runs: number[] = []; let run = 0; sorted.forEach((day, index) => { run = index > 0 && shiftKey(sorted[index - 1], 1) === day ? run + 1 : 1; if (index === sorted.length - 1 || shiftKey(day, 1) !== sorted[index + 1]) runs.push(run); }); return runs; };
  const currentStreak = (memberIds: string[]) => { const days = perfectStreakDays(memberIds); let key = dayKey(today); if (!days.has(key)) key = shiftKey(key, -1); let count = 0; while (days.has(key)) { count += 1; key = shiftKey(key, -1); } return count; };
  const bestStreak = (memberIds: string[]) => Math.max(0, ...streakRuns(perfectStreakDays(memberIds)));
  const averageStreak = (memberIds: string[]) => { const runs = streakRuns(perfectStreakDays(memberIds)); return runs.length ? Math.round(runs.reduce((sum, run) => sum + run, 0) / runs.length) : 0; };
  /** iOS `weekStatuses`: Monday-start current week; today reflects only whether it is perfect; otherwise missed > done > skipped. */
  const weekStatuses = (scoped: ChoreEvent[], memberIds: string[]) => {
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monday = new Date(today); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const todayKey = dayKey(today);
    const todayPerfect = isTodayPerfect(memberIds);
    return names.map((name, index) => {
      const day = new Date(monday); day.setDate(monday.getDate() + index);
      const key = dayKey(day);
      const dayEvents = scoped.filter(event => event.day === key);
      const outcome = key === todayKey
        ? (todayPerfect ? 'done' : 'none')
        : dayEvents.some(event => event.outcome === 'missed') ? 'missed'
          : dayEvents.some(event => event.outcome === 'done') ? 'done'
            : dayEvents.some(event => event.outcome === 'skipped') ? 'skipped' : 'none';
      return { name, outcome };
    });
  };
  const deleteChoreEvents = async (choreId: string) => { if (!household) return; const base = db.collection('households').doc(household.id); await Promise.all(events.filter(event => event.choreId === choreId).map(event => base.collection('choreEvents').doc(event.id).delete())); };
  /** iOS `deleteZone(named:)`: delete created-zone docs by name, hide predefined names via `hiddenZones/{name}`, and remove the zone's chores (with their photo docs). */
  const deleteZone = async (zoneName: string) => { if (!household) return; const base = db.collection('households').doc(household.id); const matching = createdZones.filter(zone => zone.name === zoneName); await Promise.all(matching.map(zone => base.collection('zones').doc(zone.id).delete())); if (!matching.length) await base.collection('hiddenZones').doc(zoneName.replace(/\//g, '-')).set({ name: zoneName, createdAt: firestore.FieldValue.serverTimestamp() }); await Promise.all(chores.filter(chore => chore.zoneName === zoneName).map(async chore => { const photos = await base.collection('chores').doc(chore.id).collection('photos').get().catch(() => null); if (photos) await Promise.all(photos.docs.map(doc => doc.ref.delete())); await base.collection('chores').doc(chore.id).delete(); })); }; const saveZone = async (name: string, iconAsset: string, colorIndex: number) => { if (!household) return; const base = db.collection('households').doc(household.id); await base.collection('zones').doc().set({ name, iconAsset, colorIndex, createdAt: firestore.FieldValue.serverTimestamp() }); await base.update({ zoneCreatedCount: firestore.FieldValue.increment(1) }); Analytics.zoneCreated(name); };

  /**
   * iOS `convertPredefinedZone` — editing one of the built-in catalog zones can't
   * update a document that doesn't exist, so it creates a real zone, hides the
   * catalog entry, and migrates the old zone's chores and events onto the new name.
   */
  const convertPredefinedZone = async (oldName: string, newName: string, iconAsset: string, colorIndex: number) => {
    if (!household) return;
    const base = db.collection('households').doc(household.id);
    await base.collection('zones').doc().set({ name: newName, iconAsset, colorIndex, createdAt: firestore.FieldValue.serverTimestamp() });
    await base.collection('hiddenZones').doc(oldName.replace(/\//g, '-')).set({ name: oldName, createdAt: firestore.FieldValue.serverTimestamp() });
    // Customizing a catalog zone is not a new zone on iOS, so it deliberately
    // does not touch `zoneCreatedCount` or count against the free zone limit.
    if (oldName === newName) return;
    const batch = db.batch();
    chores.filter(chore => chore.zoneName === oldName).forEach(chore => batch.update(base.collection('chores').doc(chore.id), { zoneName: newName }));
    events.filter(event => event.zoneName === oldName).forEach(event => batch.update(base.collection('choreEvents').doc(event.id), { zoneName: newName }));
    await batch.commit();
  }; const updateZone = async (zone: CreatedZone, name: string, iconAsset: string, colorIndex: number) => { if (!household) return; const base = db.collection('households').doc(household.id); await base.collection('zones').doc(zone.id).update({ name, iconAsset, colorIndex }); if (zone.name !== name) { const batch = db.batch(); chores.filter(chore => chore.zoneName === zone.name).forEach(chore => batch.update(base.collection('chores').doc(chore.id), { zoneName: name })); events.filter(event => event.zoneName === zone.name).forEach(event => batch.update(base.collection('choreEvents').doc(event.id), { zoneName: name })); await batch.commit(); } }; const value = useMemo<Value>(() => ({ ready, chores, createdZones, hiddenZones, choreCreatedCount: counters.chores, zoneCreatedCount: counters.zones, events, overrides, todaysChores, todaysCompletedCount: todaysChores.filter(isDoneToday).length, isDoneToday, isOverdueNow, occurs: occursOn, hasEvent, isDoneOn, isSnoozed, markAllTodayUndone, markAllDone, deleteZone, statsEvents, overviewChores, currentStreak, bestStreak, averageStreak, weekStatuses, deleteChoreEvents, eventFor, setOccurrenceStatus, snoozeOccurrence, resetSnooze, saveChore, updateChore, skipToday, setCompleted, deleteChore, markAllTodayDone, saveZone, updateZone, unskipOccurrence, convertPredefinedZone }), [ready, chores, createdZones, hiddenZones, counters, events, overrides, todaysChores, isDoneToday, isOverdueNow, eventFor, household]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useChores() { const value = useContext(Context); if (!value) throw new Error('useChores must be used within ChoreProvider'); return value; }
