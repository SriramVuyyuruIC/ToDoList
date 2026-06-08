import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  CSS,
} from '@dnd-kit/sortable';
import { Edit3, Plus, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { createTask, deleteTask, getTasks, reorderTasks, Task, updateTask } from '../lib/tasksClient';
import { getProjects, Project } from '../lib/projectsClient';

function TaskItem({ task, onEdit, onDelete, onToggleComplete }: { task: Task; onEdit: (task: Task) => void; onDelete: (id: string) => void; onToggleComplete: (id: string) => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-[1.75rem] border border-border bg-[#111827] p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            className="rounded-full border border-border bg-[#0f172a] p-2 text-slate-200 transition hover:border-accent"
          >
            {task.completed ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5" />}
          </button>
          <div>
            <h3 className={`text-lg font-semibold ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
              {task.title}
            </h3>
            <p className="mt-2 text-sm text-slate-400">Due {task.due}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <button type="button" onClick={() => onEdit(task)} className="rounded-2xl p-2 transition hover:text-white">
            <Edit3 className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onDelete(task.id)} className="rounded-2xl p-2 transition hover:text-white">
            <Trash2 className="h-4 w-4" />
          </button>
          <button type="button" {...attributes} {...listeners} className="rounded-2xl p-2 transition hover:text-white">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-300">{task.description}</p>
    </div>
  );
}

function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDue, setEditDue] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const storedProject = localStorage.getItem('taskflow-selected-project');
    if (storedProject) {
      setSelectedProjectId(storedProject);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    async function loadProjects() {
      setLoadingProjects(true);
      setError(null);

      const { data, error: projectError } = await getProjects(user.id);
      if (projectError) {
        setError(projectError.message || 'Unable to load projects.');
        setProjects([]);
      } else {
        setProjects(data ?? []);
        const isValidSelection = data?.some((project) => project.id === selectedProjectId);
        if (!selectedProjectId || !isValidSelection) {
          setSelectedProjectId(data?.[0]?.id ?? null);
        }
      }

      setLoadingProjects(false);
    }

    loadProjects();
  }, [user, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }

    async function loadTasks() {
      setLoadingTasks(true);
      setError(null);

      const { data, error: taskError } = await getTasks(selectedProjectId);
      if (taskError) {
        setError(taskError.message || 'Unable to load tasks.');
        setTasks([]);
      } else {
        setTasks(data ?? []);
      }

      setLoadingTasks(false);
    }

    loadTasks();
    localStorage.setItem('taskflow-selected-project', selectedProjectId);
  }, [selectedProjectId]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const activeTasks = useMemo(() => tasks.filter((task) => !task.completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed), [tasks]);

  const handleAddTask = async () => {
    if (!title.trim() || !selectedProjectId) return;

    const newTask = {
      title: title.trim(),
      description: description.trim() || 'No description added yet.',
      due: due || 'No due date',
      completed: false,
      position: tasks.length,
      project_id: selectedProjectId,
    };

    const { data, error: insertError } = await createTask(newTask);
    if (insertError || !data?.[0]) {
      setError(insertError?.message || 'Unable to save task.');
      return;
    }

    setTasks((current) => [...current, data[0]]);
    setTitle('');
    setDescription('');
    setDue('');
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditDue(task.due);
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId) return;
    const taskToUpdate = tasks.find((task) => task.id === editingTaskId);
    if (!taskToUpdate) return;

    const updatedTask: Task = {
      ...taskToUpdate,
      title: editTitle.trim() || 'Untitled task',
      description: editDescription.trim() || 'No description added yet.',
      due: editDue || 'No due date',
    };

    const { error: updateError } = await updateTask(updatedTask);
    if (updateError) {
      setError(updateError.message || 'Unable to update task.');
      return;
    }

    setTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditDue('');
  };

  const handleDeleteTask = async (id: string) => {
    const { error: deleteError } = await deleteTask(id);
    if (deleteError) {
      setError(deleteError.message || 'Unable to delete task.');
      return;
    }
    setTasks((current) => current.filter((task) => task.id !== id));
  };

  const handleToggleComplete = async (id: string) => {
    const taskToToggle = tasks.find((task) => task.id === id);
    if (!taskToToggle) return;

    const updatedTask = { ...taskToToggle, completed: !taskToToggle.completed };
    const { error: updateError } = await updateTask(updatedTask);
    if (updateError) {
      setError(updateError.message || 'Unable to update task.');
      return;
    }
    setTasks((current) => current.map((task) => (task.id === id ? updatedTask : task)));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setTasks((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const moved = arrayMove(items, oldIndex, newIndex).map((task, index) => ({ ...task, position: index }));
      reorderTasks(moved).catch((error) => {
        setError(error?.message || 'Unable to reorder tasks.');
      });
      return moved;
    });
  };

  return (
    <section>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Dashboard</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Project task board</h2>
          <p className="mt-2 text-sm text-slate-400">Select a project to manage the shared task list with your team.</p>
        </div>
        <div>
          <span className="rounded-full border border-border bg-[#0f172a] px-4 py-2 text-sm text-slate-300">
            {selectedProject ? selectedProject.name : 'No project selected'}
          </span>
        </div>
      </div>

      {error ? <p className="mb-6 rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}

      {!selectedProject ? (
        <div className="rounded-[2rem] border border-border bg-[#111827] p-10 text-slate-300 shadow-lg shadow-black/10">
          <p className="text-lg font-semibold text-white">No project selected yet</p>
          <p className="mt-4 text-sm text-slate-400">Create a project and invite teammates on the Projects page. Then select it here to view the shared task list.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
            <h3 className="text-xl font-semibold text-white">Add a new task</h3>
            <div className="mt-6 space-y-4">
              <label className="block text-sm text-slate-400">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Task title"
                  className="mt-2 w-full rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-slate-400">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Task description"
                  className="mt-2 min-h-[120px] w-full rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-slate-400">
                Due date
                <input
                  type="date"
                  value={due}
                  onChange={(event) => setDue(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <button
                type="button"
                onClick={handleAddTask}
                className="inline-flex items-center gap-2 rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90"
              >
                <Plus className="h-4 w-4" /> Add task
              </button>
            </div>
          </article>

          <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted">Task list</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{selectedProject.name}</h3>
              </div>
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="rounded-3xl border border-border bg-[#0f172a] px-4 py-3 text-slate-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {loadingTasks ? (
              <div className="mt-8 rounded-[2rem] border border-border bg-[#0f172a] p-8 text-slate-300">Loading tasks...</div>
            ) : (
              <div className="mt-6 space-y-4">
                {editingTaskId ? (
                  <div className="rounded-[2rem] border border-accent/40 bg-[#0f172a] p-5">
                    <p className="text-sm text-accent">Editing task</p>
                    <label className="mt-4 block text-sm text-slate-400">
                      Title
                      <input
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        className="mt-2 w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <label className="mt-4 block text-sm text-slate-400">
                      Description
                      <textarea
                        value={editDescription}
                        onChange={(event) => setEditDescription(event.target.value)}
                        className="mt-2 w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <label className="mt-4 block text-sm text-slate-400">
                      Due date
                      <input
                        type="date"
                        value={editDue}
                        onChange={(event) => setEditDue(event.target.value)}
                        className="mt-2 w-full rounded-3xl border border-border bg-[#111827] px-4 py-3 text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                      />
                    </label>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="rounded-3xl bg-accent px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-accent/90"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="rounded-3xl border border-border px-5 py-3 text-sm text-slate-200 transition hover:border-accent"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-border bg-[#0f172a] p-5">
                <p className="text-sm text-slate-400">Active</p>
                <p className="mt-3 text-3xl font-semibold text-white">{activeTasks.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-border bg-[#0f172a] p-5">
                <p className="text-sm text-slate-400">Completed</p>
                <p className="mt-3 text-3xl font-semibold text-white">{completedTasks.length}</p>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default DashboardPage;
