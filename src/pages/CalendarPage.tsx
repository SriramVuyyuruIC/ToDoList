import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { getProjects, Project } from '../lib/projectsClient';
import { getTasksForProjects, Task } from '../lib/tasksClient';
import { priorityStyles, priorityLabel } from '../lib/taskflowTypes';

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(date.getDate() - date.getDay());
  return next;
}

function CalendarPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;

    async function loadCalendar() {
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

    loadCalendar();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks
      .filter((task) => task.due_date)
      .forEach((task) => {
        const date = task.due_date as string;
        map.set(date, [...(map.get(date) ?? []), task]);
      });
    return map;
  }, [tasks]);

  const today = new Date();
  const monthDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const firstDayOffset = monthDate.getDay();
  const monthCells = Array.from({ length: firstDayOffset + daysInMonth }, (_, index) => {
    if (index < firstDayOffset) return null;
    return new Date(monthDate.getFullYear(), monthDate.getMonth(), index - firstDayOffset + 1);
  });

  const weekStart = startOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * 7));
  const weekCells = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  const visibleLabel =
    view === 'month'
      ? monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : `${weekCells[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekCells[6].toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}`;

  const renderTaskChip = (task: Task) => (
    <div key={task.id} className="rounded-md border border-border bg-[#111827] p-2">
      <p className="truncate text-xs font-semibold text-white">{task.title}</p>
      <div className="mt-1 flex flex-wrap gap-1 text-[0.68rem] text-slate-400">
        <span className={`rounded border px-1.5 py-0.5 ${priorityStyles[task.priority]}`}>{priorityLabel(task.priority)}</span>
        <span className="rounded border border-border bg-[#0b101d] px-1.5 py-0.5">{projectNames.get(task.project_id) ?? 'Project'}</span>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="border border-border bg-surface p-4 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">Calendar</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Due date overview</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="grid grid-cols-2 rounded-lg border border-border bg-[#0b101d] p-1">
              <button
                type="button"
                onClick={() => {
                  setView('month');
                  setOffset(0);
                }}
                className={`rounded-md px-3 py-2 text-sm transition ${view === 'month' ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('week');
                  setOffset(0);
                }}
                className={`rounded-md px-3 py-2 text-sm transition ${view === 'week' ? 'bg-red-500/10 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Week
              </button>
            </div>
            <div className="flex items-center rounded-lg border border-border bg-[#0b101d]">
              <button type="button" onClick={() => setOffset((current) => current - 1)} className="rounded-l-lg p-2.5 text-slate-300 transition hover:bg-[#111827] hover:text-white" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[190px] px-3 text-center text-sm text-slate-200">{visibleLabel}</span>
              <button type="button" onClick={() => setOffset((current) => current + 1)} className="rounded-r-lg p-2.5 text-slate-300 transition hover:bg-[#111827] hover:text-white" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      <div className="rounded-lg border border-border bg-surface p-4 shadow-lg shadow-black/10">
        {loading ? (
          <p className="rounded-lg border border-border bg-[#0b101d] p-8 text-sm text-slate-300">Loading calendar...</p>
        ) : view === 'month' ? (
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {day}
              </div>
            ))}
            {monthCells.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="min-h-[130px] rounded-lg border border-transparent" />;
              }
              const dateKey = toDateKey(date);
              const dayTasks = tasksByDate.get(dateKey) ?? [];
              const isToday = dateKey === toDateKey(new Date());

              return (
                <div key={dateKey} className={`min-h-[130px] rounded-lg border p-2 ${isToday ? 'border-accent bg-red-500/5' : 'border-border bg-[#0b101d]'}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{date.getDate()}</span>
                    {dayTasks.length > 0 ? <span className="rounded-md border border-border bg-[#111827] px-1.5 py-0.5 text-[0.68rem] text-slate-300">{dayTasks.length}</span> : null}
                  </div>
                  <div className="space-y-2">{dayTasks.slice(0, 3).map(renderTaskChip)}</div>
                  {dayTasks.length > 3 ? <p className="mt-2 text-xs text-slate-500">+{dayTasks.length - 3} more</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-7">
            {weekCells.map((date) => {
              const dateKey = toDateKey(date);
              const dayTasks = tasksByDate.get(dateKey) ?? [];
              const isToday = dateKey === toDateKey(new Date());

              return (
                <section key={dateKey} className={`min-h-[420px] rounded-lg border p-3 ${isToday ? 'border-accent bg-red-500/5' : 'border-border bg-[#0b101d]'}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{date.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{date.getDate()}</p>
                    </div>
                    <CalendarDays className="h-4 w-4 text-accent" />
                  </div>
                  <div className="space-y-2">
                    {dayTasks.length === 0 ? <p className="text-sm text-slate-500">No due tasks.</p> : dayTasks.map(renderTaskChip)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default CalendarPage;
