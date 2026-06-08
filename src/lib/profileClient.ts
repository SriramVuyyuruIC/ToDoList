import { supabase } from './supabaseClient';

export type Profile = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export async function getProfile(userId: string) {
  return supabase.from<Profile>('profiles').select('*').eq('id', userId).single();
}

export async function createOrUpdateProfile(userId: string, email: string | null, username: string) {
  return supabase.from<Profile>('profiles').upsert({ id: userId, email, username }, { onConflict: 'id' }).select().single();
}

export async function updateProfile(userId: string, username: string) {
  return supabase.from<Profile>('profiles').update({ username }).eq('id', userId).select().single();
}

export async function getProfileByEmail(email: string) {
  return supabase.from<Profile>('profiles').select('*').eq('email', email).single();
}
