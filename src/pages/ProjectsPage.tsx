function ProjectsPage() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Projects</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Project workspace</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {['Law School', 'Marketing Sprint', 'Product Launch'].map((project) => (
          <article key={project} className="rounded-[2rem] border border-border bg-[#111827] p-5 shadow-lg shadow-black/10">
            <p className="text-sm uppercase tracking-[0.3em] text-muted">Project</p>
            <h3 className="mt-3 text-lg font-semibold text-white">{project}</h3>
            <p className="mt-2 text-sm text-slate-300">Organize tasks, assign teammates, and stay on top of deadlines.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ProjectsPage;
