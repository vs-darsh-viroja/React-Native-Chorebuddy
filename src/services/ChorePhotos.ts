import firestore from '@react-native-firebase/firestore';

export let pendingChorePhotos: string[] = [];
export const setPendingChorePhotos = (photos: string[]) => { pendingChorePhotos = photos; };
export const clearPendingChorePhotos = () => { pendingChorePhotos = []; };

const collection = (householdId: string, choreId: string) => firestore().collection('households').doc(householdId).collection('chores').doc(choreId).collection('photos');
export async function loadChorePhotos(householdId: string, choreId: string) { const snap = await collection(householdId, choreId).orderBy('index').get(); return snap.docs.map(doc => String(doc.data().data ?? '')).filter(Boolean); }
export async function replaceChorePhotos(householdId: string, choreId: string, photos: string[]) { const col = collection(householdId, choreId); const old = await col.get(); const batch = firestore().batch(); old.docs.forEach(doc => batch.delete(doc.ref)); photos.forEach((data, index) => batch.set(col.doc(String(index)), { index, data })); batch.update(firestore().collection('households').doc(householdId).collection('chores').doc(choreId), { photoCount: photos.length }); await batch.commit(); }
export async function attachPhotosToNewestChore(householdId: string, name: string, photos: string[]) { if (!photos.length) return; const snap = await firestore().collection('households').doc(householdId).collection('chores').where('name', '==', name).get(); const target = snap.docs.sort((a, b) => Number(b.data().createdAt?.toMillis?.() ?? 0) - Number(a.data().createdAt?.toMillis?.() ?? 0))[0]; if (target) await replaceChorePhotos(householdId, target.id, photos); }
