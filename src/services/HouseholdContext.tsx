import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { Analytics } from './Analytics';

export type Household = { id: string; name: string; inviteCode: string; adminUserId: string };
export type HouseholdMember = { id: string; name: string; avatar: string; photoData?: string; isAdmin: boolean; claimedByUserId?: string | null };
export type HouseholdLoadState = 'unknown' | 'loading' | 'noHousehold' | 'ready';

type HouseholdValue = {
  loadState: HouseholdLoadState; household: Household | null; members: HouseholdMember[]; myMemberId: string | null; isWorking: boolean; error: string | null;
  clearError(): void; createHousehold(name: string, adminName: string, adminAvatar: string, memberNames: string[]): Promise<void>;
  lookupHousehold(code: string): Promise<{ household: Household; members: HouseholdMember[] } | null>;
  claimMember(householdId: string, memberId: string, displayName: string): Promise<void>;
  createAndClaimMember(householdId: string, name: string, avatar: string): Promise<void>;
  addMember(name: string, avatar: string, photoData?: string): Promise<void>; updateMember(id: string, name: string, avatar: string, photoData?: string): Promise<void>; deleteMember(id: string): Promise<void>; makeAdmin(id: string): Promise<void>; leaveHousehold(): Promise<void>; leaveDeletesHousehold: boolean; leaveMessage: string;
};

const Context = createContext<HouseholdValue | null>(null);
const db = firestore();
const avatars = Array.from({ length: 17 }, (_, index) => `member${index + 1}`);
const parseHousehold = (doc: FirebaseFirestoreTypes.DocumentSnapshot): Household | null => {
  const data = doc.data(); if (!data) return null;
  return { id: doc.id, name: String(data.name ?? ''), inviteCode: String(data.inviteCode ?? ''), adminUserId: String(data.adminUserId ?? '') };
};
const parseMember = (doc: FirebaseFirestoreTypes.DocumentSnapshot): HouseholdMember | null => {
  const data = doc.data(); if (!data) return null;
  return { id: doc.id, name: String(data.name ?? ''), avatar: String(data.avatar ?? 'member1'), photoData: data.photoData ? String(data.photoData) : undefined, isAdmin: Boolean(data.isAdmin), claimedByUserId: data.claimedByUserId ? String(data.claimedByUserId) : null };
};
const randomCode = () => { const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); };

export function HouseholdProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const [loadState, setLoadState] = useState<HouseholdLoadState>('unknown'); const [household, setHousehold] = useState<Household | null>(null); const [members, setMembers] = useState<HouseholdMember[]>([]); const [myMemberId, setMyMemberId] = useState<string | null>(null); const [isWorking, setWorking] = useState(false); const [error, setError] = useState<string | null>(null);
  const unsubscribers = useRef<Array<() => void>>([]);
  const detach = useCallback(() => { unsubscribers.current.forEach(fn => fn()); unsubscribers.current = []; }, []);

  // Listeners read these through refs so the callbacks never close over a stale
  // uid or member id.
  const uidRef = useRef<string | null>(null); uidRef.current = user?.uid ?? null;
  const myMemberIdRef = useRef<string | null>(null); myMemberIdRef.current = myMemberId;

  /**
   * iOS `handleRemovedFromHousehold` — the household was deleted, or an admin
   * removed this profile. Drop the stale pointer in `users/{uid}` so the next
   * launch goes to household setup instead of attaching to a document that is gone.
   */
  const handleRemoved = useCallback(() => {
    detach();
    if (uidRef.current) void db.collection('users').doc(uidRef.current).set({ currentHouseholdId: '', memberId: '' }, { merge: true });
    setHousehold(null); setMembers([]); setMyMemberId(null); setError(null); setWorking(false); setLoadState('noHousehold');
  }, [detach]);

  const attach = useCallback((householdId: string) => {
    detach(); const ref = db.collection('households').doc(householdId);
    unsubscribers.current = [
      ref.onSnapshot(snapshot => { const parsed = parseHousehold(snapshot); if (parsed) { setHousehold(parsed); setLoadState('ready'); setWorking(false); } else if (!snapshot.metadata.fromCache) { handleRemoved(); } }, next => { setError(next.message); setLoadState('noHousehold'); }),
      ref.collection('members').orderBy('createdAt').onSnapshot(snapshot => {
        const parsed = snapshot.docs.map(parseMember).filter((value): value is HouseholdMember => Boolean(value));
        const mine = myMemberIdRef.current;
        if (mine && !snapshot.metadata.fromCache && parsed.length && !parsed.some(member => member.id === mine)) { handleRemoved(); return; }
        setMembers(parsed);
      }, next => setError(next.message)),
    ];
  }, [detach, handleRemoved]);
  useEffect(() => {
    detach(); setHousehold(null); setMembers([]); setMyMemberId(null); setError(null);
    if (!user) { setLoadState('unknown'); return detach; }
    setLoadState('loading');
    void db.collection('users').doc(user.uid).get().then(async userDoc => { const data = userDoc.data(); const householdId = String(data?.currentHouseholdId ?? ''); const memberId = String(data?.memberId ?? ''); if (!householdId) { setLoadState('noHousehold'); return; } const householdDoc = await db.collection('households').doc(householdId).get({ source: 'server' }); if (!householdDoc.exists()) { await db.collection('users').doc(user.uid).set({ currentHouseholdId: '', memberId: '' }, { merge: true }); setLoadState('noHousehold'); return; } setMyMemberId(memberId || null); attach(householdId); }).catch(next => { setError(next.message); setLoadState('noHousehold'); });
    return detach;
  }, [attach, detach, user]);
  const uniqueCode = async () => { for (let i = 0; i < 10; i += 1) { const code = randomCode(); const snapshot = await db.collection('households').where('inviteCode', '==', code).limit(1).get(); if (snapshot.empty) return code; } return `${randomCode()}${Math.floor(10 + Math.random() * 90)}`; };
  const createHousehold = async (name: string, adminName: string, adminAvatar: string, memberNames: string[]) => {
    if (!user) return; setWorking(true); setError(null);
    try { const code = await uniqueCode(); const ref = db.collection('households').doc(); await ref.set({ name, inviteCode: code, adminUserId: user.uid, adminUserIds: [user.uid], createdAt: firestore.FieldValue.serverTimestamp() }); const admin = ref.collection('members').doc(); await admin.set({ name: adminName, avatar: adminAvatar, isAdmin: true, claimedByUserId: user.uid, createdAt: firestore.FieldValue.serverTimestamp() }); for (let index = 0; index < memberNames.length; index += 1) await ref.collection('members').doc().set({ name: memberNames[index], avatar: avatars[(index + 1) % avatars.length], isAdmin: false, claimedByUserId: null, createdAt: firestore.FieldValue.serverTimestamp() }); await db.collection('users').doc(user.uid).set({ currentHouseholdId: ref.id, memberId: admin.id, displayName: adminName }, { merge: true }); setMyMemberId(admin.id); Analytics.householdCreated(memberNames.length + 1); attach(ref.id); } catch (next) { setError(next instanceof Error ? next.message : String(next)); setWorking(false); }
  };
  const lookupHousehold = async (code: string) => { setWorking(true); setError(null); try { const snapshot = await db.collection('households').where('inviteCode', '==', code.trim().toUpperCase()).limit(1).get(); const doc = snapshot.docs[0]; if (!doc) { setError('No household found for that code.'); setWorking(false); return null; } const found = parseHousehold(doc); if (!found) return null; const memberSnapshot = await doc.ref.collection('members').get(); setWorking(false); return { household: found, members: memberSnapshot.docs.map(parseMember).filter((value): value is HouseholdMember => Boolean(value)) }; } catch (next) { setError(next instanceof Error ? next.message : String(next)); setWorking(false); return null; } };
  const finishClaim = async (householdId: string, memberId: string, displayName: string) => { if (!user) return; await db.collection('users').doc(user.uid).set({ currentHouseholdId: householdId, memberId, displayName }, { merge: true }); setMyMemberId(memberId); Analytics.householdJoined(); attach(householdId); };
  const claimMember = async (householdId: string, memberId: string, displayName: string) => { if (!user) return; setWorking(true); setError(null); try { await db.collection('households').doc(householdId).collection('members').doc(memberId).update({ claimedByUserId: user.uid }); await finishClaim(householdId, memberId, displayName); } catch (next) { setError(next instanceof Error ? next.message : String(next)); setWorking(false); } };
  const createAndClaimMember = async (householdId: string, name: string, avatar: string) => { if (!user) return; setWorking(true); setError(null); try { const member = db.collection('households').doc(householdId).collection('members').doc(); await member.set({ name, avatar, photoData: '', isAdmin: false, claimedByUserId: user.uid, createdAt: firestore.FieldValue.serverTimestamp() }); await finishClaim(householdId, member.id, name); } catch (next) { setError(next instanceof Error ? next.message : String(next)); setWorking(false); } };
  const memberRef = (id: string) => db.collection('households').doc(household!.id).collection('members').doc(id);
  const addMember = async (name: string, avatar: string, photoData = '') => { if (!household) return; const ref = memberRef(db.collection('_').doc().id); await ref.set({ name, avatar, photoData, isAdmin: false, claimedByUserId: null, createdAt: firestore.FieldValue.serverTimestamp() }); };
  const updateMember = async (id: string, name: string, avatar: string, photoData = '') => { if (!household) return; await memberRef(id).set({ name, avatar, photoData }, { merge: true }); };
  const deleteMember = async (id: string) => { if (!household) return; const target = members.find(item => item.id === id); if (!target || target.isAdmin) throw new Error('Admin profiles cannot be deleted.'); await memberRef(id).delete(); };
  const makeAdmin = async (id: string) => { if (!household || !user || !members.find(item => item.id === myMemberId)?.isAdmin) return; const target = members.find(item => item.id === id); if (!target?.claimedByUserId) throw new Error('This member must join before becoming an admin.'); const batch = db.batch(); batch.update(memberRef(id), { isAdmin: true }); batch.update(db.collection('households').doc(household.id), { adminUserIds: firestore.FieldValue.arrayUnion(target.claimedByUserId) }); await batch.commit(); };
  /** iOS `performLeaveCleanup`: with other claimed members, unclaim + hand admin over; as the last claimed member, cascade-delete the whole household like iOS `deleteHouseholdCascade`. */
  const leaveHousehold = async () => { if (!household || !user || !myMemberId) return; const me = members.find(item => item.id === myMemberId); const others = members.filter(item => item.id !== myMemberId && item.claimedByUserId); const houseRef = db.collection('households').doc(household.id); detach(); setHousehold(null); setMembers([]); setMyMemberId(null); setLoadState('noHousehold'); if (others.length) { const batch = db.batch(); batch.update(memberRef(myMemberId), { claimedByUserId: null, isAdmin: false }); if (me?.isAdmin) { const heir = others.find(item => item.isAdmin) ?? others[0]; batch.update(memberRef(heir.id), { isAdmin: true }); batch.update(houseRef, { adminUserId: heir.claimedByUserId, adminUserIds: firestore.FieldValue.arrayRemove(user.uid) }); } batch.set(db.collection('users').doc(user.uid), { currentHouseholdId: '', memberId: '' }, { merge: true }); await batch.commit(); } else { for (const sub of ['chores', 'zones', 'hiddenZones', 'choreEvents', 'choreOverrides', 'members']) { const snapshot = await houseRef.collection(sub).get().catch(() => null); if (!snapshot) continue; for (const doc of snapshot.docs) { if (sub === 'chores') { const photos = await doc.ref.collection('photos').get().catch(() => null); if (photos) await Promise.all(photos.docs.map(photo => photo.ref.delete())); } await doc.ref.delete(); } } await houseRef.delete(); await db.collection('users').doc(user.uid).set({ currentHouseholdId: '', memberId: '' }, { merge: true }); } };
  const otherClaimed = members.filter(item => item.id !== myMemberId && item.claimedByUserId);
  const leaveDeletesHousehold = otherClaimed.length === 0;
  const leaveNeedsHandover = Boolean(members.find(item => item.id === myMemberId)?.isAdmin) && !leaveDeletesHousehold && otherClaimed.every(item => !item.isAdmin);
  /** iOS `leaveMessage` verbatim. */
  const leaveMessage = (() => { const name = household?.name ?? 'this household'; if (leaveDeletesHousehold) return `You're the only member, so leaving will permanently delete "${name}" and all its chores and zones. This can't be undone.`; if (leaveNeedsHandover) return `You'll no longer be the admin of "${name}" — ${otherClaimed[0]?.name ?? 'the next member'} will become the new admin. Your profile stays as an open slot, and you can rejoin later with the invite code.`; return `Leave "${name}"? Your profile stays as an open slot, and you can rejoin later with the invite code.`; })();
  const value = useMemo<HouseholdValue>(() => ({ loadState, household, members, myMemberId, isWorking, error, clearError: () => setError(null), createHousehold, lookupHousehold, claimMember, createAndClaimMember, addMember, updateMember, deleteMember, makeAdmin, leaveHousehold, leaveDeletesHousehold, leaveMessage }), [loadState, household, members, myMemberId, isWorking, error, attach, user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useHousehold() { const value = useContext(Context); if (!value) throw new Error('useHousehold must be used within HouseholdProvider'); return value; }
