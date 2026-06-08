import { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Clock3, MessageSquare, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getProjects, Project } from '../lib/projectsClient';
import { getTasksForProjects, Task } from '../lib/tasksClient';

type AppNotification = {
  id: string;
  type: 'assigned' | 'due' | 'comment' | 'project';
  title: string;
  message: string;
  createdAt: string;
};

const iconByType = {
  assigned: UserPlus,
  due: Clock3,
  comment: MessageSquare,
  project: Bell,
};

function NotificationsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError(null);

      const projectResult = await getProjects(userId);
      if (cancelled) return;

      if (projectResult.error) {
        setError(projectResult.error.message || 'Unable to load projects.');
        setLoading(false);
        return;
      }

      const nextProjects = projectResult.data ?? [];
      setProjects(nextProjects);

      const taskResult = await getTasksForProjects(nextProjects.map((project) => project.id));
      if (cancelled) return;

      if (taskResult.error) {
        setError(taskResult.error.message || 'Unable to load tasks.');
      } else {
        setTasks(taskResult.data ?? []);
      }

      setLoading(false);
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const notifications = useMemo<AppNotification[]>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dueSoon = tasks
      .filter((task) => task.status !== 'completed' && task.due_date && task.due_date <= today)
      .slice(0, 8)
      .map((task) => ({
        id: `due-${task.id}`,
        type: 'due' as const,
        title: task.due_date === today ? 'Task due today' : 'Task overdue',
        message: `${task.title} in ${projectNames.get(task.project_id) ?? 'Project'}`,
        createdAt: task.updated_at ?? task.created_at,
      }));

    const assigned = tasks
      .filter((task) => user && task.assigned_to === user.id && task.status !== 'completed')
      .slice(0, 6)
      .map((task) => ({
        id: `assigned-${task.id}`,
        type: 'assigned' as const,
        title: 'Task assigned',
        message: `${task.title} is assigned to you`,
        createdAt: task.created_at,
      }));

    const projectInvites = projects.slice(0, 4).map((project) => ({
      id: `project-${project.id}`,
      type: 'project' as const,
      title: 'Project workspace',
      message: `${project.name} is available in your sidebar`,
      createdAt: project.created_at,
    }));

    const comments = tasks
      .filter((task) => task.description && task.description.length > 80)
      .slice(0, 4)
      .map((task) => ({
        id: `comment-${task.id}`,
        type: 'comment' as const,
        title: 'Task discussion updated',
        message: `${task.title} has new planning context`,
        createdAt: task.updated_at ?? task.created_at,
      }));

    return [...dueSoon, ...assigned, ...comments, ...projectInvites].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [projectNames, projects, tasks, user]);

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;

  return (
    <section className="space-y-4">
      <div className="border border-border bg-surface p-4 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Notifications</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Activity and alerts</h2>
          </div>
          <button
            type="button"
            onClick={() => setReadIds(new Set(notifications.map((notification) => notification.id)))}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-[#0b101d] px-4 py-2.5 text-sm text-slate-200 transition hover:border-accent hover:text-white"
          >
            <CheckCheck className="h-4 w-4 text-accent" />
            Mark all read
          </button>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">Unread</p>
            <Bell className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-3 text-4xl font-semibold text-white">{unreadCount}</p>
          <p className="mt-4 text-sm leading-6 text-slate-400">{notifications.length} total alerts across tasks, deadlines, and projects.</p>
        </aside>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          {loading ? (
            <p className="rounded-lg border border-border bg-[#0b101d] p-8 text-sm text-slate-300">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="rounded-lg border border-border bg-[#0b101d] p-8 text-sm text-slate-300">No notifications yet.</p>
          ) : (
            <div className="grid gap-3">
              {notifications.map((notification) => {
                const Icon = iconByType[notification.type];
                const isRead = readIds.has(notification.id);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => setReadIds((current) => new Set(current).add(notification.id))}
                    className={`rounded-lg border p-4 text-left transition ${
                      isRead ? 'border-border bg-[#0b101d] opacity-70' : 'border-accent/50 bg-red-500/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-lg border border-border bg-[#111827] p-2">
                        <Icon className="h-4 w-4 text-accent" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white">{notification.title}</h3>
                          {!isRead ? <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-white">New</span> : null}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{notification.message}</p>
                        <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default NotificationsPage;
