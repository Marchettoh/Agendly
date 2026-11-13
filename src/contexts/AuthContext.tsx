import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile as updateAuthProfile,
  type User,
} from 'firebase/auth';
import { getFirebase, googleProvider } from '../lib/firebase';
import { ensureProfile } from '../lib/profile';
import { disablePush, isStandalone, setPushSession } from '../lib/messaging';
import { ONBOARDING_KEY } from '../pages/OnboardingPage';

interface AuthApi {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { auth } = getFirebase();
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        localStorage.setItem(ONBOARDING_KEY, '1');
        await ensureProfile(u).catch(console.error);
      }
      setPushSession(u?.uid ?? null).catch(console.error);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const api: AuthApi = {
    user,
    loading,
    login: async (email, password) => {
      await signInWithEmailAndPassword(getFirebase().auth, email.trim(), password);
    },
    register: async (name, email, password) => {
      const cred = await createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password);
      await updateAuthProfile(cred.user, { displayName: name.trim() });
      await ensureProfile(cred.user, name.trim());
    },
    loginWithGoogle: async () => {
      const { auth } = getFirebase();
      // Nelle PWA installate su iOS i popup non sono affidabili: usiamo il redirect.
      if (isStandalone()) await signInWithRedirect(auth, googleProvider);
      else await signInWithPopup(auth, googleProvider);
    },
    resetPassword: async (email) => {
      await sendPasswordResetEmail(getFirebase().auth, email.trim());
    },
    logout: async () => {
      await setPushSession(null).catch(console.error);
      if (user) await disablePush(user.uid).catch(() => undefined);
      await signOut(getFirebase().auth);
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fuori da AuthProvider');
  return ctx;
}
