import { supabase } from './supabaseClient';

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  theme_preference: 'dark' | 'system' | null;
  created_at: string;
  updated_at: string | null;
};

const db = supabase as any;

export async function getProfile(userId: string) {
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  return { data: data as Profile | null, error };
}

export async function createOrUpdateProfile(
  userId: string,
  email: string | null,
  displayName: string,
  avatarUrl?: string | null
) {
  const fallbackName = email?.split('@')[0] ?? 'TaskFlow User';
  const profile: Record<string, string | null> = {
    id: userId,
    email,
    display_name: displayName || fallbackName,
    updated_at: new Date().toISOString(),
  };

  if (avatarUrl) {
    profile.avatar_url = avatarUrl;
  }

  const { data, error } = await db
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();

  return { data: data as Profile | null, error };
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'timezone' | 'theme_preference'>>
) {
  const { data, error } = await db
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { data: data as Profile | null, error };
}

export async function getProfileByEmail(email: string) {
  const { data, error } = await db.from('profiles').select('*').eq('email', email).maybeSingle();
  return { data: data as Profile | null, error };
}
