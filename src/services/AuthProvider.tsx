import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { Alert } from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Analytics } from './Analytics';
import { Crashlytics } from './Crashlytics';

GoogleSignin.configure({ webClientId: '131458540102-g56h4ushpgsvjt38egsja0f7h97skkns.apps.googleusercontent.com' });

const db = firestore();

/** GMS `CommonStatusCodes.DEVELOPER_ERROR`; the native module rejects with it as a string. */
const DEVELOPER_ERROR_CODE = 10;

type AuthValue = { loading: boolean; user: FirebaseAuthTypes.User | null; signInGoogle(): Promise<void>; signOut(): Promise<void>; deleteAccount(): Promise<void> };
const Context = createContext<AuthValue | null>(null);

/**
 * Google Sign-In failures were previously invisible: the only call site fired
 * `void auth.signInGoogle()`, so a rejected promise became an unhandled
 * rejection and the button just did nothing. Android's most common failure here
 * is DEVELOPER_ERROR (GMS status 10), which means the signing certificate of the
 * running build is not registered against the Firebase Android app, so the exact
 * remedy is spelled out rather than shown as a bare code.
 */
function describeSignInError(error: unknown) {
  if (isErrorWithCode(error)) {
    if (error.code === String(DEVELOPER_ERROR_CODE)) {
      return "This build's signing certificate is not registered in Firebase, so Google could not issue an ID token. Add the build's SHA-1 fingerprint to the Firebase Android app and reinstall with a refreshed google-services.json.";
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Google Play services is unavailable or out of date on this device.';
    if (error.code === statusCodes.IN_PROGRESS) return 'A sign-in attempt is already in progress.';
  }
  return error instanceof Error && error.message ? error.message : 'Google Sign-In failed. Please try again.';
}

/**
 * iOS `AuthManager.upsertUserDocument` — every sign-in either creates the
 * `users/{uid}` profile or refreshes `lastSeenAt`. Without this the document was
 * only ever created as a side effect of household setup, so `email`,
 * `createdAt`, and `lastSeenAt` never existed on Android.
 */
async function upsertUserDocument(user: FirebaseAuthTypes.User) {
  const ref = db.collection('users').doc(user.uid);
  const snapshot = await ref.get();
  if (snapshot.exists()) {
    await ref.set({ lastSeenAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  await ref.set({
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    currentHouseholdId: '',
    createdAt: firestore.FieldValue.serverTimestamp(),
    lastSeenAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * iOS `deleteHouseholdCascade`. `choreOverrides` is included here even though the
 * iOS list omits it, because leaving override documents behind strands snooze
 * records for a household nobody can reach.
 */
async function deleteHouseholdCascade(householdId: string) {
  const houseRef = db.collection('households').doc(householdId);
  for (const sub of ['chores', 'zones', 'hiddenZones', 'choreEvents', 'choreOverrides', 'members']) {
    const snapshot = await houseRef.collection(sub).get().catch(() => null);
    if (!snapshot) continue;
    for (const doc of snapshot.docs) {
      if (sub === 'chores') {
        const photos = await doc.ref.collection('photos').get().catch(() => null);
        if (photos) await Promise.all(photos.docs.map(photo => photo.ref.delete()));
      }
      await doc.ref.delete();
    }
  }
  await houseRef.delete();
}

/**
 * iOS `transferOrDeleteHousehold` — hand the household to the next claimed
 * member, or delete it outright when nobody else has joined. Without this the
 * departing member's slot stayed claimed by a uid that no longer exists, so the
 * profile could never be claimed again.
 */
async function transferOrDeleteHousehold(uid: string) {
  const userSnapshot = await db.collection('users').doc(uid).get();
  const householdId = String(userSnapshot.data()?.currentHouseholdId ?? '');
  if (!householdId) return;

  const houseRef = db.collection('households').doc(householdId);
  const memberSnapshot = await houseRef.collection('members').orderBy('createdAt').get();
  const mine = memberSnapshot.docs.find(doc => String(doc.data().claimedByUserId ?? '') === uid);
  const remaining = memberSnapshot.docs.filter(doc => String(doc.data().claimedByUserId ?? '') !== uid);
  const nextAdmin = remaining.find(doc => Boolean(String(doc.data().claimedByUserId ?? '')));

  if (!nextAdmin) {
    await deleteHouseholdCascade(householdId);
    return;
  }

  const batch = db.batch();
  batch.update(nextAdmin.ref, { isAdmin: true });
  batch.update(houseRef, {
    adminUserId: String(nextAdmin.data().claimedByUserId ?? ''),
    adminUserIds: firestore.FieldValue.arrayUnion(String(nextAdmin.data().claimedByUserId ?? '')),
  });
  if (mine) batch.delete(mine.ref);
  await batch.commit();
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  useEffect(() => auth().onAuthStateChanged(next => { setUser(next); setLoading(false); }), []);

  // Returns null when the account chooser is dismissed, so cancelling is a
  // no-op instead of the misleading "did not return an ID token" error.
  const googleCredential = async () => {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (isCancelledResponse(result)) return null;
    const idToken = result.data?.idToken;
    if (!idToken) throw new Error('Google Sign-In did not return an ID token.');
    return auth.GoogleAuthProvider.credential(idToken);
  };

  const purge = async (current: FirebaseAuthTypes.User) => {
    await transferOrDeleteHousehold(current.uid).catch(() => undefined);
    await db.collection('users').doc(current.uid).delete().catch(() => undefined);
    await current.delete();
    Analytics.deleteAccount();
    Analytics.setUserId(null);
    Crashlytics.setUserId(null);
    await GoogleSignin.signOut().catch(() => undefined);
  };

  const value = useMemo<AuthValue>(() => ({
    loading,
    user,
    signInGoogle: async () => {
      try {
        const credential = await googleCredential();
        if (!credential) return;
        const result = await auth().signInWithCredential(credential);
        await upsertUserDocument(result.user).catch(() => undefined);
        Analytics.setUserId(result.user.uid);
        Crashlytics.setUserId(result.user.uid);
        Analytics.signIn('google');
      } catch (error) {
        Crashlytics.record(error);
        Alert.alert('Sign-In Failed', describeSignInError(error));
      }
    },
    signOut: async () => {
      await GoogleSignin.signOut().catch(() => undefined);
      await auth().signOut();
      Analytics.signOut();
      Analytics.setUserId(null);
      Crashlytics.setUserId(null);
    },
    deleteAccount: async () => {
      const current = auth().currentUser;
      if (!current) return;
      try {
        await purge(current);
      } catch (error) {
        // iOS re-runs Google sign-in when Firebase demands a fresh credential
        // before destructive account changes.
        if ((error as { code?: string }).code !== 'auth/requires-recent-login') throw error;
        const credential = await googleCredential();
        if (!credential) return;
        await current.reauthenticateWithCredential(credential);
        await purge(current);
      }
    },
  }), [loading, user]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAuth() { const value = useContext(Context); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
