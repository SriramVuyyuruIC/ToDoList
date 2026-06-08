import { supabase } from './supabaseClient';

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string | null;
};

export type ProjectMember = {
  id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    username: string;
    email: string;
  };
};

export async function getProjects(userId: string) {
  return supabase
    .from<Project>('projects')
    .select('id,owner_id,name,description,created_at,updated_at,project_members!inner(user_id)')
    .eq('project_members.user_id', userId)
    .order('created_at', { ascending: false });
}

export async function createProject(name: string, description: string, ownerId: string) {
  const { data, error } = await supabase
    .from<Project>('projects')
    .insert({ name, description, owner_id: ownerId })
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  const membership = await supabase.from('project_members').insert({ project_id: data.id, user_id: ownerId, role: 'owner' });
  return { data, error: membership.error ?? null };
}

export async function getProjectMembers(projectId: string) {
  return supabase
    .from<ProjectMember>('project_members')
    .select('id,role,joined_at,profiles(id,username,email)')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });
}

export async function addMemberByEmail(projectId: string, userId: string, email: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    return { error: profileError ?? new Error('User not found') };
  }

  if (profile.id === userId) {
    return { error: new Error('You are already a member of this project.') };
  }

  const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: profile.id, role: 'member' });
  return { error };
}
