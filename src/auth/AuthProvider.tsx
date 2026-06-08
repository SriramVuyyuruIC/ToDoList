import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfig } from '../lib/supabaseClient';
import { createOrUpdateProfile, updateProfile as updateStoredProfile } from '../lib/profileClient';
import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';

type ProfileUpdateInput = {
  displayName: string;
  avatarUrl: string;
  timezone: string;
  themePreference: 'dark' | 'system';
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<{ error: AuthError | PostgrestError | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function missingSupabaseError() {
  return new Error(`Missing ${supabaseConfig.missingKeys.join(' and ')} in deployment environment variables.`) as AuthError;
}

function MissingSupabaseConfig() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
        <section className="w-full rounded-lg border border-red-500/30 bg-surface p-6 shadow-xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">TaskFlow setup</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Supabase environment variables are missing</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Add these variables in Vercel Project Settings, then redeploy the project:
          </p>
          <div className="mt-4 grid gap-2">
            {supabaseConfig.missingKeys.map((key) => (
              <code key={key} className="rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-red-100">
                {key}
              </code>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Vite only exposes browser environment variables when they start with <code>VITE_</code>, so the names must match exactly.
          </p>
        </section>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadSession() {
      if (!supabase) return;
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
        await createOrUpdateProfile(
          session.user.id,
          session.user.email ?? null,
          (session.user.user_metadata as any)?.display_name ?? ''
        );
      }
      setLoading(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await createOrUpdateProfile(
          session.user.id,
          session.user.email ?? null,
          (session.user.user_metadata as any)?.display_name ?? ''
        );
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
        if (!supabase) return { error: missingSupabaseError() };

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          setUser(data.user ?? null);
          setSession(data.session ?? null);
          if (data.user) {
            await createOrUpdateProfile(
              data.user.id,
              data.user.email ?? null,
              (data.user.user_metadata as any)?.display_name ?? ''
            );
          }
        }
        return { error };
      },
      signUp: async (email: string, password: string, displayName = '') => {
        if (!supabase) return { error: missingSupabaseError() };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });
        if (!error) {
          setUser(data.user ?? null);
          setSession(data.session ?? null);
          if (data.user) {
            await createOrUpdateProfile(data.user.id, data.user.email ?? null, displayName);
          }
        }
        return { error };
      },
      signOut: async () => {
        if (!supabase) return { error: missingSupabaseError() };

        const { error } = await supabase.auth.signOut();
        if (!error) {
          setUser(null);
          setSession(null);
        }
        return { error };
      },
      resetPassword: async (email: string) => {
        if (!supabase) return { error: missingSupabaseError() };

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        return { error };
      },
      updateProfile: async ({ displayName, avatarUrl, timezone, themePreference }: ProfileUpdateInput) => {
        if (!supabase) return { error: missingSupabaseError() };

        const { data: authData, error: authError } = await supabase.auth.updateUser({
          data: {
            display_name: displayName,
            avatar_url: avatarUrl,
            timezone,
            theme_preference: themePreference,
          },
        });

        if (authError) {
          return { error: authError };
        }

        const userId = authData.user?.id ?? user?.id;
        if (!userId) {
          return { error: null };
        }

        await createOrUpdateProfile(userId, authData.user?.email ?? user?.email ?? null, displayName);
        const profileResult = await updateStoredProfile(userId, {
          display_name: displayName,
          avatar_url: avatarUrl || null,
          timezone: timezone || null,
          theme_preference: themePreference,
        });

        if (profileResult.error) {
          return { error: profileResult.error };
        }

        setUser(authData.user ?? null);

        return { error: null };
      },
    }),
    [user, session, loading]
  );

  if (!supabase) {
    return <MissingSupabaseConfig />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
