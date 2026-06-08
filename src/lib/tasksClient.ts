import { supabase } from './supabaseClient';

export type Task = {
  id: string;
  title: string;
  description: string;
  due: string;
  completed: boolean;
  position: number;
};

export async function getTasks(projectId: string) {
  return supabase
    .from<Task>('tasks')
    .select('id,title,description,due,completed,position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });
}

export async function createTask(task: Omit<Task, 'id'> & { project_id: string }) {
  return supabase.from<Task>('tasks').insert(task).select();
}

export async function updateTask(task: Task) {
  return supabase
    .from<Task>('tasks')
    .update({ title: task.title, description: task.description, due: task.due, completed: task.completed, position: task.position })
    .eq('id', task.id)
    .select();
}

export async function deleteTask(taskId: string) {
  return supabase.from<Task>('tasks').delete().eq('id', taskId);
}

export async function reorderTasks(tasks: Task[]) {
  const rows = tasks.map((task) => ({ id: task.id, position: task.position }));
  return supabase.from<Task>('tasks').upsert(rows, { onConflict: 'id' });
}
