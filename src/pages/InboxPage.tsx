import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Circle, Inbox, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getProjects, Project } from '../lib/projectsClient';
import { createTask, deleteTask, getTasksForProjects, Task, updateTask } from '../lib/tasksClient';
import { priorities, priorityLabel, priorityStyles, TaskPriority } from '../lib/taskflowTypes';

function groupTasks(tasks: Task[]) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    overdue: tasks.filter((task) => task.status !== 'completed' && task.due_date && task.due_date < today),
    today: tasks.filter((task) => task.status !== 'completed' && task.due_date === today),
    upcoming: tasks.filter((task) => task.status !== 'completed' && task.due_date && task.due_date > today),
    unscheduled: tasks.filter((task) => task.status !== 'completed' && !task.due_date),
    completed: tasks.filter((task) => task.status === 'completed').slice(0, 8),
  };
}

function TaskRow({
  task,
  projectName,
  onToggle,
  onDelete,
}: {
  task: Task;
  projectName: string;
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="rounded-lg border border-border bg-[#111827] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onToggle(task)}
          className="rounded-md border border-border bg-[#0b101d] p-2 text-slate-300 transition hover:border-accent hover:text-white"
          aria-label={task.status === 'completed' ? 'Reopen task' : 'Complete task'}
        >
          {task.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4" />}
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
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{projectName}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-[#0b101d] px-2 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-accent" />
              {task.due_date ?? 'No date'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="rounded-md p-2 text-slate-400 transition hover:bg-[#0b101d] hover:text-white"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function InboxPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function loadInbox() {
      setLoading(true);
      setError(null);

      const projectResult = await getProjects(userId);
      if (cancelled) return;

      if (projectResult.error) {
        setError(projectResult.error.message || 'Unable to load projects.');
        setProjects([]);
        setTasks([]);
        setLoading(false);
        return;
      }

      const nextProjects = projectResult.data ?? [];
      setProjects(nextProjects);
      setProjectId((current) => current || nextProjects[0]?.id || '');

      const taskResult = await getTasksForProjects(nextProjects.map((project) => project.id));
      if (cancelled) return;

      if (taskResult.error) {
        setError(taskResult.error.message || 'Unable to load tasks.');
        setTasks([]);
      } else {
        setTasks(taskResult.data ?? []);
      }

      setLoading(false);
    }

    loadInbox();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const grouped = useMemo(() => groupTasks(tasks), [tasks]);

  const handleCreate = async () => {
    if (!user || !projectId || !title.trim()) return;

    const { data, error: insertError } = await createTask({
      project_id: projectId,
      title: title.trim(),
      description: '',
      status: 'todo',
      priority,
      due_date: dueDate || null,
      due_time: null,
      assigned_to: user.id,
      created_by: user.id,
      tags: [],
      position: tasks.filter((task) => task.project_id === projectId && task.status === 'todo').length,
    });

    if (insertError || !data) {
      setError(insertError?.message || 'Unable to create task.');
      return;
    }

    setTasks((current) => [data, ...current]);
    setTitle('');
    setDueDate('');
    setPriority('medium');
  };

  const handleToggle = async (task: Task) => {
    const nextTask = { ...task, status: task.status === 'completed' ? 'todo' : 'completed' } satisfies Task;
    const { data, error: updateError } = await updateTask(nextTask);
    if (updateError || !data) {
      setError(updateError?.message || 'Unable to update task.');
      return;
    }
    setTasks((current) => current.map((item) => (item.id === data.id ? data : item)));
  };

  const handleDelete = async (taskId: string) => {
    const { error: deleteError } = await deleteTask(taskId);
    if (deleteError) {
      setError(deleteError.message || 'Unable to delete task.');
      return;
    }
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const sections = [
    { title: 'Overdue', tasks: grouped.overdue },
    { title: 'Today', tasks: grouped.today },
    { title: 'Upcoming', tasks: grouped.upcoming },
    { title: 'Unscheduled', tasks: grouped.unscheduled },
    { title: 'Recently completed', tasks: grouped.completed },
  ];

  return (
    <section className="space-y-4">
      <div className="border border-border bg-surface p-4 shadow-xl shadow-black/10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Inbox</p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Fast capture and triage</h2>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center gap-3">
            <Inbox className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-white">Quick task</h3>
          </div>
          <div className="grid gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Capture a task"
              className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {priorities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!title.trim() || !projectId}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Add to inbox
            </button>
          </div>
        </aside>

        <div className="grid gap-4">
          {loading ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-sm text-slate-300">Loading inbox...</div>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                  <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1 text-xs text-slate-300">{section.tasks.length}</span>
                </div>
                {section.tasks.length === 0 ? (
                  <p className="rounded-lg border border-border bg-[#0b101d] p-4 text-sm text-slate-400">Nothing here right now.</p>
                ) : (
                  <div className="grid gap-3">
                    {section.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        projectName={projectNames.get(task.project_id) ?? 'Project'}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default InboxPage;
