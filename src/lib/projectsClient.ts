import { supabase } from './supabaseClient';
import { createOrUpdateProfile } from './profileClient';

export type ProjectRole = 'owner' | 'admin' | 'member';

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parent_project_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ProjectMember = {
  id: string;
  role: ProjectRole;
  joined_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type ProjectInput = {
  name: string;
  description: string;
  color: string;
  icon: string;
  parent_project_id?: string | null;
};

export type ProjectOwnerProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl?: string | null;
};

const db = supabase as any;

export async function getProjects(userId: string) {
  const { data, error } = await db
    .from('projects')
    .select('id,owner_id,name,description,color,icon,parent_project_id,archived_at,created_at,updated_at,project_members!inner(user_id)')
    .eq('project_members.user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  return { data: (data ?? []) as Project[], error };
}

export async function createProject(input: ProjectInput, owner: string | ProjectOwnerProfile) {
  const ownerId = typeof owner === 'string' ? owner : owner.id;

  const fallbackProfile = await createOrUpdateProfile(
    ownerId,
    typeof owner === 'string' ? null : owner.email,
    typeof owner === 'string' ? '' : owner.displayName,
    typeof owner === 'string' ? null : owner.avatarUrl ?? null
  );

  if (fallbackProfile.error) {
    console.warn('Unable to ensure owner profile before project creation:', fallbackProfile.error.message);
  }

  const { data, error } = await db
    .from('projects')
    .insert({
      name: input.name,
      description: input.description,
      color: input.color,
      icon: input.icon,
      parent_project_id: input.parent_project_id ?? null,
      owner_id: ownerId,
    })
    .select()
    .single();

  if (error || !data) {
    return { data: null, error };
  }

  const membership = await db.from('project_members').insert({ project_id: data.id, user_id: ownerId, role: 'owner' });
  if (membership.error) {
    await db.from('projects').delete().eq('id', data.id);
    return { data: null, error: membership.error };
  }

  return { data: data as Project, error: null };
}

export async function updateProject(projectId: string, updates: Partial<ProjectInput>) {
  const { data, error } = await db
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function archiveProject(projectId: string) {
  const { data, error } = await db
    .from('projects')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();

  return { data: data as Project | null, error };
}

export async function deleteProject(projectId: string) {
  return db.from('projects').delete().eq('id', projectId);
}

export async function getProjectMembers(projectId: string) {
  const { data, error } = await db
    .from('project_members')
    .select('id,role,joined_at,profiles(id,display_name,email,avatar_url)')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  return { data: (data ?? []) as ProjectMember[], error };
}

export async function addMemberByEmail(projectId: string, userId: string, email: string) {
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: profileError ?? new Error('User not found') };
  }

  if (profile.id === userId) {
    return { error: new Error('You are already a member of this project.') };
  }

  const { error } = await db.from('project_members').insert({ project_id: projectId, user_id: profile.id, role: 'member' });
  return { error };
}

export async function updateMemberRole(memberId: string, role: ProjectRole) {
  return db.from('project_members').update({ role }).eq('id', memberId);
}

export async function removeMember(memberId: string) {
  return db.from('project_members').delete().eq('id', memberId);
}
