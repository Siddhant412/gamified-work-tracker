import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured } from '@/src/config/env';
import { getOAuthRedirectUrl } from '@/src/lib/authRedirect';
import { supabase } from '@/src/lib/supabase';

type AuthState = {
  isReady: boolean;
  isSignedIn: boolean;
  isDemoMode: boolean;
  userId: string | null;
  userEmail: string | null;
  signInWithGoogle: () => Promise<void>;
  continueInDemoMode: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);
const demoAuthStorageKey = 'applyloop.demo-auth.v1';

WebBrowser.maybeCompleteAuthSession();

export function AuthProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      AsyncStorage.getItem(demoAuthStorageKey)
        .then((storedValue) => {
          if (!isMounted) return;
          const shouldResumeDemo = storedValue === 'true';
          setIsSignedIn(shouldResumeDemo);
          setUserId(shouldResumeDemo ? 'local-user' : null);
          setUserEmail(shouldResumeDemo ? 'you@example.com' : null);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsReady(true);
          SplashScreen.hideAsync();
        });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setIsSignedIn(Boolean(data.session));
      setUserId(data.session?.user.id ?? null);
      setUserEmail(data.session?.user.email ?? null);
      setIsReady(true);
      SplashScreen.hideAsync();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const routeGroup = segments[0];
    const inAuthGroup = routeGroup === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/sign-in');
    }

    if (isSignedIn && inAuthGroup) {
      router.replace('/');
    }
  }, [isReady, isSignedIn, router, segments]);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isSignedIn,
      isDemoMode: !isSupabaseConfigured,
      userId,
      userEmail,
      signInWithGoogle: async () => {
        if (!isSupabaseConfigured) {
          AsyncStorage.setItem(demoAuthStorageKey, 'true').catch(() => undefined);
          setIsSignedIn(true);
          setUserId('local-user');
          setUserEmail('you@example.com');
          router.replace('/');
          return;
        }

        const redirectTo = getOAuthRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: Platform.OS !== 'web',
          },
        });

        if (error) throw error;

        if (Platform.OS !== 'web' && data.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
          if (result.type === 'success' && result.url) {
            const code = new URL(result.url).searchParams.get('code');
            if (!code) throw new Error('Missing OAuth callback code.');
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      },
      continueInDemoMode: () => {
        AsyncStorage.setItem(demoAuthStorageKey, 'true').catch(() => undefined);
        setIsSignedIn(true);
        setUserId('local-user');
        setUserEmail('you@example.com');
        router.replace('/');
      },
      signOut: async () => {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        } else {
          await AsyncStorage.removeItem(demoAuthStorageKey);
        }
        setIsSignedIn(false);
        setUserId(null);
        setUserEmail(null);
        router.replace('/sign-in');
      },
    }),
    [isReady, isSignedIn, router, userEmail, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
