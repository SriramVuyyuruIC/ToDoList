import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createOrUpdateProfile } from '../lib/profileClient';
import type { AuthChangeEvent, AuthError, Session, User } from '@supabase/supabase-js';

type ProfileUpdateInput = {
  username: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Supabase session error:', error.message);
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await createOrUpdateProfile(session.user.id, session.user.email, (session.user.user_metadata as any)?.username ?? '');
      }
      setLoading(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await createOrUpdateProfile(session.user.id, session.user.email, (session.user.user_metadata as any)?.username ?? '');
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          setUser(data.user ?? null);
          setSession(data.session ?? null);
          if (data.user) {
            await createOrUpdateProfile(data.user.id, data.user.email, (data.user.user_metadata as any)?.username ?? '');
          }
        }
        return { error };
      },
      signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (!error) {
          setUser(data.user ?? null);
          setSession(data.session ?? null);
          if (data.user) {
            await createOrUpdateProfile(data.user.id, data.user.email, (data.user.user_metadata as any)?.username ?? '');
          }
        }
        return { error };
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
          setUser(null);
          setSession(null);
        }
        return { error };
      },
      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return { error };
      },
      updateProfile: async ({ username }: ProfileUpdateInput) => {
        const { data: authData, error: authError } = await supabase.auth.updateUser({
          data: {
            username,
          },
        });

        const profileResult = await createOrUpdateProfile(authData.user?.id ?? '', authData.user?.email ?? null, username);

        if (!authError && profileResult.error) {
          return { error: profileResult.error };
        }

        if (!authError) {
          setUser(authData.user ?? null);
        }

        return { error: authError ?? profileResult.error };
      },
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
