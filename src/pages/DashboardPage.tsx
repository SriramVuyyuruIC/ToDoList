import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Filter,
  GripVertical,
  KanbanSquare,
  List,
  Plus,
  Search,
  Tags,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { createTask, deleteTask, getTasks, reorderTasks, Task, updateTask } from '../lib/tasksClient';
import { getProjectMembers, getProjects, Project, ProjectMember } from '../lib/projectsClient';
import {
  priorities,
  priorityLabel,
  priorityStyles,
  statusLabel,
  TaskPriority,
  TaskStatus,
  workflowStatuses,
} from '../lib/taskflowTypes';

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  due_time: string;
  assigned_to: string;
  recurring_rule: string;
  tags: string;
};

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  due_time: '',
  assigned_to: '',
  recurring_rule: '',
  tags: '',
};

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToInput(tags: string[]) {
  return tags.join(', ');
}

function formatDue(task: Task) {
  if (!task.due_date) {
    return 'No date';
  }

  const date = new Date(`${task.due_date}T${task.due_time || '12:00'}`);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${task.due_time ? ` at ${task.due_time}` : ''}`;
}

function normalizeTaskPositions(taskList: Task[]) {
  let next = [...taskList];

  workflowStatuses.forEach((status) => {
    const ordered = next
      .filter((task) => task.status === status.id)
      .sort((a, b) => a.position - b.position);

    ordered.forEach((task, index) => {
      next = next.map((item) => (item.id === task.id ? { ...item, position: index } : item));
    });
  });

  return next;
}

function TaskCard({
  task,
  memberName,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  task: Task;
  memberName: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-border bg-[#111827] p-4 shadow-lg shadow-black/10 ${
        isDragging ? 'opacity-60 ring-2 ring-accent/50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          className="mt-0.5 rounded-md border border-border bg-[#0b101d] p-2 text-slate-200 transition hover:border-accent"
          aria-label={task.status === 'completed' ? 'Reopen task' : 'Complete task'}
        >
          {task.status === 'completed' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`break-words text-base font-semibold ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
              {task.title}
            </h3>
            <span className={`rounded-md border px-2 py-0.5 text-xs ${priorityStyles[task.priority]}`}>
              {priorityLabel(task.priority)}
            </span>
          </div>
          {task.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{task.description}</p> : null}
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <button type="button" onClick={() => onEdit(task)} className="rounded-md p-2 transition hover:bg-[#0b101d] hover:text-white" aria-label="Edit task">
            <Edit3 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDelete(task.id)} className="rounded-md p-2 transition hover:bg-[#0b101d] hover:text-white" aria-label="Delete task">
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="rounded-md p-2 transition hover:bg-[#0b101d] hover:text-white"
            aria-label="Drag task"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-[#0b101d] px-2 py-1">
          <CalendarDays className="h-3.5 w-3.5 text-accent" />
          {formatDue(task)}
        </span>
        <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{statusLabel(task.status)}</span>
        <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{memberName}</span>
        {task.recurring_rule ? (
          <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{task.recurring_rule}</span>
        ) : null}
      </div>

      {task.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-border bg-[#0b101d] px-2 py-1 text-xs text-slate-300">
              <Tags className="h-3 w-3 text-accent" />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function KanbanColumn({
  status,
  tasks,
  children,
}: {
  status: (typeof workflowStatuses)[number];
  tasks: Task[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <section
      ref={setNodeRef}
      className={`min-h-[460px] rounded-lg border border-border bg-[#0b101d] p-3 transition ${
        isOver ? 'border-accent bg-red-500/5' : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{status.label}</h3>
        <span className="rounded-md border border-border bg-[#111827] px-2 py-1 text-xs text-slate-300">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">{children}</div>
      </SortableContext>
    </section>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState<TaskFormState>(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(emptyTaskForm);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setError(null);

      const { data, error: projectError } = await getProjects(userId);
      if (cancelled) return;

      if (projectError) {
        setError(projectError.message || 'Unable to load projects.');
        setProjects([]);
      } else {
        const nextProjects = data ?? [];
        const storedProject = localStorage.getItem('taskflow-selected-project');
        const fallbackProject = nextProjects.find((project) => project.id === storedProject) ?? nextProjects[0];

        setProjects(nextProjects);
        setSelectedProjectId(fallbackProject?.id ?? null);
      }

      setLoadingProjects(false);
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setMembers([]);
      return;
    }

    const projectId = selectedProjectId;
    let cancelled = false;

    async function loadProjectWorkspace() {
      setLoadingTasks(true);
      setError(null);

      const [taskResult, memberResult] = await Promise.all([getTasks(projectId), getProjectMembers(projectId)]);
      if (cancelled) return;

      if (taskResult.error) {
        setError(taskResult.error.message || 'Unable to load tasks.');
        setTasks([]);
      } else {
        setTasks(taskResult.data ?? []);
      }

      if (memberResult.error) {
        setError(memberResult.error.message || 'Unable to load project members.');
        setMembers([]);
      } else {
        setMembers(memberResult.data ?? []);
      }

      localStorage.setItem('taskflow-selected-project', projectId);
      setLoadingTasks(false);
    }

    loadProjectWorkspace();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const memberNames = useMemo(() => {
    const names = new Map<string, string>();
    members.forEach((member) => {
      if (member.profiles?.id) {
        names.set(member.profiles.id, member.profiles.display_name || member.profiles.email || 'Teammate');
      }
    });
    if (user) {
      names.set(user.id, names.get(user.id) ?? user.email ?? 'Me');
    }
    return names;
  }, [members, user]);

  const today = new Date().toISOString().slice(0, 10);
  const filteredTasks = useMemo(() => {
    const text = query.trim().toLowerCase();

    return tasks
      .filter((task) => {
        const matchesText =
          !text ||
          task.title.toLowerCase().includes(text) ||
          (task.description ?? '').toLowerCase().includes(text) ||
          task.tags.some((tag) => tag.toLowerCase().includes(text));
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

        return matchesText && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        const statusDelta =
          workflowStatuses.findIndex((status) => status.id === a.status) -
          workflowStatuses.findIndex((status) => status.id === b.status);
        return statusDelta || a.position - b.position;
      });
  }, [priorityFilter, query, statusFilter, tasks]);

  const dashboardStats = useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'completed');
    const completed = tasks.filter((task) => task.status === 'completed');
    const dueToday = active.filter((task) => task.due_date === today);
    const overdue = active.filter((task) => task.due_date && task.due_date < today);
    const upcoming = active.filter((task) => task.due_date && task.due_date > today).slice(0, 8);
    const completionRate = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;

    return { active, completed, dueToday, overdue, upcoming, completionRate };
  }, [tasks, today]);

  const resetForm = () => {
    setForm({ ...emptyTaskForm, assigned_to: user?.id ?? '' });
  };

  const handleAddTask = async () => {
    if (!user || !selectedProjectId || !form.title.trim()) return;
    setSaving(true);
    setError(null);

    const statusTasks = tasks.filter((task) => task.status === form.status);
    const { data, error: insertError } = await createTask({
      project_id: selectedProjectId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      assigned_to: form.assigned_to || null,
      created_by: user.id,
      recurring_rule: form.recurring_rule || null,
      tags: parseTags(form.tags),
      position: statusTasks.length,
    });

    setSaving(false);

    if (insertError || !data) {
      setError(insertError?.message || 'Unable to save task.');
      return;
    }

    setTasks((current) => normalizeTaskPositions([...current, data]));
    resetForm();
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? '',
      due_time: task.due_time ?? '',
      assigned_to: task.assigned_to ?? '',
      recurring_rule: task.recurring_rule ?? '',
      tags: tagsToInput(task.tags),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId) return;
    const taskToUpdate = tasks.find((task) => task.id === editingTaskId);
    if (!taskToUpdate) return;
    setSaving(true);
    setError(null);

    const updatedTask: Task = {
      ...taskToUpdate,
      title: editForm.title.trim() || 'Untitled task',
      description: editForm.description.trim(),
      status: editForm.status,
      priority: editForm.priority,
      due_date: editForm.due_date || null,
      due_time: editForm.due_time || null,
      assigned_to: editForm.assigned_to || null,
      recurring_rule: editForm.recurring_rule || null,
      tags: parseTags(editForm.tags),
    };

    const { data, error: updateError } = await updateTask(updatedTask);
    setSaving(false);

    if (updateError || !data) {
      setError(updateError?.message || 'Unable to update task.');
      return;
    }

    setTasks((current) => normalizeTaskPositions(current.map((task) => (task.id === data.id ? data : task))));
    setEditingTaskId(null);
    setEditForm(emptyTaskForm);
  };

  const handleDeleteTask = async (id: string) => {
    const { error: deleteError } = await deleteTask(id);
    if (deleteError) {
      setError(deleteError.message || 'Unable to delete task.');
      return;
    }
    setTasks((current) => normalizeTaskPositions(current.filter((task) => task.id !== id)));
  };

  const handleToggleComplete = async (task: Task) => {
    const updatedTask = { ...task, status: task.status === 'completed' ? 'todo' : 'completed' } satisfies Task;
    const { data, error: updateError } = await updateTask(updatedTask);
    if (updateError || !data) {
      setError(updateError?.message || 'Unable to update task.');
      return;
    }
    setTasks((current) => normalizeTaskPositions(current.map((item) => (item.id === data.id ? data : item))));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTask = tasks.find((task) => task.id === activeId);
    const overTask = tasks.find((task) => task.id === overId);
    const destinationStatus = workflowStatuses.find((status) => status.id === overId)?.id ?? overTask?.status;

    if (!activeTask || !destinationStatus) return;

    let nextTasks = tasks.map((task) =>
      task.id === activeId ? { ...task, status: destinationStatus, position: tasks.filter((item) => item.status === destinationStatus).length } : task
    );

    if (overTask) {
      const columnTasks = nextTasks
        .filter((task) => task.status === destinationStatus)
        .sort((a, b) => a.position - b.position);
      const oldIndex = columnTasks.findIndex((task) => task.id === activeId);
      const newIndex = columnTasks.findIndex((task) => task.id === overTask.id);

      if (oldIndex >= 0 && newIndex >= 0) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex).map((task, index) => ({ ...task, position: index }));
        nextTasks = nextTasks.map((task) => reordered.find((item) => item.id === task.id) ?? task);
      }
    }

    const normalized = normalizeTaskPositions(nextTasks);
    setTasks(normalized);
    reorderTasks(normalized.map((task) => ({ id: task.id, status: task.status, position: task.position }))).catch((reorderError) => {
      setError(reorderError?.message || 'Unable to reorder tasks.');
    });
  };

  const renderTaskForm = (targetForm: TaskFormState, onChange: (next: TaskFormState) => void, buttonLabel: string, onSubmit: () => void) => (
    <div className="grid gap-4">
      <label className="block text-sm text-slate-400">
        Title
        <input
          value={targetForm.title}
          onChange={(event) => onChange({ ...targetForm, title: event.target.value })}
          placeholder="Draft motion outline"
          className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block text-sm text-slate-400">
        Description
        <textarea
          value={targetForm.description}
          onChange={(event) => onChange({ ...targetForm, description: event.target.value })}
          placeholder="Add context for teammates"
          className="mt-2 min-h-[92px] w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-400">
          Status
          <select
            value={targetForm.status}
            onChange={(event) => onChange({ ...targetForm, status: event.target.value as TaskStatus })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {workflowStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-400">
          Priority
          <select
            value={targetForm.priority}
            onChange={(event) => onChange({ ...targetForm, priority: event.target.value as TaskPriority })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-400">
          Due date
          <input
            type="date"
            value={targetForm.due_date}
            onChange={(event) => onChange({ ...targetForm, due_date: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label className="block text-sm text-slate-400">
          Due time
          <input
            type="time"
            value={targetForm.due_time}
            onChange={(event) => onChange({ ...targetForm, due_time: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-400">
          Assignee
          <select
            value={targetForm.assigned_to}
            onChange={(event) => onChange({ ...targetForm, assigned_to: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">Unassigned</option>
            {members.map((member) =>
              member.profiles ? (
                <option key={member.profiles.id} value={member.profiles.id}>
                  {member.profiles.display_name || member.profiles.email || 'Teammate'}
                </option>
              ) : null
            )}
          </select>
        </label>
        <label className="block text-sm text-slate-400">
          Recurrence
          <select
            value={targetForm.recurring_rule}
            onChange={(event) => onChange({ ...targetForm, recurring_rule: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">None</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Every 3 days">Every 3 days</option>
            <option value="Every 2 weeks">Every 2 weeks</option>
          </select>
        </label>
      </div>

      <label className="block text-sm text-slate-400">
        Tags
        <input
          value={targetForm.tags}
          onChange={(event) => onChange({ ...targetForm, tags: event.target.value })}
          placeholder="research, urgent"
          className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>

      <button
        type="button"
        onClick={onSubmit}
        disabled={saving || !targetForm.title.trim()}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </button>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="border border-border bg-surface p-4 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Project command center</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {selectedProject ? selectedProject.name : 'Create or select a project to start planning with your team.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedProjectId ?? ''}
              onChange={(event) => setSelectedProjectId(event.target.value || null)}
              className="rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {loadingProjects ? <option>Loading projects</option> : null}
              {!loadingProjects && projects.length === 0 ? <option value="">No projects</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 rounded-lg border border-border bg-[#0b101d] p-1">
              <button
                type="button"
                onClick={() => setView('kanban')}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  view === 'kanban' ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <KanbanSquare className="h-4 w-4 text-accent" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  view === 'list' ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4 text-accent" />
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Due today', value: dashboardStats.dueToday.length, icon: Clock3 },
          { label: 'Upcoming', value: dashboardStats.upcoming.length, icon: CalendarDays },
          { label: 'Overdue', value: dashboardStats.overdue.length, icon: AlertTriangle },
          { label: 'Completed', value: dashboardStats.completed.length, icon: CheckCircle2 },
          { label: 'Completion', value: `${dashboardStats.completionRate}%`, icon: TrendingUp },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-400">{item.label}</p>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </article>
          );
        })}
      </div>

      {!selectedProject ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-slate-300 shadow-lg shadow-black/10">
          <p className="text-lg font-semibold text-white">No project selected</p>
          <p className="mt-2 text-sm text-slate-400">Create a workspace on the Projects page to unlock tasks, members, and planning views.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Capture</p>
              <h3 className="mt-2 text-lg font-semibold text-white">New task</h3>
            </div>
            {renderTaskForm(form, setForm, saving ? 'Saving...' : 'Add task', handleAddTask)}
          </aside>

          <div className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Workspace</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{selectedProject.name}</h3>
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_160px_160px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search tasks, tags, notes"
                    className="w-full rounded-lg border border-border bg-[#0b101d] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="relative block">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as 'all' | TaskStatus)}
                    className="w-full rounded-lg border border-border bg-[#0b101d] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="all">All status</option>
                    {workflowStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as 'all' | TaskPriority)}
                  className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="all">All priority</option>
                  {priorities.map((priority) => (
                    <option key={priority.id} value={priority.id}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editingTaskId ? (
              <div className="mb-4 rounded-lg border border-accent/40 bg-[#0b101d] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">Edit task</p>
                  <button type="button" onClick={() => setEditingTaskId(null)} className="rounded-md border border-border px-3 py-1.5 text-sm text-slate-300 transition hover:border-accent hover:text-white">
                    Cancel
                  </button>
                </div>
                {renderTaskForm(editForm, setEditForm, saving ? 'Saving...' : 'Save changes', handleSaveEdit)}
              </div>
            ) : null}

            {loadingTasks ? (
              <div className="rounded-lg border border-border bg-[#0b101d] p-8 text-sm text-slate-300">Loading tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-lg border border-border bg-[#0b101d] p-8 text-sm text-slate-300">No tasks match the current view.</div>
            ) : view === 'list' ? (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        memberName={task.assigned_to ? memberNames.get(task.assigned_to) ?? 'Teammate' : 'Unassigned'}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        onToggleComplete={handleToggleComplete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <div className="grid min-w-0 gap-3 2xl:grid-cols-5">
                  {workflowStatuses.map((status) => {
                    const columnTasks = filteredTasks.filter((task) => task.status === status.id);
                    return (
                      <KanbanColumn key={status.id} status={status} tasks={columnTasks}>
                        {columnTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            memberName={task.assigned_to ? memberNames.get(task.assigned_to) ?? 'Teammate' : 'Unassigned'}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onToggleComplete={handleToggleComplete}
                          />
                        ))}
                      </KanbanColumn>
                    );
                  })}
                </div>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default DashboardPage;
