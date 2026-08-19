import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

GoogleSignin.configure({ webClientId: '131458540102-g56h4ushpgsvjt38egsja0f7h97skkns.apps.googleusercontent.com' });

type AuthValue = { loading: boolean; user: FirebaseAuthTypes.User | null; signInGoogle(): Promise<void>; signOut(): Promise<void>; deleteAccount(): Promise<void> };
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  useEffect(() => auth().onAuthStateChanged(next => { setUser(next); setLoading(false); }), []);
  const value = useMemo<AuthValue>(() => ({ loading, user, signInGoogle: async () => { await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true }); const result = await GoogleSignin.signIn(); const idToken = result.data?.idToken; if (!idToken) throw new Error('Google Sign-In did not return an ID token.'); await auth().signInWithCredential(auth.GoogleAuthProvider.credential(idToken)); }, signOut: async () => { await GoogleSignin.signOut().catch(() => undefined); await auth().signOut(); }, deleteAccount: async () => { const current = auth().currentUser; if (!current) return; await current.delete(); await GoogleSignin.signOut().catch(() => undefined); } }), [loading, user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
