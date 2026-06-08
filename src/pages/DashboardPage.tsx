function DashboardPage() {
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted">Dashboard</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Welcome to TaskFlow</h2>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
          <h3 className="text-xl font-semibold text-white">Tasks Due Today</h3>
          <p className="mt-3 text-sm text-muted">See your most urgent tasks and upcoming deadlines.</p>
        </article>
        <article className="rounded-[2rem] border border-border bg-[#111827] p-6 shadow-lg shadow-black/10">
          <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
          <p className="mt-3 text-sm text-muted">Track the latest project updates, comments, and task changes.</p>
        </article>
      </div>
    </section>
  );
}

export default DashboardPage;
