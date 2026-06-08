import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { addMemberByEmail, createProject, getProjectMembers, getProjects, Project, ProjectMember } from '../lib/projectsClient';
import { Plus, Users, Mail, UserPlus, ArrowRight } from 'lucide-react';

function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const { data, error } = await getProjects(user.id);
      if (error) {
        setStatus(error.message || 'Unable to load projects.');
        return;
      }

      setProjects(data ?? []);
      setSelectedProjectId((prev) => prev ?? data?.[0]?.id ?? null);
    }

    load();
  }, [user]);

  useEffect(() => {
    if (!selectedProjectId) {
      setMembers([]);
      return;
    }

    async function loadMembers() {
      const { data, error } = await getProjectMembers(selectedProjectId);
      if (error) {
        setStatus(error.message || 'Unable to load project members.');
        return;
      }

      setMembers(data ?? []);
    }

    loadMembers();
  }, [selectedProjectId]);

  const currentProject = projects.find((project) => project.id === selectedProjectId);

  const handleCreateProject = async () => {
    if (!user || !projectName.trim()) return;
    setLoading(true);
    setStatus(null);

    const { data, error } = await createProject(projectName.trim(), projectDescription.trim(), user.id);
    setLoading(false);

    if (error || !data) {
      setStatus(error?.message || 'Unable to create project.');
      return;
    }

    setProjects((current) => [data, ...current]);
    setSelectedProjectId(data.id);
    setProjectName('');
    setProjectDescription('');
    setStatus('Project created successfully.');
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
    setStatus('Member invited successfully.');

    const { data } = await getProjectMembers(selectedProjectId);
    if (data) {
      setMembers(data);
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Projects</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Collaborative workspaces</h2>
          <p className="mt-2 text-sm text-slate-400">Create shared projects and invite teammates to manage tasks together.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
          <h3 className="text-xl font-semibold text-white">Create a project</h3>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-400">
              Project name
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Product launch"
                className="mt-2 w-full rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-slate-400">
              Description
              <textarea
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
                placeholder="Optional project description"
                className="mt-2 min-h-[100px] w-full rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Create project
            </button>
          </div>

          <div className="mt-8 rounded-[2rem] border border-border bg-[#0f172a] p-5">
            <p className="text-sm text-slate-400">Your projects</p>
            <div className="mt-4 space-y-3">
              {projects.length === 0 ? (
                <div className="rounded-3xl border border-border bg-[#111827] p-4 text-sm text-slate-300">No projects found. Create a project to get started.</div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full text-left rounded-3xl border px-4 py-4 transition ${selectedProjectId === project.id ? 'border-accent bg-[#111827]' : 'border-border bg-[#0f172a] hover:border-accent'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-muted">Project</p>
                        <h4 className="mt-2 text-base font-semibold text-white">{project.name}</h4>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{project.description || 'No description yet.'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
          {currentProject ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-muted">Project details</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{currentProject.name}</h3>
                </div>
                <div className="rounded-full border border-border bg-[#0f172a] px-3 py-2 text-sm text-slate-300">Owned by you</div>
              </div>
              <p className="mt-4 text-sm text-slate-400">{currentProject.description || 'Shared task list with your team.'}</p>

              <div className="mt-8 rounded-[2rem] border border-border bg-[#0f172a] p-5">
                <p className="text-sm uppercase tracking-[0.3em] text-muted">Invite members</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="Enter teammate email"
                    className="min-w-0 flex-1 rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  <button
                    type="button"
                    onClick={handleInvite}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90 disabled:opacity-60"
                  >
                    <UserPlus className="h-4 w-4" /> Invite
                  </button>
                </div>
                {status ? <p className="mt-4 text-sm text-slate-200">{status}</p> : null}
              </div>

              <div className="mt-8 rounded-[2rem] border border-border bg-[#0f172a] p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-accent" />
                  <p className="text-sm uppercase tracking-[0.3em] text-muted">Members</p>
                </div>
                <div className="mt-4 space-y-3">
                  {members.length === 0 ? (
                    <p className="text-sm text-slate-400">Invite teammates to share this project’s task list.</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="rounded-3xl border border-border bg-[#111827] px-4 py-4 text-sm text-slate-200">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">{member.profiles.username || member.profiles.email}</p>
                            <p className="text-slate-400">{member.profiles.email}</p>
                          </div>
                          <span className="rounded-full border border-border bg-[#0f172a] px-3 py-1 text-xs text-slate-300">{member.role}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[2rem] border border-border bg-[#0f172a] p-8 text-slate-300">
              <p className="text-sm text-slate-400">Select a project from the left panel to view members and invite teammates.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default ProjectsPage;
