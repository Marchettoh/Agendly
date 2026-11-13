import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getFirebase } from './firebase';
import { detectTimezone } from './time';
import type { UserProfile } from './types';

const profileRef = (uid: string) => doc(getFirebase().db, 'users', uid);

export async function ensureProfile(user: User, displayName?: string): Promise<void> {
  const ref = profileRef(user.uid);
  const snap = await getDoc(ref).catch(() => null);
  if (snap?.exists()) return;
  const profile: UserProfile = {
    displayName: displayName ?? user.displayName ?? user.email?.split('@')[0] ?? '',
    email: user.email ?? '',
    timezone: detectTimezone(),
    notificationsEnabled: false,
    theme: 'system',
  };
  await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
}

export function subscribeProfile(uid: string, cb: (p: UserProfile | null) => void, onError: (e: Error) => void) {
  return onSnapshot(profileRef(uid), (s) => cb(s.exists() ? (s.data() as UserProfile) : null), onError);
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  const write = setDoc(profileRef(uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
  if (!navigator.onLine) {
    write.catch(console.error);
    return;
  }
  await write;
}
