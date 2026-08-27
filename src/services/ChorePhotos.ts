import firestore from '@react-native-firebase/firestore';

const collection = (householdId: string, choreId: string) => firestore().collection('households').doc(householdId).collection('chores').doc(choreId).collection('photos');

/** iOS `fetchPhotos(choreId:)` — ordered base64 payloads from `chores/{choreId}/photos`. */
export async function loadChorePhotos(householdId: string, choreId: string) {
  const snapshot = await collection(householdId, choreId).orderBy('index').get();
  return snapshot.docs.map(doc => String(doc.data().data ?? '')).filter(Boolean);
}

/**
 * Rewrites the whole photo subcollection and keeps `photoCount` in sync, which
 * is what the chore card and detail screens read. Firebase Storage is
 * intentionally unused, so the JPEGs live in Firestore as base64.
 */
export async function replaceChorePhotos(householdId: string, choreId: string, photos: string[]) {
  const target = collection(householdId, choreId);
  const existing = await target.get();
  const batch = firestore().batch();
  existing.docs.forEach(doc => batch.delete(doc.ref));
  photos.forEach((data, index) => batch.set(target.doc(String(index)), { index, data }));
  batch.update(firestore().collection('households').doc(householdId).collection('chores').doc(choreId), { photoCount: photos.length });
  await batch.commit();
}
