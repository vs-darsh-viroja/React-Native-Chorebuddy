import { useEffect, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { choreOccurs, useChores } from './ChoreContext';
import { useHousehold } from './HouseholdContext';

const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function MissedEventBackfill() {
  const { household } = useHousehold(); const store = useChores(); const running = useRef(false);
  useEffect(() => {
    if (!household || running.current || !store.chores.length) return;
    const today = new Date(); today.setHours(0, 0, 0, 0); const horizon = new Date(today); horizon.setDate(horizon.getDate() - 90);
    const existing = new Set(store.events.map(event => `${event.choreId}_${event.day}`)); const missing: Array<{ choreId: string; name: string; zone: string; day: string }> = [];
    for (const chore of store.chores) { const cursor = new Date(horizon); while (cursor < today) { const day = key(cursor); if (choreOccurs(chore, cursor, store.overrides) && !existing.has(`${chore.id}_${day}`)) missing.push({ choreId: chore.id, name: chore.name, zone: chore.zoneName, day }); cursor.setDate(cursor.getDate() + 1); } }
    if (!missing.length) return; running.current = true; const db = firestore(); const base = db.collection('households').doc(household.id); const chunks = Array.from({ length: Math.ceil(missing.length / 400) }, (_, index) => missing.slice(index * 400, index * 400 + 400));
    void (async () => { for (const chunk of chunks) { const batch = db.batch(); chunk.forEach(item => batch.set(base.collection('choreEvents').doc(`${item.choreId}_${item.day}`), { choreId: item.choreId, choreName: item.name, zoneName: item.zone, day: item.day, outcome: 'missed', timestamp: firestore.FieldValue.serverTimestamp() })); await batch.commit(); } })().finally(() => { running.current = false; });
  }, [household, store.chores, store.events, store.overrides]);
  return null;
}
