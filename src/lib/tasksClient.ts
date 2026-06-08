import { supabase } from './supabaseClient';
import type { TaskPriority, TaskStatus } from './taskflowTypes';

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  assigned_to: string | null;
  created_by: string | null;
  recurring_rule: string | null;
  tags: string[];
  position: number;
  created_at: string;
  updated_at: string | null;
};

export type TaskInput = {
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  due_time?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  recurring_rule?: string | null;
  tags?: string[];
  position?: number;
};

const db = supabase as any;

function normalizeTask(row: any): Task {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description ?? '',
    status: row.status ?? (row.completed ? 'completed' : 'todo'),
    priority: row.priority ?? 'medium',
    due_date: row.due_date ?? (row.due && row.due !== 'No due date' ? row.due : null),
    due_time: row.due_time ?? null,
    assigned_to: row.assigned_to ?? null,
    created_by: row.created_by ?? null,
    recurring_rule: row.recurring_rule ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    position: row.position ?? 0,
    created_at: row.created_at ?? row.inserted_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? null,
  };
}

export async function getTasks(projectId: string) {
  const { data, error } = await db
    .from('tasks')
    .select('id,project_id,title,description,status,priority,due_date,due_time,assigned_to,created_by,recurring_rule,tags,position,created_at,updated_at')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  return { data: (data ?? []).map(normalizeTask), error };
}

export async function getTasksForProjects(projectIds: string[]) {
  if (projectIds.length === 0) {
    return { data: [] as Task[], error: null };
  }

  const { data, error } = await db
    .from('tasks')
    .select('id,project_id,title,description,status,priority,due_date,due_time,assigned_to,created_by,recurring_rule,tags,position,created_at,updated_at')
    .in('project_id', projectIds)
    .order('due_date', { ascending: true, nullsFirst: false });

  return { data: (data ?? []).map(normalizeTask), error };
}

export async function createTask(task: TaskInput) {
  const { data, error } = await db
    .from('tasks')
    .insert({
      project_id: task.project_id,
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? null,
      due_time: task.due_time ?? null,
      assigned_to: task.assigned_to ?? null,
      created_by: task.created_by ?? null,
      recurring_rule: task.recurring_rule ?? null,
      tags: task.tags ?? [],
      position: task.position ?? 0,
    })
    .select()
    .single();

  return { data: data ? normalizeTask(data) : null, error };
}

export async function updateTask(task: Task) {
  const { data, error } = await db
    .from('tasks')
    .update({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      due_time: task.due_time,
      assigned_to: task.assigned_to,
      recurring_rule: task.recurring_rule,
      tags: task.tags,
      position: task.position,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  return { data: data ? normalizeTask(data) : null, error };
}

export async function deleteTask(taskId: string) {
  return db.from('tasks').delete().eq('id', taskId);
}

export async function reorderTasks(tasks: Pick<Task, 'id' | 'position' | 'status'>[]) {
  const updates = await Promise.all(
    tasks.map((task) =>
      db
        .from('tasks')
        .update({ position: task.position, status: task.status, updated_at: new Date().toISOString() })
        .eq('id', task.id)
    )
  );

  return { error: updates.find((result) => result.error)?.error ?? null };
}
