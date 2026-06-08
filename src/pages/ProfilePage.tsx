import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Camera, CheckCircle2, FolderOpen, Mail, Save, Target, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getProfile } from '../lib/profileClient';
import { getProjects, Project } from '../lib/projectsClient';
import { getTasksForProjects, Task } from '../lib/tasksClient';

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York');
  const [themePreference, setThemePreference] = useState<'dark' | 'system'>('dark');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await getProfile(user.id);
      if (error) {
        setMessage(error.message || 'Unable to load profile.');
      } else {
        setDisplayName(data?.display_name ?? (user.email?.split('@')[0] || ''));
        setAvatarUrl(data?.avatar_url ?? '');
        setTimezone(data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'America/New_York');
        setThemePreference(data?.theme_preference ?? 'dark');
      }

      const projectResult = await getProjects(user.id);
      if (projectResult.error) {
        console.warn('Unable to load profile project statistics:', projectResult.error.message);
      } else {
        const nextProjects = projectResult.data ?? [];
        setProjects(nextProjects);
        const taskResult = await getTasksForProjects(nextProjects.map((project) => project.id));
        if (taskResult.error) {
          console.warn('Unable to load profile task statistics:', taskResult.error.message);
        } else {
          setTasks(taskResult.data ?? []);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [user]);

  const initials = useMemo(() => {
    const source = displayName || user?.email || 'TaskFlow';
    return source
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [displayName, user?.email]);
  const accountStats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const active = tasks.length - completed;
    const assignedToMe = tasks.filter((task) => task.assigned_to === user?.id && task.status !== 'completed').length;
    const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    return {
      completed,
      active,
      assignedToMe,
      completionRate,
    };
  }, [tasks, user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setMessage(null);
    setSaving(true);

    const { error } = await updateProfile({
      displayName: displayName.trim() || user.email?.split('@')[0] || 'TaskFlow User',
      avatarUrl: avatarUrl.trim(),
      timezone,
      themePreference,
    });
    if (error) {
      setMessage(error.message || 'Unable to save profile.');
    } else {
      setMessage('Profile saved.');
    }

    setSaving(false);
  };

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-surface p-5 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Profile</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Account settings</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Manage the profile teammates see across projects, assignments, comments, and activity.
        </p>
      </div>

      {message ? <p className="rounded-lg border border-border bg-[#0b101d] px-4 py-3 text-sm text-slate-200">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-[#0b101d]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-semibold text-white">{initials}</span>
              )}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">{displayName || 'TaskFlow User'}</h3>
            <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-[#0b101d] p-3 text-center">
              <p className="text-2xl font-semibold text-white">{projects.length}</p>
              <p className="mt-1 text-xs text-slate-400">Projects</p>
            </div>
            <div className="rounded-lg border border-border bg-[#0b101d] p-3 text-center">
              <p className="text-2xl font-semibold text-white">{tasks.length}</p>
              <p className="mt-1 text-xs text-slate-400">Tasks</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-border bg-[#0b101d] p-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-400">Completion rate</span>
              <span className="font-semibold text-white">{accountStats.completionRate}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#111827]">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${accountStats.completionRate}%` }} />
            </div>
          </div>
        </aside>

        <div className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Active tasks', value: accountStats.active, icon: Target },
              { label: 'Completed', value: accountStats.completed, icon: CheckCircle2 },
              { label: 'Assigned to me', value: accountStats.assignedToMe, icon: UserRound },
              { label: 'Projects', value: projects.length, icon: FolderOpen },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-lg border border-border bg-[#0b101d] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">{item.label}</p>
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                </article>
              );
            })}
          </div>

          <div className="grid gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                <Mail className="h-4 w-4 text-accent" />
                Email
              </div>
              <div className="rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100">{user?.email ?? 'No email available'}</div>
            </div>

            <label className="block text-sm text-slate-400">
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </label>

            <label className="block text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <Camera className="h-4 w-4 text-accent" />
                Avatar URL
              </span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                disabled={loading}
                className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-400">
                Time zone
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                >
                  {[timezone, ...timezones.filter((item) => item !== timezone)].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-400">
                Theme
                <select
                  value={themePreference}
                  onChange={(event) => setThemePreference(event.target.value as 'dark' | 'system')}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                >
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <section className="rounded-lg border border-border bg-[#0b101d] p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" />
                <p className="text-sm font-semibold text-white">Completed task metrics</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-[#111827] p-3">
                  <p className="text-2xl font-semibold text-white">{accountStats.completed}</p>
                  <p className="mt-1 text-xs text-slate-400">Completed tasks</p>
                </div>
                <div className="rounded-lg border border-border bg-[#111827] p-3">
                  <p className="text-2xl font-semibold text-white">{accountStats.completionRate}%</p>
                  <p className="mt-1 text-xs text-slate-400">Completion rate</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Completed work is calculated across every project you can access.
              </p>
            </section>

            <section className="rounded-lg border border-border bg-[#0b101d] p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-white">Account scope</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">Your profile is shared across projects, task assignments, comments, and activity history.</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
