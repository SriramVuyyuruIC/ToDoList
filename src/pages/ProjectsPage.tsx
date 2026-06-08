import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderTree,
  Mail,
  Palette,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import {
  addMemberByEmail,
  archiveProject,
  createProject,
  deleteProject,
  getProjectMembers,
  getProjects,
  Project,
  ProjectMember,
  ProjectRole,
  removeMember,
  updateMemberRole,
  updateProject,
} from '../lib/projectsClient';
import { getTasksForProjects, Task } from '../lib/tasksClient';

const projectColors = ['#ef4444', '#f59e0b', '#22c55e', '#38bdf8', '#a855f7'];
const projectIcons = ['Launch', 'Law', 'Ops', 'Study', 'Client'];

type ProjectFormState = {
  name: string;
  description: string;
  color: string;
  icon: string;
  parent_project_id: string;
};

const emptyProjectForm: ProjectFormState = {
  name: '',
  description: '',
  color: projectColors[0],
  icon: projectIcons[0],
  parent_project_id: '',
};

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm);
  const [editForm, setEditForm] = useState<ProjectFormState>(emptyProjectForm);
  const [editing, setEditing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function load() {
      const { data, error } = await getProjects(userId);
      if (cancelled) return;

      if (error) {
        setStatus(error.message || 'Unable to load projects.');
        setTasks([]);
        setMemberCounts({});
        return;
      }

      const nextProjects = data ?? [];
      setProjects(nextProjects);
      setSelectedProjectId((prev) => (prev && nextProjects.some((project) => project.id === prev) ? prev : nextProjects[0]?.id ?? null));

      const [taskResult, memberResults] = await Promise.all([
        getTasksForProjects(nextProjects.map((project) => project.id)),
        Promise.all(nextProjects.map((project) => getProjectMembers(project.id))),
      ]);

      if (cancelled) return;

      if (taskResult.error) {
        console.warn('Unable to load project task statistics:', taskResult.error.message);
        setTasks([]);
      } else {
        setTasks(taskResult.data ?? []);
      }

      const counts = memberResults.reduce<Record<string, number>>((acc, result, index) => {
        acc[nextProjects[index].id] = result.data?.length ?? 0;
        return acc;
      }, {});
      setMemberCounts(counts);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) {
      setMembers([]);
      setEditing(false);
      return;
    }

    const projectId = selectedProjectId;
    let cancelled = false;

    async function loadMembers() {
      const { data, error } = await getProjectMembers(projectId);
      if (cancelled) return;

      if (error) {
        setStatus(error.message || 'Unable to load project members.');
        return;
      }

      setMembers(data ?? []);
      setMemberCounts((current) => ({ ...current, [projectId]: data?.length ?? 0 }));
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const currentProject = projects.find((project) => project.id === selectedProjectId);
  const ownerMember = members.find((member) => member.role === 'owner');
  const childProjects = useMemo(
    () => projects.filter((project) => project.parent_project_id === selectedProjectId),
    [projects, selectedProjectId]
  );
  const projectStats = useMemo(() => {
    const stats = new Map<string, { total: number; completed: number; active: number; overdue: number; percent: number }>();
    const today = new Date().toISOString().slice(0, 10);

    projects.forEach((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id);
      const completed = projectTasks.filter((task) => task.status === 'completed').length;
      const active = projectTasks.length - completed;
      const overdue = projectTasks.filter((task) => task.status !== 'completed' && task.due_date && task.due_date < today).length;
      stats.set(project.id, {
        total: projectTasks.length,
        completed,
        active,
        overdue,
        percent: projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0,
      });
    });

    return stats;
  }, [projects, tasks]);
  const currentStats = currentProject ? projectStats.get(currentProject.id) : null;

  const startEditing = () => {
    if (!currentProject) return;
    setEditForm({
      name: currentProject.name,
      description: currentProject.description ?? '',
      color: currentProject.color ?? projectColors[0],
      icon: currentProject.icon ?? projectIcons[0],
      parent_project_id: currentProject.parent_project_id ?? '',
    });
    setEditing(true);
  };

  const handleCreateProject = async () => {
    if (!user || !form.name.trim()) return;
    setLoading(true);
    setStatus(null);

    const { data, error } = await createProject(
      {
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
        parent_project_id: form.parent_project_id || null,
      },
      {
        id: user.id,
        email: user.email ?? null,
        displayName:
          (user.user_metadata as Record<string, string | undefined>)?.display_name ||
          user.email?.split('@')[0] ||
          'TaskFlow User',
        avatarUrl:
          (user.user_metadata as Record<string, string | undefined>)?.avatar_url ||
          (user.user_metadata as Record<string, string | undefined>)?.picture ||
          null,
      }
    );
    setLoading(false);

    if (error || !data) {
      setStatus(error?.message || 'Unable to create project.');
      return;
    }

    setProjects((current) => [data, ...current]);
    setMemberCounts((current) => ({ ...current, [data.id]: 1 }));
    setSelectedProjectId(data.id);
    setForm(emptyProjectForm);
    setStatus('Project created.');
  };

  const handleSaveProject = async () => {
    if (!currentProject || !editForm.name.trim()) return;
    setLoading(true);
    setStatus(null);

    const { data, error } = await updateProject(currentProject.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      color: editForm.color,
      icon: editForm.icon,
      parent_project_id: editForm.parent_project_id || null,
    });
    setLoading(false);

    if (error || !data) {
      setStatus(error?.message || 'Unable to update project.');
      return;
    }

    setProjects((current) => current.map((project) => (project.id === data.id ? data : project)));
    setEditing(false);
    setStatus('Project updated.');
  };

  const handleArchive = async () => {
    if (!currentProject) return;
    const { error } = await archiveProject(currentProject.id);
    if (error) {
      setStatus(error.message || 'Unable to archive project.');
      return;
    }
    setProjects((current) => current.filter((project) => project.id !== currentProject.id));
    setTasks((current) => current.filter((task) => task.project_id !== currentProject.id));
    setMemberCounts((current) => {
      const next = { ...current };
      delete next[currentProject.id];
      return next;
    });
    setSelectedProjectId(projects.find((project) => project.id !== currentProject.id)?.id ?? null);
    setStatus('Project archived.');
  };

  const handleDelete = async () => {
    if (!currentProject || !window.confirm(`Delete ${currentProject.name}? This removes its tasks and members.`)) return;
    const { error } = await deleteProject(currentProject.id);
    if (error) {
      setStatus(error.message || 'Unable to delete project.');
      return;
    }
    setProjects((current) => current.filter((project) => project.id !== currentProject.id));
    setTasks((current) => current.filter((task) => task.project_id !== currentProject.id));
    setMemberCounts((current) => {
      const next = { ...current };
      delete next[currentProject.id];
      return next;
    });
    setSelectedProjectId(projects.find((project) => project.id !== currentProject.id)?.id ?? null);
    setStatus('Project deleted.');
  };

  const handleInvite = async () => {
    if (!selectedProjectId || !inviteEmail.trim() || !user) return;
    setLoading(true);
    setStatus(null);

    const { error } = await addMemberByEmail(selectedProjectId, user.id, inviteEmail.trim());
    setLoading(false);

    if (error) {
      setStatus(error.message || 'Unable to add member.');
      return;
    }

    setInviteEmail('');
    setStatus('Member invited.');

    const { data } = await getProjectMembers(selectedProjectId);
    if (data) {
      setMembers(data);
      setMemberCounts((current) => ({ ...current, [selectedProjectId]: data.length }));
    }
  };

  const handleRoleChange = async (memberId: string, role: ProjectRole) => {
    const { error } = await updateMemberRole(memberId, role);
    if (error) {
      setStatus(error.message || 'Unable to update role.');
      return;
    }
    setMembers((current) => current.map((member) => (member.id === memberId ? { ...member, role } : member)));
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await removeMember(memberId);
    if (error) {
      setStatus(error.message || 'Unable to remove member.');
      return;
    }
    setMembers((current) => current.filter((member) => member.id !== memberId));
    if (selectedProjectId) {
      setMemberCounts((current) => ({ ...current, [selectedProjectId]: Math.max((current[selectedProjectId] ?? members.length) - 1, 0) }));
    }
  };

  const renderProjectForm = (targetForm: ProjectFormState, onChange: (next: ProjectFormState) => void) => (
    <div className="grid gap-4">
      <label className="block text-sm text-slate-400">
        Project name
        <input
          value={targetForm.name}
          onChange={(event) => onChange({ ...targetForm, name: event.target.value })}
          placeholder="Civil Procedure"
          className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block text-sm text-slate-400">
        Description
        <textarea
          value={targetForm.description}
          onChange={(event) => onChange({ ...targetForm, description: event.target.value })}
          placeholder="Shared context for this workspace"
          className="mt-2 min-h-[90px] w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-slate-400">
          Icon
          <select
            value={targetForm.icon}
            onChange={(event) => onChange({ ...targetForm, icon: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            {projectIcons.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-400">
          Parent
          <select
            value={targetForm.parent_project_id}
            onChange={(event) => onChange({ ...targetForm, parent_project_id: event.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-[#0b101d] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">None</option>
            {projects
              .filter((project) => project.id !== selectedProjectId)
              .map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
          <Palette className="h-4 w-4 text-accent" />
          Color
        </div>
        <div className="flex flex-wrap gap-2">
          {projectColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ ...targetForm, color })}
              className={`h-9 w-9 rounded-lg border transition ${targetForm.color === color ? 'border-white' : 'border-border'}`}
              style={{ backgroundColor: color }}
              aria-label={`Use ${color}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-surface p-5 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Projects</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Collaborative workspaces</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Build focused project rooms with members, nested workstreams, task progress, and shared context.
        </p>
      </div>

      {status ? <p className="rounded-lg border border-border bg-[#0b101d] px-4 py-3 text-sm text-slate-200">{status}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6 shadow-lg shadow-black/10 md:col-span-2 2xl:col-span-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10">
                  <FolderTree className="h-7 w-7 text-accent" />
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-white">No projects yet</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Create a project to get a board, invite teammates, and start tracking task progress in one place.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => document.querySelector<HTMLInputElement>('input[placeholder=\"Civil Procedure\"]')?.focus()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <Plus className="h-4 w-4" />
                Start project
              </button>
            </div>
          </div>
        ) : (
          projects.map((project) => {
            const stats = projectStats.get(project.id);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className={`rounded-lg border bg-surface p-4 text-left shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-accent ${
                  selectedProjectId === project.id ? 'border-accent/70 ring-1 ring-accent/20' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: project.color ?? '#ef4444' }}>
                      {(project.icon ?? project.name).slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{project.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-400">{project.description || 'No description yet'}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-400">
                  <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{stats?.total ?? 0} tasks</span>
                  <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{memberCounts[project.id] ?? 0} members</span>
                  <span className="rounded-md border border-border bg-[#0b101d] px-2 py-1">{stats?.percent ?? 0}% done</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#0b101d]">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${stats?.percent ?? 0}%` }} />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Create</p>
            <h3 className="mt-2 text-lg font-semibold text-white">New project</h3>
          </div>
          {renderProjectForm(form, setForm)}
          <button
            type="button"
            onClick={handleCreateProject}
            disabled={loading || !form.name.trim()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Create project
          </button>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-white">Project tree</p>
            </div>
            <div className="grid gap-2">
              {projects.length === 0 ? (
                <p className="rounded-lg border border-border bg-[#0b101d] p-4 text-sm text-slate-400">No projects yet.</p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      selectedProjectId === project.id ? 'border-accent bg-red-500/10' : 'border-border bg-[#0b101d] hover:border-accent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: project.color ?? '#ef4444' }}>
                          {(project.icon ?? project.name).slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{project.name}</p>
                          {project.parent_project_id ? <p className="text-xs text-slate-500">Child project</p> : null}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="min-w-0 rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
          {currentProject ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: currentProject.color ?? '#ef4444' }}>
                    {(currentProject.icon ?? currentProject.name).slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Project details</p>
                    <h3 className="mt-2 break-words text-2xl font-semibold text-white">{currentProject.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{currentProject.description || 'No description yet.'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-white">
                    <Pencil className="h-4 w-4 text-accent" />
                    Edit
                  </button>
                  <button type="button" onClick={handleArchive} className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-white">
                    <Archive className="h-4 w-4 text-accent" />
                    Archive
                  </button>
                  <button type="button" onClick={handleDelete} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total tasks', value: currentStats?.total ?? 0, icon: BarChart3 },
                  { label: 'Active', value: currentStats?.active ?? 0, icon: Clock3 },
                  { label: 'Completed', value: currentStats?.completed ?? 0, icon: CheckCircle2 },
                  { label: 'Members', value: memberCounts[currentProject.id] ?? members.length, icon: Users },
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

              <div className="mt-4 rounded-lg border border-border bg-[#0b101d] p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-white">Progress</span>
                  <span className="text-slate-400">{currentStats?.percent ?? 0}% complete</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#111827]">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${currentStats?.percent ?? 0}%` }} />
                </div>
                {currentStats?.overdue ? <p className="mt-3 text-xs text-red-200">{currentStats.overdue} overdue tasks need attention.</p> : null}
              </div>

              {editing ? (
                <div className="mt-6 rounded-lg border border-accent/40 bg-[#0b101d] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-white">Edit project</h4>
                    <button type="button" onClick={() => setEditing(false)} className="rounded-md p-2 text-slate-400 transition hover:bg-[#111827] hover:text-white" aria-label="Cancel editing">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {renderProjectForm(editForm, setEditForm)}
                  <button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={loading || !editForm.name.trim()}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Save changes
                  </button>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <section className="rounded-lg border border-border bg-[#0b101d] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-accent" />
                    <h4 className="font-semibold text-white">Invite members</h4>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="relative min-w-0 flex-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        className="w-full rounded-lg border border-border bg-[#111827] py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleInvite}
                      disabled={loading || !inviteEmail.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite
                    </button>
                  </div>
                </section>

                <section className="rounded-lg border border-border bg-[#0b101d] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <FolderTree className="h-5 w-5 text-accent" />
                    <h4 className="font-semibold text-white">Child projects</h4>
                  </div>
                  {childProjects.length === 0 ? (
                    <p className="text-sm text-slate-400">No nested projects.</p>
                  ) : (
                    <div className="grid gap-2">
                      {childProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => setSelectedProjectId(project.id)}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-[#111827] p-3 text-left text-sm text-slate-200 transition hover:border-accent"
                        >
                          {project.name}
                          <ArrowRight className="h-4 w-4 text-slate-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <section className="mt-6 rounded-lg border border-border bg-[#0b101d] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    <h4 className="font-semibold text-white">Members</h4>
                  </div>
                  <span className="rounded-md border border-border bg-[#111827] px-2 py-1 text-xs text-slate-300">{members.length}</span>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-slate-400">No members found.</p>
                ) : (
                  <div className="grid gap-3">
                    {members.map((member) => {
                      const isOwner = member.role === 'owner';
                      return (
                        <article key={member.id} className="rounded-lg border border-border bg-[#111827] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">
                                {member.profiles?.display_name || member.profiles?.email || 'Unknown member'}
                              </p>
                              <p className="mt-1 truncate text-sm text-slate-400">{member.profiles?.email}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-slate-200">
                                  <Shield className="h-4 w-4 text-accent" />
                                  Owner
                                </span>
                              ) : (
                                <select
                                  value={member.role}
                                  onChange={(event) => handleRoleChange(member.id, event.target.value as ProjectRole)}
                                  className="rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                </select>
                              )}
                              {!isOwner ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#0b101d] px-3 py-2 text-sm text-slate-200 transition hover:border-accent hover:text-white"
                                >
                                  <UserMinus className="h-4 w-4 text-accent" />
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {ownerMember ? (
                <p className="mt-4 text-xs text-slate-500">Owner: {ownerMember.profiles?.display_name || ownerMember.profiles?.email || 'Unknown owner'}</p>
              ) : null}
            </>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-border bg-[#0b101d] p-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-[#111827]">
                <FolderTree className="h-7 w-7 text-accent" />
              </span>
              <p className="mt-4 text-lg font-semibold text-white">Select or create a project</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Project details, progress, members, and nested workstreams will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProjectsPage;
