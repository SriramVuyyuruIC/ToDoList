export const workflowStatuses = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'completed', label: 'Completed' },
] as const;

export type TaskStatus = (typeof workflowStatuses)[number]['id'];

export const priorities = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
] as const;

export type TaskPriority = (typeof priorities)[number]['id'];

export const priorityStyles: Record<TaskPriority, string> = {
  low: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  medium: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  high: 'border-red-400/40 bg-red-500/10 text-red-200',
};

export function statusLabel(status: TaskStatus) {
  return workflowStatuses.find((item) => item.id === status)?.label ?? 'To Do';
}

export function priorityLabel(priority: TaskPriority) {
  return priorities.find((item) => item.id === priority)?.label ?? 'Medium';
}
